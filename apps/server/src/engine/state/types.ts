import type { ActionType, CharacterType, Phase } from '@coup/shared';

/**
 * Estado interno COMPLETO da partida (contém informação secreta: cartas de
 * todos os jogadores e a ordem do baralho). NUNCA é serializado diretamente
 * para o cliente — ver snapshots/ e constituição §5.
 */

export interface InternalCard {
  cardId: string; // opaco e estável
  character: CharacterType;
  lost: boolean; // revelada permanentemente (influência perdida)
}

export interface InternalPlayer {
  id: string;
  name: string;
  seat: number;
  coins: number;
  cards: InternalCard[]; // SECRETO
  connected: boolean;
  eliminated: boolean;
}

/** Motivo pelo qual um jogador deve perder uma influência. */
export type LossReason = 'COUP' | 'ASSASSINATE' | 'CHALLENGE';

export interface PendingLoss {
  playerId: string;
  reason: LossReason;
}

/** Ação declarada no turno em curso. */
export interface PendingAction {
  action: ActionType;
  by: string;
  target?: string;
}

/** Bloqueio declarado na janela de bloqueio. */
export interface PendingBlock {
  character: CharacterType;
  by: string;
}

/**
 * Contexto da resolução em curso. Presente apenas em fases intermediárias.
 */
export interface PendingContext {
  action?: PendingAction;
  block?: PendingBlock;
  /** Jogadores que ainda podem reagir (contestar/bloquear/passar) na janela. */
  reactionOwners: string[];
  /** Perdas de influência a aplicar sequencialmente (atômico por passo). */
  losses: PendingLoss[];
  /** Cartas compradas, oferecidas na troca do Embaixador (secreto ao dono). */
  exchangeDraw?: InternalCard[];
  /**
   * Continuação após resolver as perdas pendentes. Ver game-rules.md §6.2 e
   * docs/architecture.md §4.
   * - OPEN_BLOCK_WINDOW: a ação sobreviveu a uma contestação e ainda pode ser
   *   bloqueada (abre a janela de bloqueio).
   * - RESOLVE_ACTION: aplica o efeito final da ação diretamente.
   * - END_TURN: a ação foi impedida; apenas avança o turno.
   */
  resumeAfterLosses?: 'OPEN_BLOCK_WINDOW' | 'RESOLVE_ACTION' | 'END_TURN' | null;
}

export interface LogEntry {
  t: number;
  kind: string;
  text: string;
}

export interface InternalState {
  matchId: string;
  stateVersion: number;
  phase: Phase;
  order: string[]; // ids em ordem horária (sorteada no setup)
  turnIndex: number; // índice em `order` do jogador da vez
  players: Record<string, InternalPlayer>;
  deck: InternalCard[]; // SECRETO (ordem)
  pending?: PendingContext;
  winnerId?: string;
  log: LogEntry[];
}
