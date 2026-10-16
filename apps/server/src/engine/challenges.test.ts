import { describe, expect, it } from 'vitest';
import { applyCommand } from './reducer.js';
import { activeChars, coins, isEliminated, makeState, testCtx } from './testkit.js';
import type { EngineOk } from './result.js';

function expectOk(r: ReturnType<typeof applyCommand>): EngineOk {
  if (!r.ok) throw new Error(`esperava ok, veio rejeição: ${r.reason} ${r.message ?? ''}`);
  return r;
}

describe('contestação de ação', () => {
  it('declarante tinha a carta: contestante perde influência e ação prossegue', () => {
    const s = makeState([
      { id: 'a', cards: ['DUKE', 'CAPTAIN'] }, // tem Duque de verdade
      { id: 'b', cards: ['ASSASSIN', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'TAX' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'b', { type: 'CHALLENGE' }, testCtx()));
    // b tem 2 cartas → precisa escolher qual perder
    expect(r.state.phase).toBe('INFLUENCE_SELECTION');
    expect(r.state.pending!.losses[0]!.playerId).toBe('b');
    const bCard = r.state.players['b']!.cards.find((c) => !c.lost)!;
    r = expectOk(applyCommand(r.state, 'b', { type: 'SELECT_INFLUENCE', cardId: bCard.cardId }, testCtx()));
    // ação (Impostos) prossegue → +3 para a (TAX não é bloqueável)
    expect(coins(r.state, 'a')).toBe(5);
    // a trocou o Duque por uma nova carta (ainda tem 2 ativas)
    expect(activeChars(r.state, 'a')).toHaveLength(2);
  });

  it('declarante blefou: perde influência e ação falha', () => {
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] }, // NÃO tem Duque
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'TAX' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'b', { type: 'CHALLENGE' }, testCtx()));
    expect(r.state.phase).toBe('INFLUENCE_SELECTION');
    expect(r.state.pending!.losses[0]!.playerId).toBe('a');
    const aCard = r.state.players['a']!.cards.find((c) => !c.lost)!;
    r = expectOk(applyCommand(r.state, 'a', { type: 'SELECT_INFLUENCE', cardId: aCard.cardId }, testCtx()));
    expect(coins(r.state, 'a')).toBe(2); // não recebeu
    expect(r.state.phase).toBe('WAITING_ACTION');
    expect(r.state.turnIndex).toBe(1);
  });

  it('primeira contestação válida prevalece; a segunda é rejeitada e não altera a resolução', () => {
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] }, // blefa Duque
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['DUKE', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'TAX' }, testCtx()));
    // b contesta primeiro (a blefou) → a deve perder influência.
    r = expectOk(applyCommand(r.state, 'b', { type: 'CHALLENGE' }, testCtx()));
    expect(r.state.pending!.losses[0]!.playerId).toBe('a');
    // c tenta contestar depois: a janela já foi resolvida → rejeição.
    const second = applyCommand(r.state, 'c', { type: 'CHALLENGE' }, testCtx());
    expect(second.ok).toBe(false);
    // c não pode alterar a resolução: quem perde influência continua sendo 'a'.
    expect(r.state.pending!.losses[0]!.playerId).toBe('a');
  });

  it('contestação concorrente na mesma janela: só o primeiro válido conta', () => {
    // Dois adversários na janela de bloqueio de Ajuda externa; o primeiro BLOCK
    // fecha a janela para o segundo.
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] },
      { id: 'c', cards: ['DUKE', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'FOREIGN_AID' }, testCtx()));
    expect(r.state.phase).toBe('BLOCK_WINDOW');
    r = expectOk(applyCommand(r.state, 'b', { type: 'BLOCK', character: 'DUKE' }, testCtx()));
    // janela passou a BLOCK_CHALLENGE; um segundo BLOCK de c é inválido.
    const second = applyCommand(r.state, 'c', { type: 'BLOCK', character: 'DUKE' }, testCtx());
    expect(second.ok).toBe(false);
  });
});

