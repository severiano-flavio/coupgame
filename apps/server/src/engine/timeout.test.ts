import { describe, expect, it } from 'vitest';
import { applyCommand } from './reducer.js';
import { applyTimeout } from './timeout.js';
import { activeChars, coins, isEliminated, makeState, testCtx } from './testkit.js';
import type { EngineOk } from './result.js';

function expectOk(r: ReturnType<typeof applyCommand>): EngineOk {
  if (!r.ok) throw new Error(`esperava ok: ${r.reason}`);
  return r;
}

describe('timeouts (adaptações digitais D1–D3)', () => {
  it('D3: ação do turno não declarada aplica Renda', () => {
    const s = makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = expectOk(applyTimeout(s, 'WAITING_ACTION', testCtx()));
    expect(coins(r.state, 'a')).toBe(3);
    expect(r.state.turnIndex).toBe(1);
  });

  it('D3: com >=10 moedas aplica Golpe no próximo adversário vivo', () => {
    const s = makeState([
      { id: 'a', coins: 10, cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = expectOk(applyTimeout(s, 'WAITING_ACTION', testCtx()));
    expect(coins(r.state, 'a')).toBe(3); // pagou 7
    // b (próximo vivo) deve estar perdendo influência ou já ter perdido
    expect(r.state.phase === 'INFLUENCE_SELECTION' || isEliminated(r.state, 'b')).toBe(true);
  });

  it('reação não enviada equivale a PASS por todos (janela fecha)', () => {
    const s = makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['CONTESSA', 'ASSASSIN'] },
      { id: 'c', cards: ['CONTESSA', 'ASSASSIN'] },
    ]);
    const d = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'TAX' }, testCtx()));
    expect(d.state.phase).toBe('ACTION_CHALLENGE');
    const r = expectOk(applyTimeout(d.state, 'ACTION_CHALLENGE', testCtx()));
    // ninguém contestou → Impostos resolve (+3)
    expect(coins(r.state, 'a')).toBe(5);
  });

  it('D1: perda não escolhida remove a carta ativa de maior índice', () => {
    // a golpeia b (2 cartas) → b em INFLUENCE_SELECTION; timeout escolhe auto.
    const s = makeState([
      { id: 'a', coins: 7, cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const d = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'COUP', targetId: 'b' }, testCtx()));
    expect(d.state.phase).toBe('INFLUENCE_SELECTION');
    const r = expectOk(applyTimeout(d.state, 'INFLUENCE_SELECTION', testCtx()));
    // b perdeu exatamente uma influência (sobra 1)
    expect(activeChars(r.state, 'b')).toHaveLength(1);
    expect(r.state.phase).toBe('WAITING_ACTION');
  });

  it('D2: troca não concluída preserva as cartas originais ativas', () => {
    const s = makeState(
      [
        { id: 'a', cards: ['AMBASSADOR', 'CAPTAIN'] },
        { id: 'b', cards: ['DUKE', 'CONTESSA'] },
        { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
      ],
      { deck: ['DUKE', 'DUKE', 'ASSASSIN'] },
    );
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'EXCHANGE' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'b', { type: 'PASS' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'c', { type: 'PASS' }, testCtx()));
    expect(r.state.phase).toBe('EXCHANGE_SELECTION');
    const before = activeChars(r.state, 'a').slice().sort();
    r = expectOk(applyTimeout(r.state, 'EXCHANGE_SELECTION', testCtx()));
    const after = activeChars(r.state, 'a').slice().sort();
    expect(after).toEqual(before); // manteve as originais
    expect(r.state.phase).toBe('WAITING_ACTION');
  });
});
