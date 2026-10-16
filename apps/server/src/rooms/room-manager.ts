import { randomUUID } from 'node:crypto';
import type { LobbyState } from '@coup/shared';
import {
  createMatch,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Rng,
  type SeatAssignment,
} from '../engine/index.js';
import type { Room, RoomPlayer } from './types.js';

/**
 * Gerencia o ciclo de vida das salas (em memória no MVP). Lógica pura de sala,
 * independente do transporte — o handler de rede a utiliza. Ver
 * docs/architecture.md §2 (rooms) e requirements §1.
 */
export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly rng: Rng;
  private readonly now: () => number;

  constructor(opts: { rng: Rng; now?: () => number }) {
    this.rng = opts.rng;
    this.now = opts.now ?? (() => Date.now());
  }

  /* ------------------------------- criação ------------------------------- */

  createRoom(nickname: string): { room: Room; player: RoomPlayer } {
    const code = this.generateUniqueCode();
    const room: Room = {
      code,
      phase: 'LOBBY',
      players: new Map(),
      joinOrder: [],
      game: null,
      createdAt: this.now(),
    };
    const player = this.makePlayer(nickname, true);
    room.players.set(player.id, player);
    room.joinOrder.push(player.id);
    this.rooms.set(code, room);
    return { room, player };
  }

  joinRoom(code: string, nickname: string): { room: Room; player: RoomPlayer } {
    const room = this.getRoom(code);
    if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Sala não encontrada.');
    if (room.phase !== 'LOBBY') {
      throw new RoomError('GAME_STARTED', 'A partida já começou.');
    }
    if (room.players.size >= MAX_PLAYERS) {
      throw new RoomError('ROOM_FULL', 'Sala cheia.');
    }
    const player = this.makePlayer(nickname, false);
    room.players.set(player.id, player);
    room.joinOrder.push(player.id);
    return { room, player };
  }

  /* -------------------------------- lobby -------------------------------- */

  setReady(code: string, playerId: string, ready: boolean): Room {
    const room = this.requireRoom(code);
    const player = room.players.get(playerId);
    if (!player) throw new RoomError('NOT_IN_ROOM', 'Jogador não está na sala.');
    player.ready = ready;
    return room;
  }

  canStart(room: Room): boolean {
    const n = room.players.size;
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) return false;
    return [...room.players.values()].every((p) => p.ready);
  }

  startGame(code: string, requesterId: string): Room {
    const room = this.requireRoom(code);
    const requester = room.players.get(requesterId);
    if (!requester?.isHost) throw new RoomError('NOT_HOST', 'Apenas o anfitrião inicia.');
    if (room.phase !== 'LOBBY') throw new RoomError('GAME_STARTED', 'A partida já começou.');
    if (!this.canStart(room)) {
      throw new RoomError('CANNOT_START', 'São necessários de 3 a 6 jogadores prontos.');
    }
    const seats: SeatAssignment[] = room.joinOrder.map((id) => {
      const p = room.players.get(id)!;
      return { id: p.id, name: p.name };
    });
    room.game = createMatch(code, seats, this.rng);
    room.phase = 'IN_GAME';
    return room;
  }

  /* ----------------------------- reconexão ------------------------------- */

  /** Reassocia um socket a um jogador por token. */
  reconnect(code: string, token: string, socketId: string): { room: Room; player: RoomPlayer } {
    const room = this.requireRoom(code);
    const player = [...room.players.values()].find((p) => p.token === token);
    if (!player) throw new RoomError('BAD_TOKEN', 'Token inválido para esta sala.');
    player.connected = true;
    player.socketId = socketId;
    player.disconnectedAt = null;
    if (room.game) {
      const gp = room.game.players[player.id];
      if (gp) gp.connected = true;
    }
    return { room, player };
  }

  attachSocket(code: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(code);
    const player = room?.players.get(playerId);
    if (player) {
      player.socketId = socketId;
      player.connected = true;
      player.disconnectedAt = null;
    }
  }

  /** Marca um jogador como desconectado (socket caiu). */
  markDisconnected(socketId: string): { room: Room; player: RoomPlayer } | null {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.socketId === socketId) {
          player.connected = false;
          player.socketId = null;
          player.disconnectedAt = this.now();
          if (room.game) {
            const gp = room.game.players[player.id];
            if (gp) gp.connected = false;
          }
          return { room, player };
        }
      }
    }
    return null;
  }

  /* -------------------------------- consultas ---------------------------- */

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  requireRoom(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Sala não encontrada.');
    return room;
  }

  findRoomBySocket(socketId: string): { room: Room; player: RoomPlayer } | null {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.socketId === socketId) return { room, player };
      }
    }
    return null;
  }

  toLobbyState(room: Room): LobbyState {
    return {
      roomCode: room.code,
      players: room.joinOrder
        .map((id) => room.players.get(id))
        .filter((p): p is RoomPlayer => !!p)
        .map((p) => ({
          id: p.id,
          name: p.name,
          ready: p.ready,
          connected: p.connected,
          isHost: p.isHost,
        })),
      canStart: this.canStart(room),
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
    };
  }

  removeRoom(code: string): void {
    this.rooms.delete(code);
  }

  /* -------------------------------- helpers ------------------------------ */

  private makePlayer(nickname: string, isHost: boolean): RoomPlayer {
    return {
      id: `p_${randomUUID().slice(0, 8)}`,
      name: nickname.trim().slice(0, 24) || 'Convidado',
      token: randomUUID(),
      ready: false,
      connected: true,
      isHost,
      socketId: null,
      disconnectedAt: null,
    };
  }

  private generateUniqueCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += alphabet[Math.floor(this.rng() * alphabet.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new RoomError('CODE_COLLISION', 'Não foi possível gerar um código de sala.');
  }
}

export type RoomErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'GAME_STARTED'
  | 'ROOM_FULL'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'CANNOT_START'
  | 'BAD_TOKEN'
  | 'CODE_COLLISION';

export class RoomError extends Error {
  constructor(
    public readonly code: RoomErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RoomError';
  }
}
