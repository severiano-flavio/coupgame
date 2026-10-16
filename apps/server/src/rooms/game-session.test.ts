import { describe, expect, it } from 'vitest';
import type { CommandEnvelope } from '@coup/shared';
import { createSeededRng, type EngineCtx } from '../engine/index.js';
import { makeState } from '../engine/testkit.js';
import { GameSession } from './game-session.js';

function ctx(): EngineCtx {
  return { rng: createSeededRng(1), now: 1000 };
}

function env(partial: Partial<CommandEnvelope> & Pick<CommandEnvelope, 'cmd'>): CommandEnvelope {
  return {
    matchId: 'test',
    stateVersion: partial.stateVersion ?? 0,
    commandId: partial.commandId ?? crypto.randomUUID(),
    cmd: partial.cmd,
  };
}

describe('GameSession — idempotência e versão', () => {
  const base = () =>
    makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);

  it('aplica comando válido e incrementa stateVersion', () => {
    const s = new GameSession(base());
    const out = s.apply('a', env({ cmd: { type: 'DECLARE_ACTION', action: 'INCOME' } }), ctx());
    expect(out.ok).toBe(true);
    expect(s.getState().stateVersion).toBe(1);
    expect(s.getState().players['a']!.coins).toBe(3);
  });

  it('ignora commandId duplicado (idempotente)', () => {
    const s = new GameSession(base());
    const e = env({ cmd: { type: 'DECLARE_ACTION', action: 'INCOME' }, commandId: '11111111-1111-1111-1111-111111111111' });
    const first = s.apply('a', e, ctx());
    expect(first.ok).toBe(true);
    const versionAfter = s.getState().stateVersion;
    const second = s.apply('a', e, ctx());
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    // estado inalterado pela repetição
    expect(s.getState().stateVersion).toBe(versionAfter);
    expect(s.getState().players['a']!.coins).toBe(3);
  });

  it('rejeita stateVersion desatualizada (STALE_STATE)', () => {
    const s = new GameSession(base());
    s.apply('a', env({ cmd: { type: 'DECLARE_ACTION', action: 'INCOME' } }), ctx()); // v→1
    // b tenta agir ainda achando que é v0
    const out = s.apply('b', env({ stateVersion: 0, cmd: { type: 'DECLARE_ACTION', action: 'INCOME' } }), ctx());
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('STALE_STATE');
  });

  it('propaga rejeição da engine sem mudar o estado', () => {
    const s = new GameSession(base());
    // b não é o jogador da vez
    const out = s.apply('b', env({ cmd: { type: 'DECLARE_ACTION', action: 'INCOME' } }), ctx());
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('NOT_YOUR_TURN');
    expect(s.getState().stateVersion).toBe(0);
  });
});
