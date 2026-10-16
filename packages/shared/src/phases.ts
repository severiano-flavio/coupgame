/**
 * Fases da máquina de estados. Ver docs/architecture.md §4.
 */
export const PHASES = [
  'LOBBY',
  'DEALING',
  'WAITING_ACTION',
  'ACTION_CHALLENGE',
  'BLOCK_WINDOW',
  'BLOCK_CHALLENGE',
  'RESOLVING',
  'INFLUENCE_SELECTION',
  'EXCHANGE_SELECTION',
  'NEXT_TURN',
  'GAME_OVER',
] as const;

export type Phase = (typeof PHASES)[number];
