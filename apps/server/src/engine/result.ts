import type { RejectReason } from '@coup/shared';
import type { InternalState, LogEntry } from './state/types.js';

/**
 * Resultado de uma aplicação de comando na engine. Ou avança o estado (ok) ou
 * rejeita com motivo tipado (sem alterar o estado). A engine é pura: nunca
 * lança para fluxos esperados — rejeições são valores.
 */
export interface EngineOk {
  ok: true;
  state: InternalState;
  events: LogEntry[];
}

export interface EngineRejection {
  ok: false;
  reason: RejectReason;
  message?: string;
}

export type EngineResult = EngineOk | EngineRejection;

export function reject(reason: RejectReason, message?: string): EngineRejection {
  return { ok: false, reason, message };
}

export function ok(state: InternalState, events: LogEntry[]): EngineOk {
  return { ok: true, state, events };
}
