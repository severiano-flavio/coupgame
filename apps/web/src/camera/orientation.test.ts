import { describe, expect, it } from 'vitest';
import { computeBaseOrientation, viewDirection } from './orientation.js';

/**
 * Regressão do bug "câmera virada para fora da mesa": a orientação base deve
 * fazer a direção de visão apontar do assento PARA o centro (lookAt).
 */
function normalize([x, y, z]: [number, number, number]): [number, number, number] {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

describe('computeBaseOrientation', () => {
  const center: [number, number, number] = [0, 1.1, 0];

  it('assento em +Z olha para -Z (direção ao centro)', () => {
    const head: [number, number, number] = [0, 1.25, 3];
    const { yaw, pitch } = computeBaseOrientation(head, center);
    const dir = viewDirection(yaw, pitch);
    // esperado: apontar na direção (centro - head) normalizada
    const expected = normalize([0 - 0, 1.1 - 1.25, 0 - 3]);
    expect(dir[0]).toBeCloseTo(expected[0], 5);
    expect(dir[1]).toBeCloseTo(expected[1], 5);
    expect(dir[2]).toBeCloseTo(expected[2], 5);
    // componente Z deve ser negativa (olhando para -Z), NÃO positiva
    expect(dir[2]).toBeLessThan(0);
  });

  it('assento em -Z olha para +Z (direção ao centro)', () => {
    const head: [number, number, number] = [0, 1.25, -3];
    const { yaw, pitch } = computeBaseOrientation(head, center);
    const dir = viewDirection(yaw, pitch);
    expect(dir[2]).toBeGreaterThan(0);
  });

  it('assento em +X olha para -X', () => {
    const head: [number, number, number] = [3, 1.25, 0];
    const { yaw, pitch } = computeBaseOrientation(head, center);
    const dir = viewDirection(yaw, pitch);
    expect(dir[0]).toBeLessThan(0);
  });

  it('a visão aponta levemente para baixo quando a cabeça está acima do centro', () => {
    const head: [number, number, number] = [0, 1.25, 3];
    const { yaw, pitch } = computeBaseOrientation(head, center);
    const dir = viewDirection(yaw, pitch);
    expect(dir[1]).toBeLessThan(0); // olhando um pouco para baixo
  });
});
