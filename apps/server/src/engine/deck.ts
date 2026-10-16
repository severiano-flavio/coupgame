import { CHARACTERS, COPIES_PER_CHARACTER } from '@coup/shared';
import type { Rng } from './rng.js';
import type { InternalCard } from './state/types.js';

/**
 * Baralho da corte. 3 cópias de cada um dos 5 personagens = 15 cartas.
 * Ver docs/game-rules.md §1.
 */

/** Cria o baralho completo com cardIds estáveis e únicos. */
export function createDeck(): InternalCard[] {
  const deck: InternalCard[] = [];
  for (const character of CHARACTERS) {
    for (let copy = 0; copy < COPIES_PER_CHARACTER; copy++) {
      deck.push({ cardId: `${character}_${copy}`, character, lost: false });
    }
  }
  return deck;
}

/**
 * Embaralhamento Fisher-Yates imutável usando o RNG injetado.
 * Retorna um novo array; não muta a entrada.
 */
export function shuffle(cards: readonly InternalCard[], rng: Rng): InternalCard[] {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * Compra a carta do topo (índice 0). Retorna a carta e o baralho restante.
 * Lança se o baralho estiver vazio (caso-limite A2; o chamador garante que não
 * ocorre no fluxo normal — ver game-rules.md §9).
 */
export function draw(deck: readonly InternalCard[]): { card: InternalCard; deck: InternalCard[] } {
  const card = deck[0];
  if (!card) {
    throw new Error('draw: baralho vazio');
  }
  return { card, deck: deck.slice(1) };
}

/**
 * Devolve cartas ao baralho e reembaralha. Marca as cartas devolvidas como não
 * perdidas (voltam disponíveis). Cartas perdidas NUNCA passam por aqui.
 */
export function returnAndShuffle(
  deck: readonly InternalCard[],
  returned: readonly InternalCard[],
  rng: Rng,
): InternalCard[] {
  const restored = returned.map((c) => ({ ...c, lost: false }));
  return shuffle([...deck, ...restored], rng);
}
