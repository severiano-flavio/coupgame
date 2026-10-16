import { describe, expect, it, vi } from 'vitest';
import { MatchTimers, phaseDuration, DEFAULT_TIMERS } from './match-timers.js';

describe('phaseDuration', () => {
  it('mapeia fases cronometradas e ignora as não cronometradas', () => {
    expect(phaseDuration('WAITING_ACTION', DEFAULT_TIMERS)).toBe(DEFAULT_TIMERS.action);
    expect(phaseDuration('ACTION_CHALLENGE', DEFAULT_TIMERS)).toBe(DEFAULT_TIMERS.reaction);
    expect(phaseDuration('INFLUENCE_SELECTION', DEFAULT_TIMERS)).toBe(DEFAULT_TIMERS.selection);
    expect(phaseDuration('RESOLVING', DEFAULT_TIMERS)).toBeNull();
    expect(phaseDuration('GAME_OVER', DEFAULT_TIMERS)).toBeNull();
  });
});

describe('MatchTimers', () => {
  it('agenda e dispara o callback na expiração, com deadline correto', () => {
    const scheduled: Array<{ fn: () => void; ms: number }> = [];
    const clock = 1000;
    const timers = new MatchTimers(
      DEFAULT_TIMERS,
      (fn, ms) => {
        scheduled.push({ fn, ms });
        return scheduled.length as unknown as ReturnType<typeof setTimeout>;
      },
      () => {},
      () => clock,
    );

    const onExpire = vi.fn();
    const deadline = timers.arm('ROOM1', 'WAITING_ACTION', onExpire);
    expect(deadline).toBe(clock + DEFAULT_TIMERS.action);
    expect(timers.deadlineFor('ROOM1')).toBe(clock + DEFAULT_TIMERS.action);
    expect(scheduled).toHaveLength(1);

    // dispara manualmente o agendado
    scheduled[0]!.fn();
    expect(onExpire).toHaveBeenCalledWith('WAITING_ACTION');
    expect(timers.deadlineFor('ROOM1')).toBeNull();
  });

  it('rearmar cancela o timer anterior', () => {
    const cancels: number[] = [];
    const timers = new MatchTimers(
      DEFAULT_TIMERS,
      () => 42 as unknown as ReturnType<typeof setTimeout>,
      (h) => cancels.push(h as unknown as number),
      () => 0,
    );
    timers.arm('R', 'WAITING_ACTION', () => {});
    timers.arm('R', 'ACTION_CHALLENGE', () => {});
    expect(cancels).toContain(42);
  });

  it('fases não cronometradas não agendam', () => {
    const timers = new MatchTimers();
    const d = timers.arm('R', 'RESOLVING', () => {});
    expect(d).toBeNull();
    timers.clearAll();
  });
});
