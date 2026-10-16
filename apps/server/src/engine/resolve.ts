import { ACTION_LABELS, CHARACTER_LABELS, type ActionType, type CharacterType } from '@coup/shared';
import { draw } from './deck.js';
import { STEAL_MAX } from './actions/metadata.js';
import type { Rng } from './rng.js';
import type { InternalState } from './state/types.js';
import { addCoins, pushLog } from './state/mutate.js';
import { activeCards, getPlayer, livePlayers, nextTurnIndex } from './state/queries.js';

/**
 * Núcleo de resolução: aplica o efeito final de uma ação (quando ela não foi
 * impedida), trata perdas pendentes e avança o turno. Chamado pelo reducer
 * quando a fase chega a RESOLVING. Ver docs/architecture.md §4.
 */

export interface ResolveCtx {
  rng: Rng;
  now: number;
}

/**
 * Aplica o efeito direto da ação (moedas/troca/perda). Não trata as janelas de
 * contestação/bloqueio — isso é responsabilidade do reducer antes de chegar
 * aqui. Retorna a próxima fase sugerida.
 */
export function applyActionEffect(state: InternalState, ctx: ResolveCtx): void {
  const action = state.pending?.action;
  if (!action) return;

  switch (action.action) {
    case 'INCOME':
      addCoins(state, action.by, 1);
      pushLog(state, ctx.now, 'COINS', `${name(state, action.by)} recebeu 1 moeda (Renda).`);
      break;
    case 'FOREIGN_AID':
      addCoins(state, action.by, 2);
      pushLog(state, ctx.now, 'COINS', `${name(state, action.by)} recebeu 2 moedas (Ajuda externa).`);
      break;
    case 'TAX':
      addCoins(state, action.by, 3);
      pushLog(state, ctx.now, 'COINS', `${name(state, action.by)} recebeu 3 moedas (Impostos).`);
      break;
    case 'STEAL': {
      const victim = action.target ? getPlayer(state, action.target) : undefined;
      if (victim) {
        const amount = Math.min(STEAL_MAX, victim.coins);
        addCoins(state, victim.id, -amount);
        addCoins(state, action.by, amount);
        pushLog(
          state,
          ctx.now,
          'COINS',
          `${name(state, action.by)} roubou ${amount} de ${name(state, victim.id)}.`,
        );
      }
      break;
    }
    case 'COUP':
      // Custo já debitado na declaração; a perda de influência é tratada como
      // PendingLoss pelo reducer. Nada a somar aqui.
      break;
    case 'ASSASSINATE':
      // Idem: custo debitado na declaração; perda tratada como PendingLoss.
      break;
    case 'EXCHANGE':
      // A troca é interativa (EXCHANGE_SELECTION); o saque é preparado pelo
      // reducer. Nada a aplicar aqui diretamente.
      break;
  }
}

/** Prepara o saque de 2 cartas para a troca do Embaixador. */
export function prepareExchange(state: InternalState): void {
  let deck = state.deck;
  const drawn = [];
  for (let i = 0; i < 2; i++) {
    const res = draw(deck);
    deck = res.deck;
    drawn.push(res.card);
  }
  state.deck = deck;
  if (state.pending) state.pending.exchangeDraw = drawn;
}

/**
 * Avança para o próximo turno vivo ou encerra o jogo se restar só um jogador.
 * Limpa o contexto pendente. Deve ser chamado quando a resolução termina.
 */
export function advanceTurn(state: InternalState, ctx: ResolveCtx): void {
  state.pending = undefined;

  const live = livePlayers(state);
  if (live.length <= 1) {
    state.phase = 'GAME_OVER';
    state.winnerId = live[0]?.id;
    if (state.winnerId) {
      pushLog(state, ctx.now, 'GAME_OVER', `${name(state, state.winnerId)} venceu a partida.`);
    }
    return;
  }

  state.turnIndex = nextTurnIndex(state);
  state.phase = 'WAITING_ACTION';
}

/** Rótulo legível de uma ação (pt-BR). */
export function actionLabel(action: ActionType): string {
  return ACTION_LABELS[action];
}

export function characterLabel(c: CharacterType): string {
  return CHARACTER_LABELS[c];
}

export function name(state: InternalState, playerId: string): string {
  return state.players[playerId]?.name ?? playerId;
}

/** Verifica se um jogador tem alguma influência ativa (não eliminado). */
export function isAlive(state: InternalState, playerId: string): boolean {
  const p = getPlayer(state, playerId);
  return !!p && activeCards(p).length > 0;
}
