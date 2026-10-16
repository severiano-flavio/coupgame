import type { Server } from 'socket.io';
import {
  SERVER_TO_CLIENT,
  type Phase,
  type RejectReason,
} from '@coup/shared';
import {
  applyTimeout,
  defaultRng,
  type EngineCtx,
  type InternalState,
  type Rng,
} from '../engine/index.js';
import { GameSession } from '../rooms/game-session.js';
import type { Room } from '../rooms/types.js';
import { toPrivateState, toPublicState } from '../snapshots/project.js';
import { MatchTimers, type TimerConfig } from '../timers/match-timers.js';

/**
 * Orquestra a difusão de estado por sala: mantém a GameSession, projeta
 * snapshots público/privado, dispara eventos e integra os temporizadores.
 * Única camada (com os handlers) que fala Socket.IO no servidor.
 */
export class GameHub {
  private readonly sessions = new Map<string, GameSession>();
  private readonly timers: MatchTimers;
  private readonly rng: Rng;
  private readonly now: () => number;

  constructor(
    private readonly io: Server,
    opts: { rng?: Rng; now?: () => number; timers?: TimerConfig } = {},
  ) {
    this.rng = opts.rng ?? defaultRng;
    this.now = opts.now ?? (() => Date.now());
    this.timers = new MatchTimers(opts.timers);
  }

  /** Inicia a sessão de jogo de uma sala recém-iniciada. */
  startSession(room: Room): void {
    if (!room.game) return;
    const session = new GameSession(room.game);
    this.sessions.set(room.code, session);
    this.broadcast(room);
    this.armTimer(room);
  }

  getSession(code: string): GameSession | undefined {
    return this.sessions.get(code);
  }

  /** Aplica um comando já autenticado e difunde o resultado. */
  applyAndBroadcast(
    room: Room,
    actorId: string,
    env: Parameters<GameSession['apply']>[1],
  ): { ok: boolean; reason?: RejectReason; message?: string } {
    const session = this.sessions.get(room.code);
    if (!session) return { ok: false, reason: 'INVALID_PHASE', message: 'Partida não iniciada.' };

    const ctx: EngineCtx = { rng: this.rng, now: this.now() };
    const outcome = session.apply(actorId, env, ctx);
    if (!outcome.ok) {
      return { ok: false, reason: outcome.reason, message: outcome.message };
    }
    room.game = session.getState();
    this.broadcast(room, outcome.events);
    this.armTimer(room);
    return { ok: true };
  }

  /** Projeta e difunde o estado público a todos e o privado a cada dono. */
  broadcast(room: Room, events: { t: number; kind: string; text: string }[] = []): void {
    const state = this.sessions.get(room.code)?.getState() ?? room.game;
    if (!state) return;

    const pub = toPublicState(state);
    this.io.to(roomChannel(room.code)).emit(SERVER_TO_CLIENT.publicState, pub);

    for (const player of room.players.values()) {
      if (player.socketId) {
        const priv = toPrivateState(state, player.id);
        this.io.to(player.socketId).emit(SERVER_TO_CLIENT.privateState, priv);
      }
    }

    for (const ev of events) {
      this.io.to(roomChannel(room.code)).emit(SERVER_TO_CLIENT.gameEvent, ev);
    }
  }

  /** Reenvia o estado atual a um único jogador (reconexão). */
  resyncPlayer(room: Room, playerId: string, socketId: string): void {
    const state = this.sessions.get(room.code)?.getState() ?? room.game;
    if (!state) return;
    this.io.to(socketId).emit(SERVER_TO_CLIENT.publicState, toPublicState(state));
    this.io.to(socketId).emit(SERVER_TO_CLIENT.privateState, toPrivateState(state, playerId));
    this.emitTimer(room, socketId);
  }

  /* ------------------------------- timers -------------------------------- */

  private armTimer(room: Room): void {
    const state = this.sessions.get(room.code)?.getState();
    if (!state) return;
    this.timers.arm(room.code, state.phase, (phase) => this.onTimeout(room, phase));
    this.emitTimer(room);
  }

  private emitTimer(room: Room, socketId?: string): void {
    const state = this.sessions.get(room.code)?.getState() ?? room.game;
    if (!state) return;
    const payload = { phase: state.phase, deadline: this.timers.deadlineFor(room.code) };
    if (socketId) this.io.to(socketId).emit(SERVER_TO_CLIENT.timer, payload);
    else this.io.to(roomChannel(room.code)).emit(SERVER_TO_CLIENT.timer, payload);
  }

  private onTimeout(room: Room, phase: Phase): void {
    const session = this.sessions.get(room.code);
    if (!session) return;
    const state = session.getState();
    if (state.phase !== phase) return; // fase já mudou; ignora timeout obsoleto

    const ctx: EngineCtx = { rng: this.rng, now: this.now() };
    const result = applyTimeout(state, phase, ctx);
    if (result.ok) {
      session.applyTimeoutState(result.state);
      room.game = result.state;
      this.broadcast(room, result.events);
      this.armTimer(room);
    }
  }

  /** Encerra e limpa a sessão de uma sala. */
  endSession(code: string): void {
    this.timers.clear(code);
    this.sessions.delete(code);
  }

  dispose(): void {
    this.timers.clearAll();
    this.sessions.clear();
  }
}

export function roomChannel(code: string): string {
  return `room:${code}`;
}

/** Reexport para conveniência de tipagem no handler. */
export type { InternalState };
