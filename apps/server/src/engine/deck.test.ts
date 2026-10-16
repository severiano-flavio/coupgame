import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '@coup/shared';
import { createDeck, draw, returnAndShuffle, shuffle } from './deck.js';
import { createSeededRng } from './rng.js';

describe('deck', () => {
  it('cria 15 cartas, 3 de cada personagem', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(15);
    for (const ch of CHARACTERS) {
      expect(deck.filter((c) => c.character === ch)).toHaveLength(3);
    }
  });

  it('cardIds são únicos', () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => c.cardId));
    expect(ids.size).toBe(15);
  });

  it('shuffle é determinístico para a mesma seed', () => {
    const a = shuffle(createDeck(), createSeededRng(42)).map((c) => c.cardId);
    const b = shuffle(createDeck(), createSeededRng(42)).map((c) => c.cardId);
    expect(a).toEqual(b);
  });

  it('shuffle preserva a composição', () => {
    const shuffled = shuffle(createDeck(), createSeededRng(7));
    expect(shuffled).toHaveLength(15);
    expect(new Set(shuffled.map((c) => c.cardId)).size).toBe(15);
  });

  it('draw retira do topo e devolve o restante', () => {
    const deck = createDeck();
    const { card, deck: rest } = draw(deck);
    expect(card.cardId).toBe(deck[0]!.cardId);
    expect(rest).toHaveLength(14);
  });

  it('draw lança em baralho vazio', () => {
    expect(() => draw([])).toThrow();
  });

  it('returnAndShuffle reintroduz cartas marcando-as como não perdidas', () => {
    const rng = createSeededRng(3);
    const result = returnAndShuffle([], [{ cardId: 'x', character: 'DUKE', lost: true }], rng);
    expect(result).toHaveLength(1);
    expect(result[0]!.lost).toBe(false);
  });
});
