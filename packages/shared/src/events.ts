import type { LobbyState, PrivatePlayerState, PublicLogEntry, PublicState, TimerState } from './snapshots.js';

/**
 * Nomes dos eventos de transporte (Socket.IO). Centralizados para evitar
 * strings mágicas divergentes entre cliente e servidor.
 */
export const CLIENT_TO_SERVER = {
  createRoom: 'createRoom',
  joinRoom: 'joinRoom',
  setReady: 'setReady',
  startGame: 'startGame',
  reconnect: 'reconnect',
  command: 'command',
} as const;

export const SERVER_TO_CLIENT = {
  lobbyState: 'lobbyState',
  publicState: 'publicState',
  privateState: 'privateState',
  gameEvent: 'gameEvent',
  timer: 'timer',
  commandRejected: 'commandRejected',
  roomCreated: 'roomCreated',
  roomJoined: 'roomJoined',
  error: 'error',
} as const;

/** Motivos tipados de rejeição. Ver docs/multiplayer-protocol.md §8. */
export const REJECT_REASONS = [
  'NOT_YOUR_TURN',
  'INVALID_PHASE',
  'NOT_AUTHORIZED',
  'INVALID_TARGET',
  'INSUFFICIENT_COINS',
  'MUST_COUP',
  'STALE_STATE',
  'DUPLICATE_COMMAND',
  'WINDOW_CLOSED',
  'INVALID_SELECTION',
  'UNKNOWN',
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

export interface CommandRejected {
  commandId: string;
  reason: RejectReason;
  message?: string;
}

/** Identidade retornada ao criar/entrar numa sala. */
export interface RoomIdentity {
  roomCode: string;
  playerId: string;
  playerToken: string;
}

/** Mapa de payloads emitidos pelo servidor (documentação de contrato). */
export interface ServerToClientPayloads {
  lobbyState: LobbyState;
  publicState: PublicState;
  privateState: PrivatePlayerState;
  gameEvent: PublicLogEntry;
  timer: TimerState;
  commandRejected: CommandRejected;
  roomCreated: RoomIdentity;
  roomJoined: RoomIdentity;
  error: { message: string };
}
