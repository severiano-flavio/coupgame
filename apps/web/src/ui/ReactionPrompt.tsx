import type { JSX } from 'react';
import {
  ACTION_LABELS,
  CHARACTER_LABELS,
  type PublicState,
  type TimerState,
} from '@coup/shared';
import { blockOptions, canReact, reactionKind } from '../game/selectors.js';
import { block, challenge, pass } from '../net/commands.js';
import { formatSeconds, useCountdown } from './useCountdown.js';

interface ReactionPromptProps {
  pub: PublicState;
  localPlayerId: string;
  timer: TimerState | null;
}

/**
 * Destaque de contestação/bloqueio com temporizador sincronizado. Só aparece
 * quando o jogador local tem reação pendente na janela atual (requirements §9).
 */
export function ReactionPrompt({ pub, localPlayerId, timer }: ReactionPromptProps): JSX.Element | null {
  const remaining = useCountdown(timer?.deadline ?? null);
  if (!canReact(pub, localPlayerId)) return null;

  const kind = reactionKind(pub);
  const action = pub.pendingAction;
  const blockChars = blockOptions(pub);

  return (
    <div className="rounded-lg bg-black/70 p-3 shadow-lg ring-1 ring-amber-500/60">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-200">
          {kind === 'ACTION_CHALLENGE' && action && (
            <>
              {playerName(pub, action.byPlayerId)} declarou {ACTION_LABELS[action.action]}
            </>
          )}
          {kind === 'BLOCK' && action && (
            <>Bloquear {ACTION_LABELS[action.action]}?</>
          )}
          {kind === 'BLOCK_CHALLENGE' && pub.pendingBlock && (
            <>
              {playerName(pub, pub.pendingBlock.byPlayerId)} bloqueou com{' '}
              {CHARACTER_LABELS[pub.pendingBlock.character]}
            </>
          )}
        </p>
        {remaining !== null && (
          <span className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white">
            {formatSeconds(remaining)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(kind === 'ACTION_CHALLENGE' || kind === 'BLOCK_CHALLENGE') && (
          <button
            type="button"
            onClick={() => challenge()}
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
          >
            Contestar
          </button>
        )}
        {kind === 'BLOCK' &&
          blockChars.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => block(c)}
              className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
            >
              Bloquear ({CHARACTER_LABELS[c]})
            </button>
          ))}
        <button
          type="button"
          onClick={() => pass()}
          className="rounded-md bg-tavern-700 px-3 py-1.5 text-sm text-amber-100 hover:bg-tavern-600"
        >
          Passar
        </button>
      </div>
    </div>
  );
}

function playerName(pub: PublicState, id: string): string {
  return pub.players.find((p) => p.id === id)?.name ?? id;
}
