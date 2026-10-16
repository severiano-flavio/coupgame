import { useMemo } from 'react';
import type { JSX } from 'react';
import { Canvas } from '@react-three/fiber';
import type { PrivatePlayerState, PublicState } from '@coup/shared';
import { Table } from './Table.js';
import { PlayerSeat } from './PlayerSeat.js';
import { computeRelativeSeats } from './relativeSeating.js';
import { SeatCamera } from '../camera/SeatCamera.js';

interface GameSceneProps {
  pub: PublicState;
  priv: PrivatePlayerState | null;
  localPlayerId: string;
  /** Alvos selecionáveis por clique (ids). */
  selectableTargets?: string[];
  onPickTarget?: (id: string) => void;
}

/**
 * Cena 3D da partida: mesa, assentos derivados do estado público, câmera fixa
 * no assento do jogador local. A seleção de alvo por clique é opcional e não
 * interfere na seleção via HUD (requirements §9).
 */
export function GameScene({
  pub,
  priv,
  localPlayerId,
  selectableTargets = [],
  onPickTarget,
}: GameSceneProps): JSX.Element {
  const players = pub.players;
  const localIndex = Math.max(
    0,
    players.findIndex((p) => p.id === localPlayerId),
  );
  const seats = useMemo(
    () => computeRelativeSeats(players.length, localIndex),
    [players.length, localIndex],
  );
  const localSeat = seats[0]!; // rel 0 = jogador local

  return (
    <Canvas shadows camera={{ fov: 55, near: 0.1, far: 100 }} gl={{ antialias: true }} className="h-full w-full">
      <color attach="background" args={['#140d07']} />
      <fog attach="fog" args={['#140d07', 9, 24]} />

      <ambientLight intensity={0.4} />
      <spotLight
        position={[0, 6, 0]}
        angle={0.9}
        penumbra={0.6}
        intensity={140}
        distance={30}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[12, 48]} />
        <meshStandardMaterial color="#120b06" roughness={1} />
      </mesh>

      <Table />

      {players.map((player, i) => {
        const rel = (i - localIndex + players.length) % players.length;
        const layout = seats[rel]!;
        const isLocal = player.id === localPlayerId;
        return (
          <PlayerSeat
            key={player.id}
            player={player}
            layout={layout}
            isLocal={isLocal}
            isCurrent={pub.currentPlayerId === player.id}
            ownHand={isLocal ? (priv?.hand ?? undefined) : undefined}
            selectable={selectableTargets.includes(player.id)}
            onSelect={() => onPickTarget?.(player.id)}
          />
        );
      })}

      {/* Olha para o tampo da mesa à frente do assento (visão sentada p/ baixo) */}
      <SeatCamera headPosition={localSeat.headPosition} lookAt={[0, 0.95, 0]} />
    </Canvas>
  );
}
