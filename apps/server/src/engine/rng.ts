/**
 * RNG determinístico injetável (ver ADR-1 em docs/architecture.md).
 * A engine nunca usa Math.random diretamente: recebe uma função `() => number`
 * em [0,1), permitindo testes reprodutíveis e autoridade do servidor.
 */
export type Rng = () => number;

/** PRNG mulberry32: determinístico a partir de uma seed de 32 bits. */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG de produção baseado em Math.random (usado fora dos testes). */
export const defaultRng: Rng = () => Math.random();
