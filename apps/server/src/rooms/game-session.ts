import type { CommandEnvelope, RejectReason } from '@coup/shared';
import { applyCommand, type EngineCtx, type InternalState } from '../engine/index.js';

/**
 * Camada de aplicação de comandos sobre o estado da engine de uma sala. Trata
 * idempotência (commandId) e versão otimista (stateVersion) antes de delegar à
 * engine pura. Ver docs/multiplayer-protocol.md §4 e §5.
 */
export interface ApplyOutcome {
  ok: boolean;
  state: InternalState;
  reason?: RejectReason;
  message?: string;
  /** Eventos de log gerados nesta aplicação (para broadcast de gameEvent). */
  events: { t: number; kind: string; text: string }[];
  /** True quando o comando foi ignorado por idempotência (sem novo efeito). */
  duplicate?: boolean;
}

export class GameSession {
  private readonly processed = new Set<string>();

  constructor(private state: InternalState) {}

  getState(): InternalState {
    return this.state;
  }

  /**
   * Aplica um comando autenticado de `actorId`. Verifica idempotência e versão
   * antes de chamar a engine. Não trata autorização de identidade/sala — isso é
   * responsabilidade do handler de rede antes de chegar aqui.
   */
  apply(actorId: string, env: CommandEnvelope, ctx: EngineCtx): ApplyOutcome {
    // Idempotência: comando já processado → sem novo efeito.
    if (this.processed.has(env.commandId)) {
      return { ok: true, state: this.state, events: [], duplicate: true };
    }

    // Versão otimista: rejeita comandos baseados em visão desatualizada.
    if (env.stateVersion !== this.state.stateVersion) {
      return {
        ok: false,
        state: this.state,
        reason: 'STALE_STATE',
        message: `Versão esperada ${this.state.stateVersion}, recebida ${env.stateVersion}.`,
        events: [],
      };
    }

    const result = applyCommand(this.state, actorId, env.cmd, ctx);
    if (!result.ok) {
      return { ok: false, state: this.state, reason: result.reason, message: result.message, events: [] };
    }

    this.processed.add(env.commandId);
    this.state = result.state;
    return { ok: true, state: this.state, events: result.events };
  }

  /** Aplica um timeout (comando sintético) sem exigir commandId/version. */
  applyTimeoutState(next: InternalState): void {
    this.state = next;
  }
}
