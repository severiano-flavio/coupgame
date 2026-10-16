import type { PrivatePlayerState, PublicPlayer, PublicState } from '@coup/shared';
import type { InternalPlayer, InternalState } from '../engine/index.js';
import { queries } from '../engine/index.js';

/**
 * Projeção do estado interno em snapshots. Garante a constituição §5: nenhuma
 * informação oculta (cartas de adversários, ordem do baralho, estado interno de
 * resolução) sai no estado público ou no privado de outro jogador.
 */

function toPublicPlayer(p: InternalPlayer): PublicPlayer {
  return {
    id: p.id,
    name: p.name,
    seat: p.seat,
    coins: p.coins,
    influenceCount: p.cards.filter((c) => !c.lost).length,
    revealed: p.cards.filter((c) => c.lost).map((c) => c.character), // só cartas perdidas
    connected: p.connected,
    eliminated: p.eliminated,
  };
}

export function toPublicState(state: InternalState): PublicState {
  const cur = queries.currentPlayer(state);
  const pending = state.pending;

  const awaitingReactionFrom =
    pending &&
    (state.phase === 'ACTION_CHALLENGE' ||
      state.phase === 'BLOCK_WINDOW' ||
      state.phase === 'BLOCK_CHALLENGE')
      ? pending.reactionOwners.slice()
      : [];

  const awaitingLossFrom =
    pending && state.phase === 'INFLUENCE_SELECTION' && pending.losses[0]
      ? pending.losses[0].playerId
      : null;

  return {
    matchId: state.matchId,
    stateVersion: state.stateVersion,
    phase: state.phase,
    currentPlayerId: cur?.id ?? null,
    pendingAction: pending?.action
      ? {
          action: pending.action.action,
          byPlayerId: pending.action.by,
          targetId: pending.action.target,
        }
      : undefined,
    pendingBlock: pending?.block
      ? { character: pending.block.character, byPlayerId: pending.block.by }
      : undefined,
    awaitingReactionFrom,
    awaitingLossFrom,
    players: state.order
      .map((id) => state.players[id])
      .filter((p): p is InternalPlayer => !!p)
      .map(toPublicPlayer),
    deckCount: state.deck.length, // apenas a CONTAGEM, nunca a ordem
    winnerId: state.winnerId,
    log: state.log.map((e) => ({ t: e.t, kind: e.kind, text: e.text })),
  };
}

/**
 * Estado privado de um jogador específico: apenas suas próprias cartas e, se
 * for a vez dele numa troca, as cartas oferecidas. Nunca cartas de terceiros.
 */
export function toPrivateState(state: InternalState, playerId: string): PrivatePlayerState {
  const p = state.players[playerId];
  const hand = p
    ? p.cards.map((c) => ({ cardId: c.cardId, character: c.character, lost: c.lost }))
    : [];

  // A oferta de troca só é visível ao dono e apenas durante a própria troca.
  const isOwnExchange =
    state.phase === 'EXCHANGE_SELECTION' && state.pending?.action?.by === playerId;
  const exchangeOffer =
    isOwnExchange && state.pending?.exchangeDraw
      ? state.pending.exchangeDraw.map((c) => ({
          cardId: c.cardId,
          character: c.character,
          lost: c.lost,
        }))
      : null;

  return {
    matchId: state.matchId,
    stateVersion: state.stateVersion,
    playerId,
    hand,
    exchangeOffer,
  };
}
