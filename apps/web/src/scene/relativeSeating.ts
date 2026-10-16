import { TABLE_RADIUS } from './Table.js';

export interface SeatLayout {
  /** posição da cadeira/jogador ao redor da mesa */
  position: [number, number, number];
  /** posição da cabeça (câmera) para o assento local */
  headPosition: [number, number, number];
  /** yaw para o assento olhar ao centro */
  faceCenterYaw: number;
  /** ângulo do assento ao redor da mesa */
  angle: number;
}

/**
 * Calcula o layout de `count` assentos, rotacionando para que o índice
 * `localIndex` fique na frente da câmera (ângulo 0, mais próximo do jogador).
 * Isso dá a cada jogador a visão de primeira pessoa da própria cadeira.
 */
export function computeRelativeSeats(count: number, localIndex: number): SeatLayout[] {
  const radius = TABLE_RADIUS + 0.9;
  const seats: SeatLayout[] = [];
  for (let i = 0; i < count; i++) {
    // desloca para que localIndex apareça no ângulo 0 (perto da câmera)
    const rel = (i - localIndex + count) % count;
    const angle = (rel / count) * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    seats.push({
      position: [x, 0, z],
      // Cabeça acima e um pouco atrás do assento: visão sentada natural, com a
      // mesa (tampo ~1.0) e as cartas enquadradas abaixo do olhar.
      headPosition: [x * 1.02, 1.95, z * 1.02],
      faceCenterYaw: Math.atan2(-x, -z),
      angle,
    });
  }
  return seats;
}
