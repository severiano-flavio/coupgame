/**
 * Ações possíveis no turno. Ver docs/game-rules.md §2 e §3.
 */
export const ACTIONS = [
  'INCOME', // Renda: +1, não contestável/bloqueável
  'FOREIGN_AID', // Ajuda externa: +2, bloqueável por Duque
  'COUP', // Golpe: paga 7, remove influência
  'TAX', // Impostos (Duque): +3
  'ASSASSINATE', // Assassinato (Assassino): paga 3
  'STEAL', // Roubo (Capitão): até 2
  'EXCHANGE', // Troca (Embaixador)
] as const;

export type ActionType = (typeof ACTIONS)[number];

/** Custo em moedas de cada ação (0 quando não há custo direto). */
export const ACTION_COST: Record<ActionType, number> = {
  INCOME: 0,
  FOREIGN_AID: 0,
  COUP: 7,
  TAX: 0,
  ASSASSINATE: 3,
  STEAL: 0,
  EXCHANGE: 0,
};

/** Saldo que obriga a executar Golpe no início do turno. */
export const MANDATORY_COUP_THRESHOLD = 10;

/** Rótulos em pt-BR para exibição. */
export const ACTION_LABELS: Record<ActionType, string> = {
  INCOME: 'Renda',
  FOREIGN_AID: 'Ajuda externa',
  COUP: 'Golpe',
  TAX: 'Impostos',
  ASSASSINATE: 'Assassinato',
  STEAL: 'Roubo',
  EXCHANGE: 'Troca',
};
