import { describe, expect, it } from 'vitest';
import { applyCommand, type EngineCtx } from './reducer.js';
import { createMatch } from './state/setup.js';
import { createSeededRng } from './rng.js';
import { livePlayers } from './state/queries.js';
import type { InternalState } from './state/types.js';
import { toPublicState } from '../snapshots/project.js';

/**
 * Partidas completas para 3, 4, 5 e 6 jogadores, dirigidas por comandos até
 * GAME_OVER, com auditoria de privacidade a cada passo (requirements §3, §6).
 */

function names(n: number): { id: string; name: string }[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
}

/** Verifica que o snapshot público não contém qualquer campo oculto. */
function assertNoLeak(state: InternalState): void {
  const serialized = JSON.stringify(toPublicState(state));
  expect(serialized).not.toContain('"cardId"');
  expect(serialized).not.toContain('"hand"');
  expect(serialized).not.toContain('"cards"');
  expect(serialized).not.toContain('"deck"');
  expect(serialized).not.toContain('exchangeDraw');
}

function playToEnd(n: number): InternalState {
  const ctx: EngineCtx = { rng: createSeededRng(100 + n), now: 0 };
  let state = createMatch(`m${n}`, names(n), createSeededRng(200 + n));
  // moedas altas para forçar golpes e eliminações rápidas (teste determinístico)
  for (const id of Object.keys(state.players)) state.players[id]!.coins = 20;

  let guard = 0;
  while (state.phase !== 'GAME_OVER' && guard < 500) {
    guard++;
    assertNoLeak(state);

    if (state.phase === 'WAITING_ACTION') {
      const curId = state.order[state.turnIndex]!;
      const cur = state.players[curId]!;
      const target = livePlayers(state).find((p) => p.id !== curId);
      if (!target) break;
      // Golpe quando puder pagar; senão acumula com Renda (sempre válida).
      const cmd =
        cur.coins >= 7
          ? ({ type: 'DECLARE_ACTION', action: 'COUP', targetId: target.id } as const)
          : ({ type: 'DECLARE_ACTION', action: 'INCOME' } as const);
      const r = applyCommand(state, curId, cmd, ctx);
      if (!r.ok) throw new Error(`comando rejeitado inesperadamente: ${r.reason}`);
      state = r.state;
    } else if (state.phase === 'INFLUENCE_SELECTION') {
      const loserId = state.pending!.losses[0]!.playerId;
      const card = state.players[loserId]!.cards.find((c) => !c.lost)!;
      const r = applyCommand(state, loserId, { type: 'SELECT_INFLUENCE', cardId: card.cardId }, ctx);
      if (!r.ok) throw new Error(`SELECT_INFLUENCE rejeitado: ${r.reason}`);
      state = r.state;
    } else {
      // fases intermediárias inesperadas neste roteiro simples
      break;
    }
  }
  return state;
}

describe.each([3, 4, 5, 6])('partida com %i jogadores', (n) => {
  it('chega a GAME_OVER com um único vencedor e sem vazamento', () => {
    const state = playToEnd(n);
    expect(state.phase).toBe('GAME_OVER');
    const alive = livePlayers(state);
    expect(alive).toHaveLength(1);
    expect(alive[0]!.id).toBe(state.winnerId);
    // conservação de cartas
    const inHands = Object.values(state.players).reduce((acc, p) => acc + p.cards.length, 0);
    expect(inHands + state.deck.length).toBe(15);
    assertNoLeak(state);
  });
});
