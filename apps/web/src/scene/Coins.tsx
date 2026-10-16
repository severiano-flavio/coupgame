import { useLayoutEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';

interface CoinsProps {
  count: number;
  position: [number, number, number];
}

const MAX_COINS = 12;

/**
 * Pilha de moedas via InstancedMesh (uma geometria/material para todas as
 * fichas — ver docs/engineering-standards.md §5). Descarta recursos ao
 * desmontar. O contador numérico fica no HUD (acessibilidade).
 */
export function Coins({ count, position }: CoinsProps): JSX.Element {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.6, roughness: 0.35 }),
    [],
  );

  const shown = Math.min(count, MAX_COINS);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < shown; i++) {
      dummy.position.set(position[0], position[1] + i * 0.022, position[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = shown;
    mesh.instanceMatrix.needsUpdate = true;
  }, [shown, position]);

  useLayoutEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <instancedMesh ref={ref} args={[geometry, material, MAX_COINS]} castShadow />;
}
