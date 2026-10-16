import type { CharacterType } from '@coup/shared';
import type { EngineCtx } from './reducer.js';
import { createSeededRng } from './rng.js';
import type { InternalCard, InternalPlayer, InternalState } from './state/types.js';

/**
 * Utilidades de teste para montar estados determinísticos com cartas
 * controladas (evita depender da ordem de embaralhamento). Apenas para testes.
 */

let cardSeq = 0;
export function card(character: CharacterType, lost = false): InternalCard {
  return { cardId: `t${cardSeq++}_${character}`, character, lost };
}

export interface TestPlayerSpec {
  id: string;
  name?: string;
  coins?: number;
  cards: CharacterType[];
  lostCards?: CharacterType[];
}

/** Monta um InternalState em WAITING_ACTION com jogadores e deck controlados. */
export function makeState(
  specs: TestPlayerSpec[],
  opts: { deck?: CharacterType[]; turnIndex?: number; matchId?: string } = {},
): InternalState {
  const players: Record<string, InternalPlayer> = {};
  const order: string[] = [];
  specs.forEach((spec, seat) => {
    const cards: InternalCard[] = [
      ...spec.cards.map((c) => card(c, false)),
      ...(spec.lostCards ?? []).map((c) => card(c, true)),
    ];
    players[spec.id] = {
      id: spec.id,
      name: spec.name ?? spec.id,
      seat,
      coins: spec.coins ?? 2,
      cards,
      connected: true,
      eliminated: (spec.lostCards?.length ?? 0) >= 2 && spec.cards.length === 0,
    };
    order.push(spec.id);
  });

  const deck: InternalCard[] = (opts.deck ?? ['DUKE', 'CAPTAIN', 'AMBASSADOR']).map((c) =>
    card(c, false),
  );

  return {
    matchId: opts.matchId ?? 'test',
    stateVersion: 0,
    phase: 'WAITING_ACTION',
    order,
    turnIndex: opts.turnIndex ?? 0,
    players,
    deck,
    log: [],
  };
}

/** Contexto de engine determinístico para testes. */
export function testCtx(seed = 1): EngineCtx {
  return { rng: createSeededRng(seed), now: 1000 };
}

export function coins(state: InternalState, id: string): number {
  return state.players[id]?.coins ?? -1;
}

export function activeChars(state: InternalState, id: string): CharacterType[] {
  return (state.players[id]?.cards ?? []).filter((c) => !c.lost).map((c) => c.character);
}

export function isEliminated(state: InternalState, id: string): boolean {
  return state.players[id]?.eliminated ?? false;
}
