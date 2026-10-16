import { describe, expect, it } from 'vitest';
import { createMatch } from './state/setup.js';
import { createSeededRng } from './rng.js';

const seats = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

describe('createMatch', () => {
  it('distribui 2 moedas e 2 cartas a cada jogador', () => {
    const s = createMatch('m1', seats, createSeededRng(1));
    for (const id of ['a', 'b', 'c']) {
      expect(s.players[id]!.coins).toBe(2);
      expect(s.players[id]!.cards).toHaveLength(2);
    }
  });

  it('consome 6 cartas do baralho (15 - 6 = 9 restantes)', () => {
    const s = createMatch('m1', seats, createSeededRng(1));
    expect(s.deck).toHaveLength(9);
  });

  it('inicia em WAITING_ACTION com turno 0', () => {
    const s = createMatch('m1', seats, createSeededRng(1));
    expect(s.phase).toBe('WAITING_ACTION');
    expect(s.turnIndex).toBe(0);
    expect(s.order).toHaveLength(3);
  });

  it('ordem é determinística por seed', () => {
    const a = createMatch('m1', seats, createSeededRng(99)).order;
    const b = createMatch('m1', seats, createSeededRng(99)).order;
    expect(a).toEqual(b);
  });

  it('rejeita menos de 3 ou mais de 6 jogadores', () => {
    expect(() => createMatch('m', [{ id: 'a', name: 'A' }], createSeededRng(1))).toThrow();
    const seven = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    expect(() => createMatch('m', seven, createSeededRng(1))).toThrow();
  });
});
