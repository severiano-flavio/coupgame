import type { JSX } from 'react';
import { Text } from '@react-three/drei';
import { CHARACTER_LABELS, type CharacterType } from '@coup/shared';
import { CARD_BACK_COLOR, CARD_LOST_COLOR, CHARACTER_COLOR } from './cardColors.js';

interface CardProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Personagem a mostrar na face. undefined = carta virada para baixo. */
  character?: CharacterType;
  /** Carta perdida (revelada e inativa). */
  lost?: boolean;
  faceUp: boolean;
}

const CARD_W = 0.32;
const CARD_H = 0.46;

/**
 * Carta 3D procedural. Face para cima mostra o personagem (cor + rótulo);
 * para baixo mostra o verso. Perdidas aparecem acinzentadas e inclinadas.
 * O texto garante legibilidade (acessibilidade visual) sem depender de assets.
 */
export function Card({ position, rotation = [0, 0, 0], character, lost = false, faceUp }: CardProps): JSX.Element {
  const faceColor = lost
    ? CARD_LOST_COLOR
    : faceUp && character
      ? CHARACTER_COLOR[character]
      : CARD_BACK_COLOR;

  const label = faceUp && character ? CHARACTER_LABELS[character] : '';

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[CARD_W, CARD_H, 0.02]} />
        <meshStandardMaterial color={faceColor} roughness={0.7} />
      </mesh>
      {label && (
        <Text
          position={[0, 0, 0.012]}
          fontSize={0.06}
          maxWidth={CARD_W * 0.9}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          textAlign="center"
        >
          {label}
        </Text>
      )}
      {lost && (
        <Text position={[0, -0.18, 0.012]} fontSize={0.035} color="#fca5a5" anchorX="center">
          perdida
        </Text>
      )}
    </group>
  );
}