describe('contestação de bloqueio', () => {
  it('bloqueador blefou: perde influência e ação original prossegue', () => {
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] }, // dá Ajuda externa
      { id: 'b', cards: ['CONTESSA', 'ASSASSIN'] }, // blefa Duque
      { id: 'c', cards: ['DUKE', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'FOREIGN_AID' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'b', { type: 'BLOCK', character: 'DUKE' }, testCtx()));
    expect(r.state.phase).toBe('BLOCK_CHALLENGE');
    r = expectOk(applyCommand(r.state, 'a', { type: 'CHALLENGE' }, testCtx()));
    // b não tinha Duque → escolhe carta a perder
    expect(r.state.phase).toBe('INFLUENCE_SELECTION');
    const bCard = r.state.players['b']!.cards.find((c) => !c.lost)!;
    r = expectOk(applyCommand(r.state, 'b', { type: 'SELECT_INFLUENCE', cardId: bCard.cardId }, testCtx()));
    // Ajuda externa prossegue → +2 para a
    expect(coins(r.state, 'a')).toBe(4);
  });

  it('bloqueador tinha a carta: contestante perde influência e ação é impedida', () => {
    const s = makeState([
      { id: 'a', cards: ['CAPTAIN', 'ASSASSIN'] },
      { id: 'b', cards: ['DUKE', 'CONTESSA'] }, // Duque verdadeiro
      { id: 'c', cards: ['ASSASSIN', 'CONTESSA'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'FOREIGN_AID' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'b', { type: 'BLOCK', character: 'DUKE' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'a', { type: 'CHALLENGE' }, testCtx()));
    // a contestou errado → a perde influência
    expect(r.state.phase).toBe('INFLUENCE_SELECTION');
    expect(r.state.pending!.losses[0]!.playerId).toBe('a');
    const aCard = r.state.players['a']!.cards.find((c) => !c.lost)!;
    r = expectOk(applyCommand(r.state, 'a', { type: 'SELECT_INFLUENCE', cardId: aCard.cardId }, testCtx()));
    expect(coins(r.state, 'a')).toBe(2); // ação impedida
  });
});

describe('Assassinato', () => {
  it('custo 3 pago na declaração; não restituído sob bloqueio por Condessa', () => {
    const s = makeState([
      { id: 'a', coins: 3, cards: ['ASSASSIN', 'CAPTAIN'] },
      { id: 'b', cards: ['CONTESSA', 'DUKE'] }, // bloqueia com Condessa verdadeira
      { id: 'c', cards: ['ASSASSIN', 'DUKE'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'ASSASSINATE', targetId: 'b' }, testCtx()));
    expect(coins(r.state, 'a')).toBe(0); // pagou 3 na declaração
    expect(r.state.phase).toBe('ACTION_CHALLENGE');
    r = expectOk(applyCommand(r.state, 'b', { type: 'PASS' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'c', { type: 'PASS' }, testCtx()));
    expect(r.state.phase).toBe('BLOCK_WINDOW');
    r = expectOk(applyCommand(r.state, 'b', { type: 'BLOCK', character: 'CONTESSA' }, testCtx()));
    // ninguém contesta o bloqueio
    r = expectOk(applyCommand(r.state, 'a', { type: 'PASS' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'c', { type: 'PASS' }, testCtx()));
    expect(coins(r.state, 'a')).toBe(0); // custo não volta
    expect(activeChars(r.state, 'b')).toHaveLength(2); // b não perdeu influência
  });

  it('A1: alvo com 1 influência contesta Assassino verdadeiro e perde → eliminado; assassinato não encontra 2ª influência', () => {
    const s = makeState([
      { id: 'a', coins: 3, cards: ['ASSASSIN', 'CAPTAIN'] }, // Assassino verdadeiro
      { id: 'b', cards: ['DUKE'], lostCards: ['CONTESSA'] }, // só 1 influência
      { id: 'c', cards: ['ASSASSIN', 'DUKE'] },
    ]);
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'ASSASSINATE', targetId: 'b' }, testCtx()));
    // b contesta o Assassino (verdadeiro) → b perde a contestação
    r = expectOk(applyCommand(r.state, 'b', { type: 'CHALLENGE' }, testCtx()));
    // b tinha 1 influência → perde automaticamente e é eliminado
    expect(isEliminated(r.state, 'b')).toBe(true);
    // com b eliminado restam a e c; o assassinato não tem 2ª influência para remover
    expect(coins(r.state, 'a')).toBe(0);
    expect(r.state.phase === 'WAITING_ACTION' || r.state.phase === 'GAME_OVER').toBe(true);
  });
});

describe('vitória', () => {
  it('último jogador com influência vence (GAME_OVER)', () => {
    // 3 jogadores; b e c já estão com 1 influência. a golpeia b (eliminado) e
    // na sequência c também cai, deixando a como único vivo.
    const s = makeState([
      { id: 'a', coins: 14, cards: ['DUKE', 'CAPTAIN'] },
      { id: 'b', cards: ['CONTESSA'], lostCards: ['DUKE'] },
      { id: 'c', cards: ['ASSASSIN'], lostCards: ['DUKE'] },
    ]);
    // a golpeia b → b eliminado; turno vai para c (1 influência).
    let r = expectOk(applyCommand(s, 'a', { type: 'DECLARE_ACTION', action: 'COUP', targetId: 'b' }, testCtx()));
    expect(isEliminated(r.state, 'b')).toBe(true);
    // turno de c: c dá Renda (não encerra). Depois volta para a, que golpeia c.
    r = expectOk(applyCommand(r.state, 'c', { type: 'DECLARE_ACTION', action: 'INCOME' }, testCtx()));
    r = expectOk(applyCommand(r.state, 'a', { type: 'DECLARE_ACTION', action: 'COUP', targetId: 'c' }, testCtx()));
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.winnerId).toBe('a');
  });
});
