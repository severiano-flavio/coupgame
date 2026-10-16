import {
  ACTION_COST,
  MANDATORY_COUP_THRESHOLD,
  type ActionType,
  type CharacterType,
  type GameCommand,
} from '@coup/shared';
import type { Rng } from './rng.js';
import { returnAndShuffle } from './deck.js';
import { ACTION_META } from './actions/metadata.js';
import { type EngineResult, ok, reject } from './result.js';
import {
  actionLabel,
  advanceTurn,
  applyActionEffect,
  characterLabel,
  name,
  prepareExchange,
  type ResolveCtx,
} from './resolve.js';
import type { InternalState, PendingContext } from './state/types.js';
import {
  activeCards,
  currentPlayer,
  getPlayer,
  influenceCount,
  liveOpponents,
} from './state/queries.js';
import {
  addCoins,
  cloneState,
  hasActiveCharacter,
  loseCard,
  pushLog,
  replaceCard,
} from './state/mutate.js';

export interface EngineCtx {
  rng: Rng;
  now: number;
}

/**
 * Função central da engine (pura e determinística). Recebe o estado atual, o
 * autor do comando e a intenção; retorna um novo estado + eventos, ou uma
 * rejeição tipada. Nunca muta a entrada. Ver docs/architecture.md §4.
 */
export function applyCommand(
  prev: InternalState,
  actorId: string,
  cmd: GameCommand,
  ctx: EngineCtx,
): EngineResult {
  const state = cloneState(prev);
  const resolveCtx: ResolveCtx = { rng: ctx.rng, now: ctx.now };
  const logStart = state.log.length;

  const result = dispatch(state, actorId, cmd, resolveCtx);
  if (!result.ok) return result;

  // Normaliza versão e extrai eventos novos gerados nesta aplicação.
  result.state.stateVersion = prev.stateVersion + 1;
  const events = result.state.log.slice(logStart);
  return ok(result.state, events);
}

function dispatch(
  state: InternalState,
  actorId: string,
  cmd: GameCommand,
  ctx: ResolveCtx,
): EngineResult {
  switch (cmd.type) {
    case 'DECLARE_ACTION':
      return handleDeclareAction(state, actorId, cmd.action, cmd.targetId, ctx);
    case 'CHALLENGE':
      return handleChallenge(state, actorId, ctx);
    case 'BLOCK':
      return handleBlock(state, actorId, cmd.character, ctx);
    case 'PASS':
      return handlePass(state, actorId, ctx);
    case 'SELECT_INFLUENCE':
      return handleSelectInfluence(state, actorId, cmd.cardId, ctx);
    case 'SELECT_EXCHANGE':
      return handleSelectExchange(state, actorId, cmd.cardIds, ctx);
  }
}

/* ----------------------------- DECLARE_ACTION ----------------------------- */

