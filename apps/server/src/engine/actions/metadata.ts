import type { ActionType, CharacterType } from '@coup/shared';

/**
 * Metadados declarativos de cada ação: personagem alegado (se houver), se é
 * direcionada, e quais personagens podem bloqueá-la. Ver docs/game-rules.md.
 */
export interface ActionMeta {
  /** Personagem que a ação alega possuir (contestável). null = sem alegação. */
  claims: CharacterType | null;
  /** Exige alvo adversário. */
  targeted: boolean;
  /** Personagens que podem bloquear a ação. Vazio = não bloqueável. */
  blockableBy: CharacterType[];
  /** Apenas o alvo pode bloquear (Assassinato, Roubo). false = qualquer um. */
  blockOnlyByTarget: boolean;
}

export const ACTION_META: Record<ActionType, ActionMeta> = {
  INCOME: { claims: null, targeted: false, blockableBy: [], blockOnlyByTarget: false },
  FOREIGN_AID: { claims: null, targeted: false, blockableBy: ['DUKE'], blockOnlyByTarget: false },
  COUP: { claims: null, targeted: true, blockableBy: [], blockOnlyByTarget: false },
  TAX: { claims: 'DUKE', targeted: false, blockableBy: [], blockOnlyByTarget: false },
  ASSASSINATE: {
    claims: 'ASSASSIN',
    targeted: true,
    blockableBy: ['CONTESSA'],
    blockOnlyByTarget: true,
  },
  STEAL: {
    claims: 'CAPTAIN',
    targeted: true,
    blockableBy: ['CAPTAIN', 'AMBASSADOR'],
    blockOnlyByTarget: true,
  },
  EXCHANGE: { claims: 'AMBASSADOR', targeted: false, blockableBy: [], blockOnlyByTarget: false },
};

/** Limite de moedas roubadas pelo Capitão. */
export const STEAL_MAX = 2;
