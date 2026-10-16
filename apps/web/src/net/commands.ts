import {
  CLIENT_TO_SERVER,
  type ActionType,
  type CharacterType,
  type CommandEnvelope,
  type GameCommand,
} from '@coup/shared';
import { getSocket } from './socket.js';
import { useGameStore } from '../store/game.js';

/**
 * Envio de intenções ao servidor. O cliente nunca decide resultado: apenas
 * emite comandos com envelope (matchId, stateVersion, commandId único).
 */
function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback simples (ambientes sem crypto.randomUUID).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sendCommand(cmd: GameCommand): void {
  const { identity, publicState } = useGameStore.getState();
  if (!identity || !publicState) return;
  const env: CommandEnvelope = {
    matchId: identity.roomCode,
    stateVersion: publicState.stateVersion,
    commandId: uuid(),
    cmd,
  };
  getSocket().emit(CLIENT_TO_SERVER.command, env);
}

/* Atalhos tipados para o HUD */

export function declareAction(action: ActionType, targetId?: string): void {
  sendCommand({ type: 'DECLARE_ACTION', action, targetId });
}
export function challenge(): void {
  sendCommand({ type: 'CHALLENGE' });
}
export function block(character: CharacterType): void {
  sendCommand({ type: 'BLOCK', character });
}
export function pass(): void {
  sendCommand({ type: 'PASS' });
}
export function selectInfluence(cardId: string): void {
  sendCommand({ type: 'SELECT_INFLUENCE', cardId });
}
export function selectExchange(cardIds: string[]): void {
  sendCommand({ type: 'SELECT_EXCHANGE', cardIds });
}

/* Comandos de sala */

export function createRoom(nickname: string): void {
  getSocket().emit(CLIENT_TO_SERVER.createRoom, { nickname });
}
export function joinRoom(roomCode: string, nickname: string): void {
  getSocket().emit(CLIENT_TO_SERVER.joinRoom, { roomCode, nickname });
}
export function setReady(ready: boolean): void {
  getSocket().emit(CLIENT_TO_SERVER.setReady, { ready });
}
export function startGame(): void {
  getSocket().emit(CLIENT_TO_SERVER.startGame, {});
}
export function reconnectToRoom(roomCode: string, playerToken: string): void {
  getSocket().emit(CLIENT_TO_SERVER.reconnect, { roomCode, playerToken });
}
