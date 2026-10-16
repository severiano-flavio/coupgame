import { describe, expect, it } from 'vitest';
import { applyCommand, type EngineCtx } from './reducer.js';
import { createMatch } from './state/setup.js';
import { createSeededRng } from './rng.js';
import type { EngineOk } from './result.js';
import type { InternalState } from './state/types.js';
import { livePlayers } from './state/queries.js';

function expectOk(r: ReturnType<typeof applyCommand>): EngineOk {
  if (!r.ok) throw new Error(`esperava ok: ${r.reason} ${r.message ?? ''}`);
  return r;
}

/**
 * Partida completa dirigida por comandos, SEM Three.js nem rede. Valida o
 * critério de aceite da Etapa 2: uma partida chega a GAME_OVER com estado
 * consistente. Usa Renda + Golpes para forçar eliminações de forma
 * determinística (sem depender das cartas sorteadas).
 */
describe('partida completa por comandos', () => {
  it('3 jogadores jogam até GAME_OVER com estado consistente', () => {
    const ctx: EngineCtx = { rng: createSeededRng(123), now: 0 };
    const seats = [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
      { id: 'c', name: 'Caio' },
    ];
    let state: InternalState = createMatch('m1', seats, createSeededRng(5));

    // Dá moedas suficientes para golpes rápidos (ajuste direto do estado é
    // aceitável no teste; a engine valida custos normalmente nos comandos).
    for (const id of ['a', 'b', 'c']) state.players[id]!.coins = 14;

    const order = state.order; // ordem sorteada
    let guard = 0;

    while (state.phase !== 'GAME_OVER' && guard < 100) {
      guard++;
      const currentId = state.order[state.turnIndex]!;
      // alvo: primeiro adversário vivo
      const target = livePlayers(state).find((p) => p.id !== currentId);
      if (!target) break;

      if (state.players[currentId]!.coins >= 7) {
        let r = expectOk(
          applyCommand(state, currentId, { type: 'DECLARE_ACTION', action: 'COUP', targetId: target.id }, ctx),
        );
        state = r.state;
        // Se o alvo tem 2 cartas, precisa escolher qual perder.
        if (state.phase === 'INFLUENCE_SELECTION') {
          const loser = state.pending!.losses[0]!.playerId;
          const card = state.players[loser]!.cards.find((c) => !c.lost)!;
          r = expectOk(applyCommand(state, loser, { type: 'SELECT_INFLUENCE', cardId: card.cardId }, ctx));
          state = r.state;
        }
      } else {
        const r = expectOk(applyCommand(state, currentId, { type: 'DECLARE_ACTION', action: 'INCOME' }, ctx));
        state = r.state;
      }
    }

    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerId).toBeDefined();
    // Consistência: só o vencedor permanece vivo.
    const alive = livePlayers(state);
    expect(alive).toHaveLength(1);
    expect(alive[0]!.id).toBe(state.winnerId);
    // A ordem original é preservada (não é mutada por eliminação).
    expect(state.order).toEqual(order);
    // Nenhuma carta "surgiu": 15 cartas distribuídas entre mãos, perdidas e deck.
    const inHands = Object.values(state.players).reduce((n, p) => n + p.cards.length, 0);
    expect(inHands + state.deck.length).toBe(15);
  });

  it('estado é imutável: applyCommand não altera o estado anterior', () => {
    const ctx: EngineCtx = { rng: createSeededRng(1), now: 0 };
    const seats = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ];
    const state = createMatch('m', seats, createSeededRng(1));
    const firstId = state.order[0]!;
    const beforeCoins = state.players[firstId]!.coins;
    const r = expectOk(applyCommand(state, firstId, { type: 'DECLARE_ACTION', action: 'INCOME' }, ctx));
    // estado anterior inalterado
    expect(state.players[firstId]!.coins).toBe(beforeCoins);
    expect(state.stateVersion).toBe(0);
    // novo estado avançado
    expect(r.state.players[firstId]!.coins).toBe(beforeCoins + 1);
    expect(r.state.stateVersion).toBe(1);
  });
});
