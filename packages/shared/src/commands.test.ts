import { describe, expect, it } from 'vitest';
import { commandEnvelopeSchema, gameCommandSchema } from './commands.js';

describe('gameCommandSchema', () => {
  it('aceita DECLARE_ACTION com alvo opcional', () => {
    const r = gameCommandSchema.safeParse({ type: 'DECLARE_ACTION', action: 'COUP', targetId: 'p2' });
    expect(r.success).toBe(true);
  });

  it('aceita DECLARE_ACTION sem alvo', () => {
    const r = gameCommandSchema.safeParse({ type: 'DECLARE_ACTION', action: 'INCOME' });
    expect(r.success).toBe(true);
  });

  it('rejeita ação inexistente', () => {
    const r = gameCommandSchema.safeParse({ type: 'DECLARE_ACTION', action: 'FLY' });
    expect(r.success).toBe(false);
  });

  it('aceita BLOCK com personagem válido', () => {
    const r = gameCommandSchema.safeParse({ type: 'BLOCK', character: 'DUKE' });
    expect(r.success).toBe(true);
  });

  it('rejeita BLOCK com personagem inválido', () => {
    const r = gameCommandSchema.safeParse({ type: 'BLOCK', character: 'KING' });
    expect(r.success).toBe(false);
  });

  it('aceita SELECT_EXCHANGE com lista de cardIds', () => {
    const r = gameCommandSchema.safeParse({ type: 'SELECT_EXCHANGE', cardIds: ['c1', 'c2'] });
    expect(r.success).toBe(true);
  });
});

describe('commandEnvelopeSchema', () => {
  it('exige commandId UUID', () => {
    const bad = commandEnvelopeSchema.safeParse({
      matchId: 'm1',
      stateVersion: 0,
      commandId: 'not-a-uuid',
      cmd: { type: 'PASS' },
    });
    expect(bad.success).toBe(false);
  });

  it('aceita envelope completo válido', () => {
    const ok = commandEnvelopeSchema.safeParse({
      matchId: 'm1',
      stateVersion: 3,
      commandId: '123e4567-e89b-12d3-a456-426614174000',
      cmd: { type: 'CHALLENGE' },
    });
    expect(ok.success).toBe(true);
  });

  it('rejeita stateVersion negativa', () => {
    const bad = commandEnvelopeSchema.safeParse({
      matchId: 'm1',
      stateVersion: -1,
      commandId: '123e4567-e89b-12d3-a456-426614174000',
      cmd: { type: 'PASS' },
    });
    expect(bad.success).toBe(false);
  });
});
