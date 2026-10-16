import { createDeck, draw, shuffle } from '../deck.js';
import type { Rng } from '../rng.js';
import type { InternalPlayer, InternalState } from './types.js';

export interface SeatAssignment {
  id: string;
  name: string;
}

export const STARTING_COINS = 2;
export const STARTING_INFLUENCES = 2;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

/**
 * Cria uma partida em DEALING→WAITING_ACTION: embaralha, sorteia a ordem,
 * distribui 2 moedas e 2 cartas a cada jogador. Determinístico via `rng`.
 * Ver docs/game-rules.md §1.
 */
export function createMatch(
  matchId: string,
  seats: readonly SeatAssignment[],
  rng: Rng,
): InternalState {
  if (seats.length < MIN_PLAYERS || seats.length > MAX_PLAYERS) {
    throw new Error(`createMatch: número de jogadores inválido (${seats.length})`);
  }

  // Ordem inicial sorteada; o sentido horário segue a ordem resultante.
  const order = derivePlayerOrder(seats, rng);

  let deck = shuffle(createDeck(), rng);
  const players: Record<string, InternalPlayer> = {};

  order.forEach((id, seatIndex) => {
    const seat = seats.find((s) => s.id === id)!;
    const dealt = [];
    for (let i = 0; i < STARTING_INFLUENCES; i++) {
      const res = draw(deck);
      deck = res.deck;
      dealt.push(res.card);
    }
    players[id] = {
      id,
      name: seat.name,
      seat: seatIndex,
      coins: STARTING_COINS,
      cards: dealt,
      connected: true,
      eliminated: false,
    };
  });

  return {
    matchId,
    stateVersion: 0,
    phase: 'WAITING_ACTION',
    order,
    turnIndex: 0,
    players,
    deck,
    log: [{ t: 0, kind: 'DEAL', text: 'Partida iniciada; cartas distribuídas.' }],
  };
}

/** Deriva a ordem horária sorteada dos jogadores. */
function derivePlayerOrder(seats: readonly SeatAssignment[], rng: Rng): string[] {
  const ids = seats.map((s) => s.id);
  // Fisher-Yates direto sobre os ids.
  const out = ids.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}
