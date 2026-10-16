import { useMemo } from 'react';
import type { JSX } from 'react';
import { useConnection } from './net/useConnection.js';
import { useMatch } from './net/useMatch.js';
import { useGameStore } from './store/game.js';
import { Home } from './pages/Home.js';
import { Lobby } from './pages/Lobby.js';
import { GamePage } from './pages/GamePage.js';

/**
 * Roteamento simples baseado no estado de jogo:
 * - sem identidade/lobby → Home
 * - em LOBBY → Lobby
 * - com publicState → GamePage
 */
export function App(): JSX.Element {
  useConnection();
  useMatch();

  const identity = useGameStore((s) => s.identity);
  const lobby = useGameStore((s) => s.lobby);
  const publicState = useGameStore((s) => s.publicState);
  const privateState = useGameStore((s) => s.privateState);
  const timer = useGameStore((s) => s.timer);

  const initialRoomCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sala') ?? undefined;
  }, []);

  // Em jogo (há estado público e identidade).
  if (publicState && identity) {
    return <GamePage pub={publicState} priv={privateState} timer={timer} localPlayerId={identity.playerId} />;
  }

  // No lobby.
  if (lobby && identity) {
    return <Lobby lobby={lobby} myPlayerId={identity.playerId} />;
  }

  // Tela inicial.
  return <Home initialRoomCode={initialRoomCode} />;
}
