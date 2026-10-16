import type { ActionType } from './actions.js';
import type { CharacterType } from './cards.js';
import type { Phase } from './phases.js';

/**
 * Projeções de estado enviadas aos clientes. Ver docs/architecture.md §5 e
 * docs/multiplayer-protocol.md §7. NUNCA incluir informação oculta no público.
 */

export interface PublicLogEntry {
  t: number; // epoch ms
  kind: string; // ex.: 'DECLARE' | 'BLOCK' | 'CHALLENGE' | 'LOSE' | 'COINS' | 'GAME_OVER'
  text: string; // texto em pt-BR já pronto para exibição
}

export interface PublicPlayer {
  id: string;
  name: string;
  seat: number;
  coins: number;
  influenceCount: number; // nº de cartas ativas
  revealed: CharacterType[]; // cartas perdidas (públicas)
  connected: boolean;
  eliminated: boolean;
}

export interface PublicState {
  matchId: string;
  stateVersion: number;
  phase: Phase;
  currentPlayerId: string | null;
  pendingAction?: { action: ActionType; byPlayerId: string; targetId?: string };
  pendingBlock?: { character: CharacterType; byPlayerId: string };
  /** Jogadores com reação pendente na janela atual (contestar/bloquear/passar). */
  awaitingReactionFrom: string[];
  /** Jogador que deve selecionar influência a perder, se houver. */
  awaitingLossFrom: string | null;
  players: PublicPlayer[];
  deckCount: number;
  winnerId?: string;
  log: PublicLogEntry[];
}

/** Carta privada do próprio jogador (identidade revelada só a ele). */
export interface PrivateCard {
  cardId: string; // opaco e estável
  character: CharacterType;
  lost: boolean;
}

export interface PrivatePlayerState {
  matchId: string;
  stateVersion: number;
  playerId: string;
  hand: PrivateCard[];
  /** Cartas oferecidas durante EXCHANGE_SELECTION do próprio jogador. */
  exchangeOffer: PrivateCard[] | null;
}

export interface TimerState {
  phase: Phase;
  deadline: number | null; // epoch ms absoluto do servidor
}

/** Estado de lobby antes do início da partida. */
export interface LobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface LobbyState {
  roomCode: string;
  players: LobbyPlayer[];
  canStart: boolean;
  minPlayers: number;
  maxPlayers: number;
}
