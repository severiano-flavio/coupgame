import { useMemo } from 'react';
import type { JSX } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { CharacterType, PublicPlayer } from '@coup/shared';
import { Card } from './Card.js';
import { Coins } from './Coins.js';
import { TurnRing } from './TurnRing.js';
import type { SeatLayout } from './relativeSeating.js';

interface PlayerSeatProps {
  player: PublicPlayer;
  layout: SeatLayout;
  isLocal: boolean;
  isCurrent: boolean;
  /** Cartas da mão própria (apenas para o jogador local). */
  ownHand?: { cardId: string; character: CharacterType; lost: boolean }[];
  selectable?: boolean;
  onSelect?: () => void;
}

/**
 * Renderiza um jogador no seu assento: avatar simples, rótulo com nome/moedas,
 * cartas (próprias legíveis; adversárias viradas; perdidas marcadas) e pilha de
 * moedas. O destaque do jogador da vez é discreto (anel luminoso).
 */
export function PlayerSeat({
  player,
  layout,
  isLocal,
  isCurrent,
  ownHand,
  selectable = false,
  onSelect,
}: PlayerSeatProps): JSX.Element {
  const avatarMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: player.eliminated ? '#52525b' : isLocal ? '#b45309' : '#8a5a2b',
        roughness: 0.8,
      }),
    [player.eliminated, isLocal],
  );

  // Determina a representação das cartas no tampo, à frente do assento.
  const cards = buildCards(player, ownHand, isLocal);

  return (
    <group position={layout.position} rotation={[0, layout.faceCenterYaw, 0]}>
      {/* Avatar: corpo + cabeça */}
      <group
        onClick={selectable ? (e) => { e.stopPropagation(); onSelect?.(); } : undefined}
      >
        <mesh position={[0, 1.25, 0]} castShadow material={avatarMat}>
          <sphereGeometry args={[0.18, 16, 16]} />
        </mesh>
        <mesh position={[0, 0.85, 0]} castShadow material={avatarMat}>
          <cylinderGeometry args={[0.22, 0.28, 0.6, 16]} />
        </mesh>
      </group>

      {/* Anel de destaque do jogador da vez (pulsa se animações ativas) */}
      {isCurrent && !player.eliminated && <TurnRing />}

      {/* Rótulo nome + moedas (sempre legível, de frente ao centro) */}
      <Text
        position={[0, 1.7, 0]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.13}
        color={player.eliminated ? '#a1a1aa' : '#fde68a'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor="#000000"
      >
        {`${player.name}${player.eliminated ? ' (eliminado)' : ''}\n${player.coins} moedas`}
      </Text>

      {/* Cartas sobre o tampo. As do jogador local ficam levemente eretas e
          voltadas a ele; as dos adversários deitadas (verso visível). A
          legibilidade garantida é o painel HTML "Suas cartas" (requirements §9). */}
      <group
        position={[0, 1.04, isLocal ? 0.7 : 0.55]}
        rotation={isLocal ? [-Math.PI / 2 + 0.5, Math.PI, 0] : [-Math.PI / 2, 0, 0]}
      >
        {cards.map((c, i) => (
          <Card
            key={c.key}
            position={[(i - (cards.length - 1) / 2) * 0.38, 0, 0]}
            character={c.character}
            faceUp={c.faceUp}
            lost={c.lost}
          />
        ))}
      </group>

      {/* Moedas ao lado */}
      <Coins count={player.coins} position={[0.6, 1.0, 0.4]} />
    </group>
  );
}

interface RenderedCard {
  key: string;
  character?: CharacterType;
  faceUp: boolean;
  lost: boolean;
}

function buildCards(
  player: PublicPlayer,
  ownHand: PlayerSeatProps['ownHand'],
  isLocal: boolean,
): RenderedCard[] {
  if (isLocal && ownHand) {
    // Jogador local: mostra todas as suas cartas de frente (perdidas marcadas).
    return ownHand.map((c) => ({
      key: c.cardId,
      character: c.character,
      faceUp: true,
      lost: c.lost,
    }));
  }

  // Adversário: cartas reveladas (perdidas) de frente; ativas viradas p/ baixo.
  const revealed: RenderedCard[] = player.revealed.map((ch, i) => ({
    key: `rev-${player.id}-${i}`,
    character: ch,
    faceUp: true,
    lost: true,
  }));
  const hidden: RenderedCard[] = Array.from({ length: player.influenceCount }, (_, i) => ({
    key: `hid-${player.id}-${i}`,
    faceUp: false,
    lost: false,
  }));
  return [...hidden, ...revealed];
}
