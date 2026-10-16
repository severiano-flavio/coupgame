import type { JSX } from 'react';
import type { PrivatePlayerState, PublicState, TimerState } from '@coup/shared';
import { GameScene } from '../scene/GameScene.js';
import { ActionBar } from '../ui/ActionBar.js';
import { ReactionPrompt } from '../ui/ReactionPrompt.js';
import { InfluenceLossModal } from '../ui/InfluenceLossModal.js';
import { ExchangeModal } from '../ui/ExchangeModal.js';
import { StatusBar } from '../ui/StatusBar.js';
import { GameLog } from '../ui/GameLog.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';
import { ConnectionBanner } from '../ui/ConnectionBanner.js';
import { MyHand } from '../ui/MyHand.js';
import { mustExchange, mustSelectInfluence } from '../game/selectors.js';
import { useGameStore } from '../store/game.js';

interface GamePageProps {
  pub: PublicState;
  priv: PrivatePlayerState | null;
  timer: TimerState | null;
  localPlayerId: string;
}

/**
 * Página de jogo: integra a cena 3D (fundo) e o HUD HTML sobreposto. Todas as
 * interações críticas estão no HUD, então o jogo é jogável mesmo sem animações
 * ou sem interagir com objetos 3D (requirements §9).
 */
export function GamePage({ pub, priv, timer, localPlayerId }: GamePageProps): JSX.Element {
  const events = useGameStore((s) => s.events);

  const showLoss = mustSelectInfluence(pub, localPlayerId) && priv;
  const showExchange = mustExchange(pub, localPlayerId) && priv?.exchangeOffer;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <GameScene pub={pub} priv={priv} localPlayerId={localPlayerId} />
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
        {/* Topo */}
        <div className="flex items-start justify-between gap-4">
          <div className="pointer-events-auto w-72">
            <ConnectionBanner />
          </div>
          <StatusBar pub={pub} localPlayerId={localPlayerId} />
          <div className="pointer-events-auto">
            <SettingsPanel />
          </div>
        </div>

        {/* Base */}
        <div className="flex items-end justify-between gap-4">
          <div className="pointer-events-auto">
            <GameLog entries={events} />
          </div>
          <div className="pointer-events-auto flex max-w-xl flex-col items-center gap-3">
            <ReactionPrompt pub={pub} localPlayerId={localPlayerId} timer={timer} />
            <ActionBar pub={pub} localPlayerId={localPlayerId} />
            {priv && <MyHand priv={priv} />}
          </div>
          <div className="w-72" />
        </div>
      </div>

      {showLoss && priv && <InfluenceLossModal priv={priv} />}
      {showExchange && priv && <ExchangeModal priv={priv} timer={timer} />}
    </div>
  );
}
