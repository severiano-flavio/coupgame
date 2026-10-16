import type { GameCommand, RejectReason } from '@coup/shared';
import type { InternalState } from '../engine/index.js';
import { queries } from '../engine/index.js';

/**
 * Autorização de alto nível por fase/turno/janela, aplicada antes da engine
 * (defesa em profundidade). A engine ainda revalida tudo; aqui damos motivos
 * de rejeição precisos e barramos cedo. Ver docs/multiplayer-protocol.md §4.
 */
export type AuthResult = { ok: true } | { ok: false; reason: RejectReason; message?: string };

const OK: AuthResult = { ok: true };

export function authorizeCommand(
  state: InternalState,
  playerId: string,
  cmd: GameCommand,
): AuthResult {
  const player = state.players[playerId];
  if (!player || player.eliminated) {
    return { ok: false, reason: 'NOT_AUTHORIZED', message: 'Jogador inválido ou eliminado.' };
  }

  switch (cmd.type) {
    case 'DECLARE_ACTION': {
      if (state.phase !== 'WAITING_ACTION') return invalidPhase();
      const cur = queries.currentPlayer(state);
      if (!cur || cur.id !== playerId) {
        return { ok: false, reason: 'NOT_YOUR_TURN' };
      }
      return OK;
    }

    case 'CHALLENGE': {
      if (state.phase !== 'ACTION_CHALLENGE' && state.phase !== 'BLOCK_CHALLENGE') {
        return invalidPhase();
      }
      return reactionOwner(state, playerId);
    }

    case 'BLOCK': {
      if (state.phase !== 'BLOCK_WINDOW') return invalidPhase();
      return reactionOwner(state, playerId);
    }

    case 'PASS': {
      if (
        state.phase !== 'ACTION_CHALLENGE' &&
        state.phase !== 'BLOCK_WINDOW' &&
        state.phase !== 'BLOCK_CHALLENGE'
      ) {
        return invalidPhase();
      }
      return reactionOwner(state, playerId);
    }

    case 'SELECT_INFLUENCE': {
      if (state.phase !== 'INFLUENCE_SELECTION') return invalidPhase();
      const loss = state.pending?.losses[0];
      if (!loss || loss.playerId !== playerId) {
        return { ok: false, reason: 'NOT_AUTHORIZED', message: 'Não é você quem perde influência.' };
      }
      return OK;
    }

    case 'SELECT_EXCHANGE': {
      if (state.phase !== 'EXCHANGE_SELECTION') return invalidPhase();
      if (state.pending?.action?.by !== playerId) {
        return { ok: false, reason: 'NOT_AUTHORIZED', message: 'Troca não é sua.' };
      }
      return OK;
    }
  }
}

function reactionOwner(state: InternalState, playerId: string): AuthResult {
  const owners = state.pending?.reactionOwners ?? [];
  if (!owners.includes(playerId)) {
    return { ok: false, reason: 'WINDOW_CLOSED', message: 'Janela de reação indisponível.' };
  }
  return OK;
}

function invalidPhase(): AuthResult {
  return { ok: false, reason: 'INVALID_PHASE' };
}
