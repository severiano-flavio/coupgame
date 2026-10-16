import type { CharacterType } from '@coup/shared';
import type { Rng } from '../rng.js';
import { returnAndShuffle } from '../deck.js';
import type { InternalPlayer, InternalState } from './types.js';
import { activeCards } from './queries.js';

/**
 * Helpers de mutação com cópia rasa controlada. A engine clona o estado antes
 * de aplicar efeitos, mantendo a função pura em relação à entrada.
 */

export function cloneState(state: InternalState): InternalState {
  const players: Record<string, InternalPlayer> = {};
  for (const [id, p] of Object.entries(state.players)) {
    players[id] = { ...p, cards: p.cards.map((c) => ({ ...c })) };
  }
  return {
    ...state,
    players,
    order: state.order.slice(),
    deck: state.deck.map((c) => ({ ...c })),
    pending: state.pending
      ? {
          ...state.pending,
          reactionOwners: state.pending.reactionOwners.slice(),
          losses: state.pending.losses.slice(),
          exchangeDraw: state.pending.exchangeDraw?.map((c) => ({ ...c })),
        }
      : undefined,
    log: state.log.slice(),
  };
}

export function addCoins(state: InternalState, playerId: string, delta: number): void {
  const p = state.players[playerId];
  if (p) p.coins = Math.max(0, p.coins + delta);
}

/**
 * Marca uma carta específica como perdida (influência revelada). Se o jogador
 * ficar sem influências ativas, é eliminado. Cartas perdidas não voltam ao
 * baralho (game-rules.md §4).
 */
export function loseCard(state: InternalState, playerId: string, cardId: string): boolean {
  const p = state.players[playerId];
  if (!p) return false;
  const card = p.cards.find((c) => c.cardId === cardId && !c.lost);
  if (!card) return false;
  card.lost = true;
  if (activeCards(p).length === 0) {
    p.eliminated = true;
  }
  return true;
}

/**
 * Substitui uma carta ativa do jogador: devolve-a ao baralho, embaralha e
 * compra uma nova (usado quando um desafio ao jogador falha — ele tinha a
 * carta). game-rules.md §4.
 */
export function replaceCard(
  state: InternalState,
  playerId: string,
  character: CharacterType,
  rng: Rng,
): void {
  const p = state.players[playerId];
  if (!p) return;
  const idx = p.cards.findIndex((c) => c.character === character && !c.lost);
  if (idx === -1) return;
  const [returned] = p.cards.splice(idx, 1);
  const deckWithReturned = returnAndShuffle(state.deck, [returned!], rng);
  // Compra uma substituta do topo.
  const replacement = deckWithReturned[0]!;
  state.deck = deckWithReturned.slice(1);
  p.cards.push({ ...replacement });
}

/** Verdade de posse: o jogador possui o personagem numa carta ativa? */
export function hasActiveCharacter(
  state: InternalState,
  playerId: string,
  character: CharacterType,
): boolean {
  const p = state.players[playerId];
  if (!p) return false;
  return p.cards.some((c) => c.character === character && !c.lost);
}

export function pushLog(state: InternalState, now: number, kind: string, text: string): void {
  state.log.push({ t: now, kind, text });
}
