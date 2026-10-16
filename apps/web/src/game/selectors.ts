import {
  ACTION_COST,
  MANDATORY_COUP_THRESHOLD,
  type ActionType,
  type CharacterType,
  type PublicPlayer,
  type PublicState,
} from '@coup/shared';

/**
 * Seletores de UI derivados do estado público + identidade. O cliente usa isto
 * apenas para decidir QUAIS comandos oferecer; o servidor continua sendo a
 * autoridade sobre o resultado (constituição §4).
 */

export function me(pub: PublicState | null, playerId: string | undefined): PublicPlayer | null {
  if (!pub || !playerId) return null;
  return pub.players.find((p) => p.id === playerId) ?? null;
}

export function isMyTurn(pub: PublicState | null, playerId: string | undefined): boolean {
  return !!pub && !!playerId && pub.currentPlayerId === playerId && pub.phase === 'WAITING_ACTION';
}

/** Ações que o jogador da vez pode declarar agora. */
export function availableActions(
  pub: PublicState | null,
  playerId: string | undefined,
): ActionType[] {
  const player = me(pub, playerId);
  if (!pub || !player || !isMyTurn(pub, playerId)) return [];

  // Obrigação de Golpe com >=10 moedas.
  if (player.coins >= MANDATORY_COUP_THRESHOLD) return ['COUP'];

  const all: ActionType[] = ['INCOME', 'FOREIGN_AID', 'TAX', 'STEAL', 'EXCHANGE', 'ASSASSINATE', 'COUP'];
  return all.filter((a) => player.coins >= ACTION_COST[a]);
}

/** A ação exige alvo adversário? */
export function actionNeedsTarget(action: ActionType): boolean {
  return action === 'COUP' || action === 'ASSASSINATE' || action === 'STEAL';
}

/** Alvos válidos (adversários vivos). */
export function validTargets(
  pub: PublicState | null,
  playerId: string | undefined,
): PublicPlayer[] {
  if (!pub) return [];
  return pub.players.filter((p) => p.id !== playerId && !p.eliminated);
}

/** O jogador tem reação pendente na janela atual? */
export function canReact(pub: PublicState | null, playerId: string | undefined): boolean {
  return !!pub && !!playerId && pub.awaitingReactionFrom.includes(playerId);
}

/** Personagens que o jogador pode declarar para bloquear a ação pendente. */
export function blockOptions(pub: PublicState | null): CharacterType[] {
  if (!pub?.pendingAction) return [];
  switch (pub.pendingAction.action) {
    case 'FOREIGN_AID':
      return ['DUKE'];
    case 'ASSASSINATE':
      return ['CONTESSA'];
    case 'STEAL':
      return ['CAPTAIN', 'AMBASSADOR'];
    default:
      return [];
  }
}

/** A janela atual é de bloqueio (BLOCK_WINDOW) ou de contestação? */
export function reactionKind(pub: PublicState | null): 'ACTION_CHALLENGE' | 'BLOCK' | 'BLOCK_CHALLENGE' | null {
  if (!pub) return null;
  if (pub.phase === 'ACTION_CHALLENGE') return 'ACTION_CHALLENGE';
  if (pub.phase === 'BLOCK_WINDOW') return 'BLOCK';
  if (pub.phase === 'BLOCK_CHALLENGE') return 'BLOCK_CHALLENGE';
  return null;
}

/** O jogador deve escolher qual influência perder? */
export function mustSelectInfluence(pub: PublicState | null, playerId: string | undefined): boolean {
  return !!pub && pub.phase === 'INFLUENCE_SELECTION' && pub.awaitingLossFrom === playerId;
}

/** É a troca do próprio jogador? */
export function mustExchange(pub: PublicState | null, playerId: string | undefined): boolean {
  return (
    !!pub &&
    pub.phase === 'EXCHANGE_SELECTION' &&
    pub.pendingAction?.action === 'EXCHANGE' &&
    pub.pendingAction.byPlayerId === playerId
  );
}