function handleDeclareAction(
  state: InternalState,
  actorId: string,
  action: ActionType,
  targetId: string | undefined,
  ctx: ResolveCtx,
): EngineResult {
  if (state.phase !== 'WAITING_ACTION') return reject('INVALID_PHASE');

  const cur = currentPlayer(state);
  if (!cur || cur.id !== actorId) return reject('NOT_YOUR_TURN');

  const meta = ACTION_META[action];

  // Obrigação de Golpe com >=10 moedas.
  if (cur.coins >= MANDATORY_COUP_THRESHOLD && action !== 'COUP') {
    return reject('MUST_COUP', 'Com 10 ou mais moedas é obrigatório dar um Golpe.');
  }

  // Validação de alvo.
  if (meta.targeted) {
    if (!targetId) return reject('INVALID_TARGET', 'Esta ação exige um alvo.');
    const target = getPlayer(state, targetId);
    if (!target || target.eliminated || target.id === actorId) {
      return reject('INVALID_TARGET');
    }
  } else if (targetId) {
    return reject('INVALID_TARGET', 'Esta ação não aceita alvo.');
  }

  // Custo.
  const cost = ACTION_COST[action];
  if (cur.coins < cost) return reject('INSUFFICIENT_COINS');

  // Debita o custo imediatamente (Golpe e Assassinato pagam na declaração).
  if (cost > 0) addCoins(state, actorId, -cost);

  const pending: PendingContext = {
    action: { action, by: actorId, target: targetId },
    reactionOwners: [],
    losses: [],
    resumeAfterLosses: null,
  };
  state.pending = pending;

  pushLog(
    state,
    ctx.now,
    'DECLARE',
    `${name(state, actorId)} declarou ${actionLabel(action)}${
      targetId ? ` em ${name(state, targetId)}` : ''
    }.`,
  );

  // Golpe: sem contestação/bloqueio, vai direto à perda de influência.
  if (action === 'COUP') {
    pending.losses.push({ playerId: targetId!, reason: 'COUP' });
    return enterLossOrResolve(state, ctx);
  }

  // Renda: imediata.
  if (action === 'INCOME') {
    applyActionEffect(state, ctx);
    advanceTurn(state, ctx);
    return ok(state, []);
  }

  // Ação com alegação de personagem → janela de contestação.
  if (meta.claims) {
    state.phase = 'ACTION_CHALLENGE';
    pending.reactionOwners = liveOpponents(state, actorId).map((p) => p.id);
    return ok(state, []);
  }

  // Ação sem alegação, mas bloqueável (Ajuda externa) → janela de bloqueio.
  if (meta.blockableBy.length > 0) {
    return openBlockWindow(state, ctx);
  }

  // Caso sem janelas: resolve direto (não ocorre no conjunto atual, defensivo).
  applyActionEffect(state, ctx);
  advanceTurn(state, ctx);
  return ok(state, []);
}

/* -------------------------------- CHALLENGE ------------------------------- */

function handleChallenge(state: InternalState, actorId: string, ctx: ResolveCtx): EngineResult {
  if (state.phase === 'ACTION_CHALLENGE') {
    return resolveActionChallenge(state, actorId, ctx);
  }
  if (state.phase === 'BLOCK_CHALLENGE') {
    return resolveBlockChallenge(state, actorId, ctx);
  }
  return reject('INVALID_PHASE');
}

/** Contestação da AÇÃO (o declarante alegou um personagem). */
function resolveActionChallenge(
  state: InternalState,
  challengerId: string,
  ctx: ResolveCtx,
): EngineResult {
  const pending = state.pending;
  const action = pending?.action;
  if (!pending || !action) return reject('INVALID_PHASE');
  if (!pending.reactionOwners.includes(challengerId)) return reject('WINDOW_CLOSED');

  const claimed = ACTION_META[action.action].claims;
  if (!claimed) return reject('NOT_AUTHORIZED');

  const declarer = action.by;
  pushLog(
    state,
    ctx.now,
    'CHALLENGE',
    `${name(state, challengerId)} contestou ${name(state, declarer)} (${characterLabel(claimed)}).`,
  );

  if (hasActiveCharacter(state, declarer, claimed)) {
    // Declarante tinha a carta: contestante perde influência; carta substituída.
    replaceCard(state, declarer, claimed, ctx.rng);
    pushLog(state, ctx.now, 'REVEAL', `${name(state, declarer)} tinha ${characterLabel(claimed)}; troca a carta.`);
    pending.losses.push({ playerId: challengerId, reason: 'CHALLENGE' });
    // Após a perda do contestante, a ação prossegue: se ainda for bloqueável,
    // abre a janela de bloqueio; senão aplica o efeito.
    const meta = ACTION_META[action.action];
    pending.resumeAfterLosses = meta.blockableBy.length > 0 ? 'OPEN_BLOCK_WINDOW' : 'RESOLVE_ACTION';
    return enterLossOrResolve(state, ctx);
  }

  // Declarante blefou: perde influência e a ação falha.
  pushLog(state, ctx.now, 'BLUFF', `${name(state, declarer)} não tinha ${characterLabel(claimed)}; ação falha.`);
  pending.losses.push({ playerId: declarer, reason: 'CHALLENGE' });
  pending.resumeAfterLosses = 'END_TURN'; // ação não se aplica
  return enterLossOrResolve(state, ctx);
}

