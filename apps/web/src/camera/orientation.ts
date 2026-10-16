/**
 * Cálculo da orientação base da câmera por assento. Extraído para teste.
 *
 * Convenção do Three.js: a câmera olha para -Z; um yaw θ aponta a direção
 * (sin θ, 0, -cos θ). Portanto, para olhar do assento em direção ao `lookAt`,
 * usamos atan2(-dx, -dz). O pitch base inclina em direção à altura relativa.
 */
import * as THREE from 'three';

/** Limites de rotação da câmera por assento (requirements §8). */
export const CAMERA_LIMITS = {
  YAW_MIN: THREE.MathUtils.degToRad(-95),
  YAW_MAX: THREE.MathUtils.degToRad(95),
  PITCH_MIN: THREE.MathUtils.degToRad(-40),
  PITCH_MAX: THREE.MathUtils.degToRad(50),
};

export interface BaseOrientation {
  yaw: number;
  pitch: number;
}

export function computeBaseOrientation(
  head: [number, number, number],
  lookAt: [number, number, number],
): BaseOrientation {
  const dx = lookAt[0] - head[0];
  const dy = lookAt[1] - head[1];
  const dz = lookAt[2] - head[2];
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
  };
}

/**
 * Direção de visão (unitária) resultante de um yaw/pitch na convenção do
 * Three.js (Euler ordem 'YXZ' aplicada ao forward -Z). Rotacionar (0,0,-1) por
 * yaw θ em torno de Y dá (-sin θ, 0, -cos θ); o pitch inclina em Y.
 */
export function viewDirection(yaw: number, pitch: number): [number, number, number] {
  const cosP = Math.cos(pitch);
  return [-Math.sin(yaw) * cosP, Math.sin(pitch), -Math.cos(yaw) * cosP];
}
