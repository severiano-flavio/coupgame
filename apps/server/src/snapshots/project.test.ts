import { describe, expect, it } from 'vitest';
import { makeState } from '../engine/testkit.js';
import { toPrivateState, toPublicState } from './project.js';

describe('snapshots — privacidade', () => {
  const base = () =>
    makeState(
      [
        { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
        { id: 'b', cards: ['ASSASSIN', 'CONTESSA'], lostCards: [] },
        { id: 'c', cards: ['AMBASSADOR'], lostCards: ['DUKE'] },
      ],
      { deck: ['DUKE', 'CAPTAIN', 'CONTESSA', 'ASSASSIN'] },
    );

  it('PublicState não expõe cartas ocultas de ninguém', () => {
    const pub = toPublicState(base());
    const serialized = JSON.stringify(pub);
    // Jogador c tem AMBASSADOR oculto e DUKE perdido; a tem DUKE/CAPTAIN ocultos.
    // O público só pode conter cartas REVELADAS (c: DUKE perdido).
    const playerC = pub.players.find((p) => p.id === 'c')!;
    expect(playerC.revealed).toEqual(['DUKE']);
    expect(playerC.influenceCount).toBe(1);
    // Nenhuma carta ativa de a ou b aparece como string isolada de personagem
    // fora de "revealed". Verificamos que não há campo "hand"/"cards".
    expect(serialized).not.toContain('"cards"');
    expect(serialized).not.toContain('"hand"');
  });

  it('PublicState expõe apenas a contagem do baralho, não a ordem', () => {
    const pub = toPublicState(base());
    expect(pub.deckCount).toBe(4);
    expect(JSON.stringify(pub)).not.toContain('cardId');
  });

  it('PrivateState revela apenas a própria mão', () => {
    const s = base();
    const privA = toPrivateState(s, 'a');
    expect(privA.hand.map((c) => c.character).sort()).toEqual(['CAPTAIN', 'DUKE']);
    // não há nada de b ou c
    expect(privA.playerId).toBe('a');
  });

  it('exchangeOffer só aparece ao dono durante a própria troca', () => {
    const s = base();
    s.phase = 'EXCHANGE_SELECTION';
    s.pending = {
      action: { action: 'EXCHANGE', by: 'a' },
      reactionOwners: [],
      losses: [],
      exchangeDraw: [
        { cardId: 'd1', character: 'DUKE', lost: false },
        { cardId: 'd2', character: 'CONTESSA', lost: false },
      ],
    };
    const privA = toPrivateState(s, 'a');
    expect(privA.exchangeOffer).toHaveLength(2);
    // outro jogador não vê a oferta
    const privB = toPrivateState(s, 'b');
    expect(privB.exchangeOffer).toBeNull();
  });

  it('awaitingReactionFrom reflete a janela ativa', () => {
    const s = base();
    s.phase = 'ACTION_CHALLENGE';
    s.pending = {
      action: { action: 'TAX', by: 'a' },
      reactionOwners: ['b', 'c'],
      losses: [],
    };
    const pub = toPublicState(s);
    expect(pub.awaitingReactionFrom).toEqual(['b', 'c']);
  });
});
