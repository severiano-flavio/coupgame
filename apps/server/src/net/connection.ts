import type { Server, Socket } from 'socket.io';
import {
  CLIENT_TO_SERVER,
  SERVER_TO_CLIENT,
  commandEnvelopeSchema,
  createRoomSchema,
  joinRoomSchema,
  reconnectSchema,
  setReadySchema,
  type RejectReason,
} from '@coup/shared';
import { RoomError, RoomManager } from '../rooms/room-manager.js';
import type { Room } from '../rooms/types.js';
import { GameHub, roomChannel } from './game-hub.js';
import { authorizeCommand } from './authorize.js';

/**
 * Registra os handlers de Socket.IO de uma conexão. Valida toda entrada com Zod
 * e autoriza antes de delegar à engine (constituição §4, §7). É a única camada,
 * com o GameHub, que fala Socket.IO.
 */
export function registerConnection(
  io: Server,
  socket: Socket,
  rooms: RoomManager,
  hub: GameHub,
): void {
  socket.on(CLIENT_TO_SERVER.createRoom, (raw: unknown) => {
    const parsed = createRoomSchema.safeParse(raw);
    if (!parsed.success) return emitError(socket, 'Dados inválidos para criar sala.');
    try {
      const { room, player } = rooms.createRoom(parsed.data.nickname);
      bindPlayerSocket(socket, room, player.id, player.token);
      rooms.attachSocket(room.code, player.id, socket.id);
      socket.emit(SERVER_TO_CLIENT.roomCreated, {
        roomCode: room.code,
        playerId: player.id,
        playerToken: player.token,
      });
      emitLobby(io, rooms, room);
    } catch (e) {
      handleRoomError(socket, e);
    }
  });

  socket.on(CLIENT_TO_SERVER.joinRoom, (raw: unknown) => {
    const parsed = joinRoomSchema.safeParse(raw);
    if (!parsed.success) return emitError(socket, 'Dados inválidos para entrar na sala.');
    try {
      const { room, player } = rooms.joinRoom(parsed.data.roomCode, parsed.data.nickname);
      bindPlayerSocket(socket, room, player.id, player.token);
      rooms.attachSocket(room.code, player.id, socket.id);
      socket.emit(SERVER_TO_CLIENT.roomJoined, {
        roomCode: room.code,
        playerId: player.id,
        playerToken: player.token,
      });
      emitLobby(io, rooms, room);
    } catch (e) {
      handleRoomError(socket, e);
    }
  });

  socket.on(CLIENT_TO_SERVER.setReady, (raw: unknown) => {
    const parsed = setReadySchema.safeParse(raw);
    if (!parsed.success) return emitError(socket, 'Dados inválidos.');
    const bound = getBound(socket);
    if (!bound) return emitError(socket, 'Você não está em uma sala.');
    try {
      const room = rooms.setReady(bound.roomCode, bound.playerId, parsed.data.ready);
      emitLobby(io, rooms, room);
    } catch (e) {
      handleRoomError(socket, e);
    }
  });

  socket.on(CLIENT_TO_SERVER.startGame, () => {
    const bound = getBound(socket);
    if (!bound) return emitError(socket, 'Você não está em uma sala.');
    try {
      const room = rooms.startGame(bound.roomCode, bound.playerId);
      hub.startSession(room);
      emitLobby(io, rooms, room);
    } catch (e) {
      handleRoomError(socket, e);
    }
  });

  socket.on(CLIENT_TO_SERVER.reconnect, (raw: unknown) => {
    const parsed = reconnectSchema.safeParse(raw);
    if (!parsed.success) return emitError(socket, 'Dados inválidos para reconexão.');
    try {
      const { room, player } = rooms.reconnect(parsed.data.roomCode, parsed.data.playerToken, socket.id);
      bindPlayerSocket(socket, room, player.id, player.token);
      if (room.phase === 'IN_GAME') {
        hub.resyncPlayer(room, player.id, socket.id);
      }
      emitLobby(io, rooms, room);
    } catch (e) {
      handleRoomError(socket, e);
    }
  });

  socket.on(CLIENT_TO_SERVER.command, (raw: unknown) => {
    const parsed = commandEnvelopeSchema.safeParse(raw);
    if (!parsed.success) {
      return emitRejected(socket, extractCommandId(raw), 'UNKNOWN', 'Comando malformado.');
    }
    const env = parsed.data;
    const bound = getBound(socket);
    if (!bound) return emitRejected(socket, env.commandId, 'NOT_AUTHORIZED', 'Sem identidade.');

    const room = rooms.getRoom(bound.roomCode);
    if (!room || room.phase !== 'IN_GAME' || !room.game) {
      return emitRejected(socket, env.commandId, 'INVALID_PHASE', 'Partida não ativa.');
    }
    if (env.matchId !== room.code) {
      return emitRejected(socket, env.commandId, 'NOT_AUTHORIZED', 'Partida incorreta.');
    }

    // Autorização de alto nível (fase/turno/janela) antes da engine.
    const auth = authorizeCommand(room.game, bound.playerId, env.cmd);
    if (!auth.ok) {
      return emitRejected(socket, env.commandId, auth.reason, auth.message);
    }

    const applied = hub.applyAndBroadcast(room, bound.playerId, env);
    if (!applied.ok) {
      emitRejected(socket, env.commandId, applied.reason ?? 'UNKNOWN', applied.message);
    }
  });

  socket.on('disconnect', () => {
    const result = rooms.markDisconnected(socket.id);
    if (result) {
      emitLobby(io, rooms, result.room);
      if (result.room.phase === 'IN_GAME') hub.broadcast(result.room);
    }
  });
}

/* -------------------------------- helpers --------------------------------- */

interface BoundIdentity {
  roomCode: string;
  playerId: string;
  playerToken: string;
}

function bindPlayerSocket(socket: Socket, room: Room, playerId: string, token: string): void {
  const data = socket.data as { bound?: BoundIdentity };
  data.bound = { roomCode: room.code, playerId, playerToken: token };
  socket.join(roomChannel(room.code));
}

function getBound(socket: Socket): BoundIdentity | undefined {
  return (socket.data as { bound?: BoundIdentity }).bound;
}

function emitLobby(io: Server, rooms: RoomManager, room: Room): void {
  io.to(roomChannel(room.code)).emit(SERVER_TO_CLIENT.lobbyState, rooms.toLobbyState(room));
}

function emitError(socket: Socket, message: string): void {
  socket.emit(SERVER_TO_CLIENT.error, { message });
}

function emitRejected(
  socket: Socket,
  commandId: string | undefined,
  reason: RejectReason,
  message?: string,
): void {
  socket.emit(SERVER_TO_CLIENT.commandRejected, { commandId: commandId ?? 'unknown', reason, message });
}

function extractCommandId(raw: unknown): string | undefined {
  if (raw && typeof raw === 'object' && 'commandId' in raw) {
    const v = (raw as { commandId?: unknown }).commandId;
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
}

function handleRoomError(socket: Socket, e: unknown): void {
  if (e instanceof RoomError) {
    emitError(socket, e.message);
  } else {
    emitError(socket, 'Erro interno ao processar a solicitação.');
  }
}
