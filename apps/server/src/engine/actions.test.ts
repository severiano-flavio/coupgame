import { describe, expect, it } from 'vitest';
import { applyCommand } from './reducer.js';
import { activeChars, coins, makeState, testCtx } from './testkit.js';
import type { EngineOk } from './result.js';

function expectOk(r: ReturnType<typeof applyCommand>): EngineOk {
  if (!r.ok) throw new Error(`esperava ok, veio rejeição: ${r.reason} ${r.message ?? ''}`);
  return r;
}

describe('ações sem personagem', () => {
  it('Renda concede +1 e passa o turno', () => {
    const s = makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'INCOME' }, testCtx()));
    expect(coins(r.state, 'a')).toBe(3);
    expect(r.state.phase).toBe('WAITING_ACTION');
    expect(r.state.turnIndex).toBe(1);
  });

  it('Golpe custa 7 e remove influência do alvo (alvo com 1 carta perde auto)', () => {
    const s = makeState([
      { id: 'a', coins: 7, cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['CONTESSA'], lostCards: ['DUKE'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'COUP', targetId: 'b' }, testCtx()));
    expect(coins(r.state, 'a')).toBe(0);
    expect(r.state.players['b']!.eliminated).toBe(true);
    // b eliminado → turno de c? Com 2 vivos resta jogo; turno avança para o próximo vivo.
    expect(r.state.phase === 'WAITING_ACTION' || r.state.phase === 'GAME_OVER').toBe(true);
  });

  it('Golpe contra alvo com 2 cartas abre INFLUENCE_SELECTION', () => {
    const s = makeState([
      { id: 'a', coins: 7, cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'COUP', targetId: 'b' }, testCtx()));
    expect(r.state.phase).toBe('INFLUENCE_SELECTION');
    expect(r.state.pending!.losses[0]!.playerId).toBe('b');
  });

  it('rejeita Golpe com menos de 7 moedas', () => {
    const s = makeState([
      { id: 'a', coins: 6, cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'COUP', targetId: 'b' }, testCtx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('INSUFFICIENT_COINS');
  });

  it('obriga Golpe com >=10 moedas (rejeita outras ações)', () => {
    const s = makeState([
      { id: 'a', coins: 10, cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'INCOME' }, testCtx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('MUST_COUP');
  });

  it('rejeita ação fora do turno', () => {
    const s = makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    const r = applyCommand(s, 'b', { type: 'DECLARE_ACTION', action: 'INCOME' }, testCtx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('NOT_YOUR_TURN');
  });
});

describe('Impostos (Duque)', () => {
  it('não contestado concede +3', () => {
    const s = makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'TAX' }, testCtx()));
    expect(r.state.phase).toBe('ACTION_CHALLENGE');
    r = expectOk(applyCommand(r.state, 'b', { type: 'PASS' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'c', { type: 'PASS' }, testCtx()));
    expect(coins(r.state, 'a')).toBe(5);
    expect(r.state.phase).toBe('WAITING_ACTION');
    expect(r.state.turnIndex).toBe(1);
  });
});

describe('Ajuda externa + bloqueio por Duque', () => {
  it('não bloqueada concede +2', () => {
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'FOREIGN_AID' }, testCtx()));
    expect(r.state.phase).toBe('BLOCK_WINDOW');
    r = expectOk(applyCommand(r.state, 'b', { type: 'PASS' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'c', { type: 'PASS' }, testCtx()));
    expect(coins(r.state, 'a')).toBe(4);
  });

  it('bloqueada por Duque verdadeiro e não contestada impede a ação', () => {
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'FOREIGN_AID' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'b', { type: 'BLOCK', character: 'DUKE' }, testCtx()));
    expect(r.state.phase).toBe('BLOCK_CHALLENGE');
    // ninguém contesta o bloqueio
    r = expectOk(applyCommand(r.state, 'a', { type: 'PASS' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'c', { type: 'PASS' }, testCtx()));
    expect(coins(r.state, 'a')).toBe(2); // não recebeu
    expect(r.state.phase).toBe('WAITING_ACTION');
  });
});

describe('Roubo (Capitão)', () => {
  it('rouba até 2, limitado ao saldo da vítima', () => {
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] },
      { id: 'b', coins: 1, cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'STEAL', targetId: 'b' }, testCtx()));
    // janela de contestação da ação
    r = expectOk(applyCommand(r.state, 'b', { type: 'PASS' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'c', { type: 'PASS' }, testCtx()));
    // janela de bloqueio (só o alvo b)
    expect(r.state.phase).toBe('BLOCK_WINDOW');
    r = expectOk(applyCommand(r.state, 'b', { type: 'PASS' }, testCtx()));
    expect(coins(r.state, 'b')).toBe(0);
    expect(coins(r.state, 'a')).toBe(3); // 2 + 1
  });

  it('bloqueável apenas pelo alvo', () => {
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] },
      { id: 'b', coins: 2, cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['CAPTAIN', 'CONTESSA'] },
    ]);
    const r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'STEAL', targetId: 'b' }, testCtx()));
    // ninguém contesta a ação
    const r2 = expectOk(applyCommand(r.state, 'b', { type: 'PASS' }, testCtx()));
    const r3 = expectOk(applyCommand(r2.state, 'c', { type: 'PASS' }, testCtx()));
    expect(r3.state.phase).toBe('BLOCK_WINDOW');
    // somente o alvo b está na janela de bloqueio
    expect(r3.state.pending!.reactionOwners).toEqual(['b']);
    // c não pode bloquear
    const bad = applyCommand(r3.state, 'c', { type: 'BLOCK', character: 'CAPTAIN' }, testCtx());
    expect(bad.ok).toBe(false);
  });
});

describe('Troca (Embaixador)', () => {
  it('mantém o número de influências ativas e devolve o resto', () => {
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
    expect(r.state.pending!.exchangeDraw).toHaveLength(2);
    // escolhe manter 2 cartas dentre as 4 disponíveis (2 ativas + 2 sacadas)
    const player = r.state.players['a']!;
    const pool = [...player.cards.filter((c) => !c.lost), ...r.state.pending!.exchangeDraw!];
    const keep = [pool[0]!.cardId, pool[1]!.cardId];
    r = expectOk(applyCommand(r.state, 'a', { type: 'SELECT_EXCHANGE', cardIds: keep }, testCtx()));
    expect(activeChars(r.state, 'a')).toHaveLength(2);
    expect(r.state.phase).toBe('WAITING_ACTION');
  });
});
