import type { Phase } from '@coup/shared';

/**
 * Durações (ms) de cada fase cronometrada. Adaptações digitais — ver
 * docs/game-rules.md §8.1. Configuráveis para testes.
 */
export interface TimerConfig {
  action: number; // WAITING_ACTION
  reaction: number; // ACTION_CHALLENGE / BLOCK_WINDOW / BLOCK_CHALLENGE
  selection: number; // INFLUENCE_SELECTION / EXCHANGE_SELECTION
}

export const DEFAULT_TIMERS: TimerConfig = {
  action: 90_000, // declarar a ação do turno
  reaction: 25_000, // contestar/bloquear
  selection: 40_000, // perder influência / concluir troca
};

export function phaseDuration(phase: Phase, cfg: TimerConfig): number | null {
  switch (phase) {
    case 'WAITING_ACTION':
      return cfg.action;
    case 'ACTION_CHALLENGE':
    case 'BLOCK_WINDOW':
    case 'BLOCK_CHALLENGE':
      return cfg.reaction;
    case 'INFLUENCE_SELECTION':
    case 'EXCHANGE_SELECTION':
      return cfg.selection;
    default:
      return null; // LOBBY, DEALING, RESOLVING, NEXT_TURN, GAME_OVER não cronometram
  }
}

/**
 * Agenda timeouts por sala. Mantém um único timer ativo por sala; ao mudar de
 * fase, cancela o anterior e agenda o novo. O callback é chamado quando o prazo
 * expira. O relógio real (setTimeout) é injetável para testes.
 */
export class MatchTimers {
  private readonly handles = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly deadlines = new Map<string, number>();

  constructor(
    private readonly cfg: TimerConfig = DEFAULT_TIMERS,
    private readonly schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> = (
      fn,
      ms,
    ) => setTimeout(fn, ms),
    private readonly cancel: (h: ReturnType<typeof setTimeout>) => void = (h) => clearTimeout(h),
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** (Re)agenda o timer para a fase atual da sala. */
  arm(roomCode: string, phase: Phase, onExpire: (phase: Phase) => void): number | null {
    this.clear(roomCode);
    const duration = phaseDuration(phase, this.cfg);
    if (duration === null) return null;
    const deadline = this.now() + duration;
    this.deadlines.set(roomCode, deadline);
    const handle = this.schedule(() => {
      this.handles.delete(roomCode);
      this.deadlines.delete(roomCode);
      onExpire(phase);
    }, duration);
    this.handles.set(roomCode, handle);
    return deadline;
  }

  deadlineFor(roomCode: string): number | null {
    return this.deadlines.get(roomCode) ?? null;
  }

  clear(roomCode: string): void {
    const h = this.handles.get(roomCode);
    if (h !== undefined) {
      this.cancel(h);
      this.handles.delete(roomCode);
    }
    this.deadlines.delete(roomCode);
  }

  clearAll(): void {
    for (const h of this.handles.values()) this.cancel(h);
    this.handles.clear();
    this.deadlines.clear();
  }
}
