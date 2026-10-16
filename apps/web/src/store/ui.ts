import { create } from 'zustand';

/**
 * Estado APENAS de interface (ver constituição §9). Nunca contém estado de
 * jogo autoritativo — isso vem exclusivamente dos snapshots do servidor.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface UiState {
  connection: ConnectionStatus;
  onlineCount: number;
  animationsEnabled: boolean;
  cameraSensitivity: number; // multiplicador 0.2..2.0
  setConnection: (status: ConnectionStatus) => void;
  setOnlineCount: (n: number) => void;
  setAnimationsEnabled: (v: boolean) => void;
  setCameraSensitivity: (v: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  connection: 'connecting',
  onlineCount: 0,
  animationsEnabled: true,
  cameraSensitivity: 1,
  setConnection: (connection) => set({ connection }),
  setOnlineCount: (onlineCount) => set({ onlineCount }),
  setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
  setCameraSensitivity: (cameraSensitivity) => set({ cameraSensitivity }),
}));
