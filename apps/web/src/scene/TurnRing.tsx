import { useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUiStore } from '../store/ui.js';

/**
 * Anel de destaque do jogador da vez. Quando as animações estão ativas, pulsa
 * suavemente via useFrame (sem setState por frame). Com animações desativadas,
 * permanece estático e ainda legível (requirements §9).
 */
export function TurnRing(): JSX.Element {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const animationsEnabled = useUiStore((s) => s.animationsEnabled);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.opacity = animationsEnabled ? 0.55 + 0.3 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3)) : 0.85;
  });

  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.34, 0.42, 32]} />
      <meshBasicMaterial ref={matRef} color="#fbbf24" transparent opacity={0.85} />
    </mesh>
  );
}
