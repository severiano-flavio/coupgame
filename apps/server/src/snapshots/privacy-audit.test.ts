import { describe, expect, it } from 'vitest';
import type { CharacterType } from '@coup/shared';
import { applyCommand } from '../engine/reducer.js';
import { makeState, testCtx } from '../engine/testkit.js';
import type { InternalState } from '../engine/state/types.js';
import { toPrivateState, toPublicState } from './project.js';

/**
 * Auditoria de privacidade reforçada: em cada fase relevante, o estado privado
 * de um jogador NÃO pode conter cartas ocultas de terceiros, e o público não
 * pode conter cartas ativas de ninguém (constituição §5, requirements §3).
 */

/** Coleta os cardIds das cartas ATIVAS de todos os jogadores menos `exceptId`. */
function othersHiddenCardIds(state: InternalState, exceptId: string): string[] {
  const ids: string[] = [];
  for (const p of Object.values(state.players)) {
    if (p.id === exceptId) continue;
    for (const c of p.cards) if (!c.lost) ids.push(c.cardId);
  }
  return ids;
}

function assertPrivateDoesNotLeakOthers(state: InternalState, viewerId: string): void {
  const priv = JSON.stringify(toPrivateState(state, viewerId));
  for (const hiddenId of othersHiddenCardIds(state, viewerId)) {
    expect(priv).not.toContain(hiddenId);
  }
}

function assertPublicHasNoActiveCards(state: InternalState): void {
  const pub = JSON.stringify(toPublicState(state));
  // Nenhum cardId de carta ativa pode aparecer no público.
  for (const p of Object.values(state.players)) {
    for (const c of p.cards) {
      if (!c.lost) expect(pub).not.toContain(c.cardId);
    }
  }
}

describe('auditoria de privacidade por fase', () => {
  const base = (): InternalState =>
    makeState(
      [
        { id: 'a', cards: ['AMBASSADOR', 'CAPTAIN'] },
        { id: 'b', cards: ['DUKE', 'CONTESSA'] },
        { id: 'c', cards: ['ASSASSIN', 'DUKE'] },
      ],
      { deck: ['DUKE', 'CONTESSA', 'CAPTAIN'] },
    );

  it('não vaza em WAITING_ACTION', () => {
    const s = base();
    for (const id of ['a', 'b', 'c']) assertPrivateDoesNotLeakOthers(s, id);
    assertPublicHasNoActiveCards(s);
  });

  it('não vaza durante troca (EXCHANGE_SELECTION) — oferta só ao dono', () => {
    let s = base();
    let r = applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'EXCHANGE' }, testCtx());
    if (!r.ok) throw new Error('setup');
    r = applyCommand(r.state, 'b', { type: 'PASS' }, testCtx());
    if (!r.ok) throw new Error('setup');
    r = applyCommand(r.state, 'c', { type: 'PASS' }, testCtx());
    if (!r.ok) throw new Error('setup');
    s = r.state;
    expect(s.phase).toBe('EXCHANGE_SELECTION');

    // o dono vê a oferta; os outros não veem nada da oferta nem da mão alheia
    const ownerPriv = toPrivateState(s, 'a');
    expect(ownerPriv.exchangeOffer).not.toBeNull();
    for (const viewer of ['b', 'c']) {
      const priv = toPrivateState(s, viewer);
      expect(priv.exchangeOffer).toBeNull();
      assertPrivateDoesNotLeakOthers(s, viewer);
    }
    // público não contém a oferta nem cartas ativas
    assertPublicHasNoActiveCards(s);
  });

  it('cartas perdidas tornam-se públicas, cartas ativas permanecem ocultas', () => {
    const s = makeState([
      { id: 'a', cards: ['DUKE'], lostCards: ['CAPTAIN'] },
      { id: 'b', cards: ['CONTESSA', 'ASSASSIN'] },
      { id: 'c', cards: ['AMBASSADOR', 'DUKE'] },
    ]);
    const pub = toPublicState(s);
    const pa = pub.players.find((p) => p.id === 'a')!;
    expect(pa.revealed).toEqual<CharacterType[]>(['CAPTAIN']); // perdida é pública
    expect(pa.influenceCount).toBe(1);
    // a carta ativa (DUKE) de 'a' não vaza no público
    assertPublicHasNoActiveCards(s);
  });
});
