/**
 * Personagens da edição básica do Coup (3 cartas de cada → 15 no total).
 * Ver docs/game-rules.md §1 e §3.
 */
export const CHARACTERS = ['DUKE', 'ASSASSIN', 'CAPTAIN', 'AMBASSADOR', 'CONTESSA'] as const;

export type CharacterType = (typeof CHARACTERS)[number];

/** Quantidade de cada personagem no baralho. */
export const COPIES_PER_CHARACTER = 3;

/** Total de cartas no baralho inicial. */
export const TOTAL_CARDS = CHARACTERS.length * COPIES_PER_CHARACTER;

/** Rótulos em pt-BR para exibição. */
export const CHARACTER_LABELS: Record<CharacterType, string> = {
  DUKE: 'Duque',
  ASSASSIN: 'Assassino',
  CAPTAIN: 'Capitão',
  AMBASSADOR: 'Embaixador',
  CONTESSA: 'Condessa',
};