/** Contestação do BLOQUEIO. */
function resolveBlockChallenge(
  state: InternalState,
  challengerId: string,
  ctx: ResolveCtx,
): EngineResult {
  const pending = state.pending;
  const block = pending?.block;
  if (!pending || !block) return reject('INVALID_PHASE');
  if (!pending.reactionOwners.includes(challengerId)) return reject('WINDOW_CLOSED');

  pushLog(
    state,
    ctx.now,
    'CHALLENGE',
    `${name(state, challengerId)} contestou o bloqueio de ${name(state, block.by)} (${characterLabel(block.character)}).`,
  );

  if (hasActiveCharacter(state, block.by, block.character)) {
    // Bloqueador tinha a carta: contestante perde influência; ação IMPEDIDA.
    replaceCard(state, block.by, block.character, ctx.rng);
    pushLog(state, ctx.now, 'REVEAL', `${name(state, block.by)} tinha ${characterLabel(block.character)}; bloqueio confirmado.`);
    pending.losses.push({ playerId: challengerId, reason: 'CHALLENGE' });
    pending.resumeAfterLosses = 'END_TURN';
    return enterLossOrResolve(state, ctx);
  }

  // Bloqueador blefou: perde influência e a ação ORIGINAL prossegue direto ao
  // efeito final (o bloqueio foi derrotado; não há nova janela de bloqueio).
  pushLog(state, ctx.now, 'BLUFF', `${name(state, block.by)} não tinha ${characterLabel(block.character)}; ação original prossegue.`);
  pending.losses.push({ playerId: block.by, reason: 'CHALLENGE' });
  pending.block = undefined;
  pending.resumeAfterLosses = 'RESOLVE_ACTION';
  return enterLossOrResolve(state, ctx);
}

/* ---------------------------------- BLOCK --------------------------------- */

function handleBlock(
  state: InternalState,
  actorId: string,
  character: CharacterType,
  ctx: ResolveCtx,
): EngineResult {
  if (state.phase !== 'BLOCK_WINDOW') return reject('INVALID_PHASE');
  const pending = state.pending;
  const action = pending?.action;
  if (!pending || !action) return reject('INVALID_PHASE');
  if (!pending.reactionOwners.includes(actorId)) return reject('NOT_AUTHORIZED');

  const meta = ACTION_META[action.action];
  if (!meta.blockableBy.includes(character)) {
    return reject('INVALID_SELECTION', 'Personagem não pode bloquear esta ação.');
  }

  pending.block = { character, by: actorId };
  pushLog(
    state,
    ctx.now,
    'BLOCK',
    `${name(state, actorId)} bloqueou com ${characterLabel(character)}.`,
  );

  // Abre janela de contestação do bloqueio para os demais vivos (exceto o
  // bloqueador). O declarante da ação também pode contestar.
  state.phase = 'BLOCK_CHALLENGE';
  pending.reactionOwners = liveOpponents(state, actorId).map((p) => p.id);
  return ok(state, []);
}

/* ---------------------------------- PASS ---------------------------------- */

function handlePass(state: InternalState, actorId: string, ctx: ResolveCtx): EngineResult {
  const pending = state.pending;
  if (!pending) return reject('INVALID_PHASE');

  if (
    state.phase !== 'ACTION_CHALLENGE' &&
    state.phase !== 'BLOCK_WINDOW' &&
    state.phase !== 'BLOCK_CHALLENGE'
  ) {
    return reject('INVALID_PHASE');
  }
  if (!pending.reactionOwners.includes(actorId)) return reject('WINDOW_CLOSED');

  // Remove o jogador da janela; quando todos passam, a janela fecha.
  pending.reactionOwners = pending.reactionOwners.filter((id) => id !== actorId);
  if (pending.reactionOwners.length > 0) {
    return ok(state, []);
  }

  return closeWindow(state, ctx);
}

