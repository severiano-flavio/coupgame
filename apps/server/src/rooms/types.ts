import type { InternalState } from '../engine/index.js';

/** Jogador no contexto de uma sala (identidade + conexão). */
export interface RoomPlayer {
  id: string;
  name: string;
  token: string; // segredo de sessão para reconexão (não exposto a terceiros)
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  /** socketId atual (ou null se desconectado). */
  socketId: string | null;
  /** epoch ms da desconexão, para política de tolerância/desistência. */
  disconnectedAt: number | null;
}

export type RoomPhase = 'LOBBY' | 'IN_GAME' | 'FINISHED';

export interface Room {
  code: string;
  phase: RoomPhase;
  players: Map<string, RoomPlayer>; // id -> player
  /** Ordem de entrada (para exibição no lobby). */
  joinOrder: string[];
  /** Estado da engine quando a partida inicia. */
  game: InternalState | null;
  createdAt: number;
}
