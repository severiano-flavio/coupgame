import { create } from 'zustand';
import type {
  CommandRejected,
  LobbyState,
  PrivatePlayerState,
  PublicLogEntry,
  PublicState,
  TimerState,
} from '@coup/shared';

/**
 * Estado de JOGO no cliente — espelho dos snapshots do servidor (a verdade é
 * sempre do servidor; aqui só armazenamos o que ele envia). Separado do store
 * de UI (ver constituição §9).
 */
export interface Identity {
  roomCode: string;
  playerId: string;
  playerToken: string;
}

interface GameState {
  identity: Identity | null;
  lobby: LobbyState | null;
  publicState: PublicState | null;
  privateState: PrivatePlayerState | null;
  timer: TimerState | null;
  lastRejection: CommandRejected | null;
  events: PublicLogEntry[];

  setIdentity: (id: Identity | null) => void;
  setLobby: (l: LobbyState) => void;
  setPublicState: (s: PublicState) => void;
  setPrivateState: (s: PrivatePlayerState) => void;
  setTimer: (t: TimerState) => void;
  setRejection: (r: CommandRejected | null) => void;
  pushEvent: (e: PublicLogEntry) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  identity: null,
  lobby: null,
  publicState: null,
  privateState: null,
  timer: null,
  lastRejection: null,
  events: [],

  setIdentity: (identity) => set({ identity }),
  setLobby: (lobby) => set({ lobby }),
  setPublicState: (publicState) => set({ publicState }),
  setPrivateState: (privateState) => set({ privateState }),
  setTimer: (timer) => set({ timer }),
  setRejection: (lastRejection) => set({ lastRejection }),
  pushEvent: (e) => set((s) => ({ events: [...s.events.slice(-49), e] })),
  reset: () =>
    set({
      lobby: null,
      publicState: null,
      privateState: null,
      timer: null,
      lastRejection: null,
      events: [],
    }),
}));
