import { useMemo } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';

/** Raio da mesa, reutilizado por Seats para posicionar as cadeiras. */
export const TABLE_RADIUS = 2.2;

/**
 * Mesa circular de madeira (procedural). Geometria/material memoizados para
 * não recriar por render (ver docs/engineering-standards.md §5).
 */
export function Table(): JSX.Element {
  const topMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5a4027', roughness: 0.8, metalness: 0.05 }),
    [],
  );
  const feltMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2f5d3a', roughness: 0.95 }),
    [],
  );

  return (
    <group>
      {/* Tampo */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow material={topMaterial}>
        <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, 0.18, 48]} />
      </mesh>
      {/* Feltro central */}
      <mesh position={[0, 0.995, 0]} receiveShadow material={feltMaterial}>
        <cylinderGeometry args={[TABLE_RADIUS * 0.7, TABLE_RADIUS * 0.7, 0.02, 48]} />
      </mesh>
      {/* Pé central */}
      <mesh position={[0, 0.45, 0]} castShadow material={topMaterial}>
        <cylinderGeometry args={[0.25, 0.4, 0.9, 24]} />
      </mesh>
    </group>
  );
}
