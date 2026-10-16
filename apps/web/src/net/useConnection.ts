import { useEffect } from 'react';
import { getSocket } from './socket.js';
import { useUiStore } from '../store/ui.js';

/**
 * Liga o ciclo de vida do socket ao estado de UI (status de conexão e
 * contador de presença da Etapa 1).
 */
export function useConnection(): void {
  const setConnection = useUiStore((s) => s.setConnection);
  const setOnlineCount = useUiStore((s) => s.setOnlineCount);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = (): void => setConnection('connected');
    const onDisconnect = (): void => setConnection('disconnected');
    const onPresence = (payload: { online: number }): void => setOnlineCount(payload.online);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence', onPresence);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence', onPresence);
    };
  }, [setConnection, setOnlineCount]);
}