/** Fecha a janela atual (todos passaram) e avança o fluxo. */
function closeWindow(state: InternalState, ctx: ResolveCtx): EngineResult {
  const pending = state.pending!;
  const action = pending.action!;
  const meta = ACTION_META[action.action];

  if (state.phase === 'ACTION_CHALLENGE') {
    // Ninguém contestou a ação. Se for bloqueável, abre janela de bloqueio.
    if (meta.blockableBy.length > 0) {
      return openBlockWindow(state, ctx);
    }
    return resolveFinalAction(state, ctx);
  }

  if (state.phase === 'BLOCK_WINDOW') {
    // Ninguém bloqueou: a ação se resolve.
    return resolveFinalAction(state, ctx);
  }

  // BLOCK_CHALLENGE: ninguém contestou o bloqueio → ação ORIGINAL impedida.
  pushLog(state, ctx.now, 'BLOCKED', `Ação de ${name(state, action.by)} foi bloqueada.`);
  advanceTurn(state, ctx);
  return ok(state, []);
}

/* ------------------------------- resolução -------------------------------- */

/**
 * Abre a janela de bloqueio. Se ninguém estiver autorizado a bloquear (ex.: o
 * único alvo já foi eliminado), resolve a ação diretamente.
 */
function openBlockWindow(state: InternalState, ctx: ResolveCtx): EngineResult {
  const pending = state.pending!;
  const action = pending.action!;
  const meta = ACTION_META[action.action];
  const owners = blockOwners(state, action.by, action.target, meta.blockOnlyByTarget);
  if (owners.length === 0) {
    return resolveFinalAction(state, ctx);
  }
  state.phase = 'BLOCK_WINDOW';
  pending.reactionOwners = owners;
  return ok(state, []);
}

/**
 * Resolve o efeito final da ação (após janelas sem bloqueio/contestação).
 * Pode gerar perda de influência (Assassinato) ou troca (Embaixador).
 */
function resolveFinalAction(state: InternalState, ctx: ResolveCtx): EngineResult {
  state.phase = 'RESOLVING';
  const pending = state.pending!;
  const action = pending.action!;

  if (action.action === 'ASSASSINATE') {
    const target = action.target ? getPlayer(state, action.target) : undefined;
    if (target && !target.eliminated) {
      pending.losses.push({ playerId: target.id, reason: 'ASSASSINATE' });
    }
    return enterLossOrResolve(state, ctx);
  }

  if (action.action === 'EXCHANGE') {
    prepareExchange(state);
    state.phase = 'EXCHANGE_SELECTION';
    return ok(state, []);
  }

  applyActionEffect(state, ctx);
  advanceTurn(state, ctx);
  return ok(state, []);
}

/**
 * Se há perdas pendentes, entra em INFLUENCE_SELECTION para a próxima.
 * Caso contrário, aplica o que estiver pendente (resumeAfterLosses) ou avança.
 */
function enterLossOrResolve(state: InternalState, ctx: ResolveCtx): EngineResult {
  const pending = state.pending!;

  // Processa perdas automáticas para jogadores com 1 influência (sem escolha),
  // mas apenas quando houver exatamente uma carta ativa — a escolha é trivial.
  while (pending.losses.length > 0) {
    const next = pending.losses[0]!;
    const player = getPlayer(state, next.playerId);
    if (!player || player.eliminated) {
      // Jogador já eliminado: descarta a perda.
      pending.losses.shift();
      continue;
    }
    const active = activeCards(player);
    if (active.length === 1) {
      // Perda trivial: aplica automaticamente a única carta ativa.
      loseCard(state, player.id, active[0]!.cardId);
      pushLog(
        state,
        ctx.now,
        'LOSE',
        `${name(state, player.id)} perdeu influência (${characterLabel(active[0]!.character)}).`,
      );
      pending.losses.shift();
      continue;
    }
    // Precisa de escolha do jogador.
    state.phase = 'INFLUENCE_SELECTION';
    return ok(state, []);
  }

  return afterLossesResolved(state, ctx);
}

/** Executa a continuação após todas as perdas pendentes serem aplicadas. */
function afterLossesResolved(state: InternalState, ctx: ResolveCtx): EngineResult {
  const pending = state.pending!;
  const resume = pending.resumeAfterLosses ?? null;
  pending.resumeAfterLosses = null;

  // Se o jogador da vez foi eliminado durante as perdas, a ação não pode mais
  // ser aplicada; encerra o turno (cobre o caso-limite A1).
  const actorId = pending.action?.by;
  const actorAlive = actorId ? !state.players[actorId]?.eliminated : false;

  if (resume === 'OPEN_BLOCK_WINDOW' && actorAlive) {
    const action = pending.action!;
    const meta = ACTION_META[action.action];
    if (meta.blockableBy.length > 0 && !pending.block) {
      return openBlockWindow(state, ctx);
    }
    return resolveFinalAction(state, ctx);
  }

  if (resume === 'RESOLVE_ACTION' && actorAlive) {
    return resolveFinalAction(state, ctx);
  }

  // END_TURN, ou ator eliminado: ação impedida/sem efeito → avança o turno.
  advanceTurn(state, ctx);
  return ok(state, []);
}

