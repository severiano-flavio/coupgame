import { useEffect } from 'react';
import {
  SERVER_TO_CLIENT,
  type CommandRejected,
  type LobbyState,
  type PrivatePlayerState,
  type PublicLogEntry,
  type PublicState,
  type RoomIdentity,
  type TimerState,
} from '@coup/shared';
import { getSocket } from './socket.js';
import { reconnectToRoom } from './commands.js';
import { clearIdentity, loadIdentity, saveIdentity } from './session.js';
import { useGameStore } from '../store/game.js';

/**
 * Assina os eventos do servidor e popula o store de jogo. Captura identidade
 * ao criar/entrar e tenta reconexão automática a partir do sessionStorage.
 * Atualiza o estado React uma vez por mensagem (sem re-render por frame).
 */
export function useMatch(): void {
  useEffect(() => {
    const socket = getSocket();
    const store = useGameStore.getState();

    const onIdentity = (payload: RoomIdentity): void => {
      const identity = {
        roomCode: payload.roomCode,
        playerId: payload.playerId,
        playerToken: payload.playerToken,
      };
      store.setIdentity(identity);
      saveIdentity(identity);
    };
    const onLobby = (s: LobbyState): void => store.setLobby(s);
    const onPublic = (s: PublicState): void => store.setPublicState(s);
    const onPrivate = (s: PrivatePlayerState): void => store.setPrivateState(s);
    const onTimer = (t: TimerState): void => store.setTimer(t);
    const onEvent = (e: PublicLogEntry): void => store.pushEvent(e);
    const onRejected = (r: CommandRejected): void => store.setRejection(r);

    const onConnect = (): void => {
      // Tenta reconectar à sala salva (se houver) ao (re)conectar.
      const saved = loadIdentity();
      if (saved) reconnectToRoom(saved.roomCode, saved.playerToken);
    };

    socket.on(SERVER_TO_CLIENT.roomCreated, onIdentity);
    socket.on(SERVER_TO_CLIENT.roomJoined, onIdentity);
    socket.on(SERVER_TO_CLIENT.lobbyState, onLobby);
    socket.on(SERVER_TO_CLIENT.publicState, onPublic);
    socket.on(SERVER_TO_CLIENT.privateState, onPrivate);
    socket.on(SERVER_TO_CLIENT.timer, onTimer);
    socket.on(SERVER_TO_CLIENT.gameEvent, onEvent);
    socket.on(SERVER_TO_CLIENT.commandRejected, onRejected);
    socket.on('connect', onConnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off(SERVER_TO_CLIENT.roomCreated, onIdentity);
      socket.off(SERVER_TO_CLIENT.roomJoined, onIdentity);
      socket.off(SERVER_TO_CLIENT.lobbyState, onLobby);
      socket.off(SERVER_TO_CLIENT.publicState, onPublic);
      socket.off(SERVER_TO_CLIENT.privateState, onPrivate);
      socket.off(SERVER_TO_CLIENT.timer, onTimer);
      socket.off(SERVER_TO_CLIENT.gameEvent, onEvent);
      socket.off(SERVER_TO_CLIENT.commandRejected, onRejected);
      socket.off('connect', onConnect);
    };
  }, []);
}

/** Limpa a sessão (sair da sala). */
export function leaveMatch(): void {
  clearIdentity();
  useGameStore.getState().setIdentity(null);
  useGameStore.getState().reset();
}
