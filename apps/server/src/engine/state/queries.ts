import type { InternalPlayer, InternalState } from './types.js';

/** Cartas ativas (não perdidas) de um jogador = suas influências. */
export function activeCards(player: InternalPlayer): InternalPlayer['cards'] {
  return player.cards.filter((c) => !c.lost);
}

export function influenceCount(player: InternalPlayer): number {
  return activeCards(player).length;
}

/** Jogador da vez (pode ser null em GAME_OVER). */
export function currentPlayer(state: InternalState): InternalPlayer | null {
  const id = state.order[state.turnIndex];
  return id ? (state.players[id] ?? null) : null;
}

/** Jogadores ainda no jogo (não eliminados). */
export function livePlayers(state: InternalState): InternalPlayer[] {
  return state.order.map((id) => state.players[id]).filter((p): p is InternalPlayer => !!p && !p.eliminated);
}

/**
 * Próximo índice de turno (sentido horário), pulando eliminados.
 * Assume que há pelo menos um jogador vivo.
 */
export function nextTurnIndex(state: InternalState): number {
  const n = state.order.length;
  for (let step = 1; step <= n; step++) {
    const idx = (state.turnIndex + step) % n;
    const id = state.order[idx]!;
    const p = state.players[id];
    if (p && !p.eliminated) return idx;
  }
  return state.turnIndex;
}

/** Adversários vivos de um jogador (todos menos ele). */
export function liveOpponents(state: InternalState, playerId: string): InternalPlayer[] {
  return livePlayers(state).filter((p) => p.id !== playerId);
}

export function getPlayer(state: InternalState, id: string): InternalPlayer | undefined {
  return state.players[id];
}