/* -------------------------- SELECT_INFLUENCE ------------------------------ */

function handleSelectInfluence(
  state: InternalState,
  actorId: string,
  cardId: string,
  ctx: ResolveCtx,
): EngineResult {
  if (state.phase !== 'INFLUENCE_SELECTION') return reject('INVALID_PHASE');
  const pending = state.pending;
  if (!pending || pending.losses.length === 0) return reject('INVALID_PHASE');

  const next = pending.losses[0]!;
  if (next.playerId !== actorId) return reject('NOT_AUTHORIZED');

  const player = getPlayer(state, actorId)!;
  const card = player.cards.find((c) => c.cardId === cardId && !c.lost);
  if (!card) return reject('INVALID_SELECTION');

  loseCard(state, actorId, cardId);
  pushLog(
    state,
    ctx.now,
    'LOSE',
    `${name(state, actorId)} perdeu influência (${characterLabel(card.character)}).`,
  );
  pending.losses.shift();

  // Continua processando perdas restantes ou a continuação.
  return enterLossOrResolve(state, ctx);
}

/* --------------------------- SELECT_EXCHANGE ------------------------------ */

function handleSelectExchange(
  state: InternalState,
  actorId: string,
  cardIds: string[],
  ctx: ResolveCtx,
): EngineResult {
  if (state.phase !== 'EXCHANGE_SELECTION') return reject('INVALID_PHASE');
  const pending = state.pending;
  const action = pending?.action;
  if (!pending || !action || !pending.exchangeDraw) return reject('INVALID_PHASE');
  if (action.by !== actorId) return reject('NOT_AUTHORIZED');

  const player = getPlayer(state, actorId)!;
  const keepCount = influenceCount(player);
  if (cardIds.length !== keepCount) {
    return reject('INVALID_SELECTION', `Você deve manter ${keepCount} carta(s).`);
  }

  // Conjunto de cartas disponíveis para escolha: cartas ativas + as 2 sacadas.
  const activePool = activeCards(player);
  const pool = [...activePool, ...pending.exchangeDraw];
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) return reject('INVALID_SELECTION');
  const chosen = cardIds.map((id) => pool.find((c) => c.cardId === id));
  if (chosen.some((c) => !c)) return reject('INVALID_SELECTION');

  const keep = chosen.filter((c): c is NonNullable<typeof c> => !!c);
  const keepIds = new Set(keep.map((c) => c.cardId));

  // Cartas perdidas permanecem com o jogador (reveladas); as ativas não
  // escolhidas e as sacadas não escolhidas voltam ao baralho.
  const lostCards = player.cards.filter((c) => c.lost);
  const returned = pool.filter((c) => !keepIds.has(c.cardId));

  player.cards = [...lostCards, ...keep.map((c) => ({ ...c, lost: false }))];
  // Devolve e reembaralha as cartas não escolhidas.
  state.deck = returnAndShuffle(state.deck, returned, ctx.rng);
  pending.exchangeDraw = undefined;

  pushLog(state, ctx.now, 'EXCHANGE', `${name(state, actorId)} trocou cartas (Embaixador).`);
  advanceTurn(state, ctx);
  return ok(state, []);
}

/* -------------------------------- helpers --------------------------------- */

/** Quem pode bloquear uma ação, respeitando "apenas o alvo". */
function blockOwners(
  state: InternalState,
  actorId: string,
  targetId: string | undefined,
  onlyTarget: boolean,
): string[] {
  if (onlyTarget) {
    return targetId && !getPlayer(state, targetId)?.eliminated ? [targetId] : [];
  }
  return liveOpponents(state, actorId).map((p) => p.id);
}


