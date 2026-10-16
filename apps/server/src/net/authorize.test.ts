import { describe, expect, it } from 'vitest';
import { applyCommand } from '../engine/reducer.js';
import { makeState, testCtx } from '../engine/testkit.js';
import { authorizeCommand } from './authorize.js';

describe('authorizeCommand', () => {
  const base = () =>
    makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);

  it('permite DECLARE_ACTION só ao jogador da vez', () => {
    const s = base();
    expect(authorizeCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'INCOME' }).ok).toBe(true);
    const bad = authorizeCommand(s, 'b', { type: 'DECLARE_ACTION', action: 'INCOME' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe('NOT_YOUR_TURN');
  });

  it('rejeita CHALLENGE fora de janela de contestação', () => {
    const s = base();
    const r = authorizeCommand(s, 'b', { type: 'CHALLENGE' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('INVALID_PHASE');
  });

  it('autoriza apenas quem está na janela de reação', () => {
    const s = base();
    const declared = applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'TAX' }, testCtx());
    if (!declared.ok) throw new Error('setup falhou');
    const st = declared.state;
    expect(authorizeCommand(st, 'b', { type: 'CHALLENGE' }).ok).toBe(true);
    // 'a' é o declarante, não está na janela
    const self = authorizeCommand(st, 'a', { type: 'CHALLENGE' });
    expect(self.ok).toBe(false);
    if (!self.ok) expect(self.reason).toBe('WINDOW_CLOSED');
  });

  it('rejeita jogador eliminado', () => {
    const s = makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: [], lostCards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = authorizeCommand(s, 'b', { type: 'PASS' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('NOT_AUTHORIZED');
  });
});
