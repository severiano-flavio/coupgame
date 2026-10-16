import { MANDATORY_COUP_THRESHOLD, type Phase } from '@coup/shared';
import { applyCommand, type EngineCtx } from './reducer.js';
import { type EngineResult, ok } from './result.js';
import type { InternalState } from './state/types.js';
import { activeCards, currentPlayer, getPlayer, liveOpponents } from './state/queries.js';

/**
 * Políticas de expiração de prazo (adaptações digitais D1–D3).
 * Ver docs/game-rules.md §8.2. Reutiliza o pipeline do reducer para manter um
 * caminho único de resolução (ADR-5).
 */
export function applyTimeout(state: InternalState, phase: Phase, ctx: EngineCtx): EngineResult {
  switch (phase) {
    case 'WAITING_ACTION':
      return timeoutWaitingAction(state, ctx);
    case 'ACTION_CHALLENGE':
    case 'BLOCK_WINDOW':
    case 'BLOCK_CHALLENGE':
      return timeoutReactionWindow(state, ctx);
    case 'INFLUENCE_SELECTION':
      return timeoutInfluenceSelection(state, ctx);
    case 'EXCHANGE_SELECTION':
      return timeoutExchange(state, ctx);
    default:
      return ok(state, []);
  }
}

/** D3: ação não declarada → Renda, ou Golpe forçado se >=10 moedas. */
function timeoutWaitingAction(state: InternalState, ctx: EngineCtx): EngineResult {
  const cur = currentPlayer(state);
  if (!cur) return ok(state, []);

  if (cur.coins >= MANDATORY_COUP_THRESHOLD) {
    // Golpe contra o próximo adversário vivo (determinístico).
    const target = liveOpponents(state, cur.id)[0];
    if (target) {
      return applyCommand(state, cur.id, { type: 'DECLARE_ACTION', action: 'COUP', targetId: target.id }, ctx);
    }
  }
  return applyCommand(state, cur.id, { type: 'DECLARE_ACTION', action: 'INCOME' }, ctx);
}

/** Reação não enviada = PASS por todos os pendentes (first valid wins já tratado). */
function timeoutReactionWindow(state: InternalState, ctx: EngineCtx): EngineResult {
  let current: EngineResult = ok(state, []);
  const owners = state.pending?.reactionOwners.slice() ?? [];
  for (const id of owners) {
    if (!current.ok) return current;
    // Após cada PASS, a fase pode mudar; só aplica se ainda for janela de reação.
    const s = current.state;
    if (s.phase !== 'ACTION_CHALLENGE' && s.phase !== 'BLOCK_WINDOW' && s.phase !== 'BLOCK_CHALLENGE') {
      break;
    }
    if (!s.pending?.reactionOwners.includes(id)) continue;
    current = applyCommand(s, id, { type: 'PASS' }, ctx);
  }
  return current;
}

/** D1: perda não escolhida → perde a carta ativa de maior índice (determinístico). */
function timeoutInfluenceSelection(state: InternalState, ctx: EngineCtx): EngineResult {
  const pending = state.pending;
  if (!pending || pending.losses.length === 0) return ok(state, []);
  const loss = pending.losses[0]!;
  const player = getPlayer(state, loss.playerId);
  if (!player) return ok(state, []);
  const active = activeCards(player);
  if (active.length === 0) return ok(state, []);
  const card = active[active.length - 1]!;
  return applyCommand(state, loss.playerId, { type: 'SELECT_INFLUENCE', cardId: card.cardId }, ctx);
}

/** D2: troca não concluída → preserva as cartas originais ativas (devolve as sacadas). */
function timeoutExchange(state: InternalState, ctx: EngineCtx): EngineResult {
  const pending = state.pending;
  const action = pending?.action;
  if (!pending || !action || !pending.exchangeDraw) return ok(state, []);
  const player = getPlayer(state, action.by);
  if (!player) return ok(state, []);
  const originalActiveIds = activeCards(player).map((c) => c.cardId);
  return applyCommand(state, action.by, { type: 'SELECT_EXCHANGE', cardIds: originalActiveIds }, ctx);
}
