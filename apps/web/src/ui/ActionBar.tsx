import { useState } from 'react';
import type { JSX } from 'react';
import { ACTION_LABELS, type ActionType, type PublicState } from '@coup/shared';
import { availableActions, actionNeedsTarget, validTargets } from '../game/selectors.js';
import { declareAction } from '../net/commands.js';

interface ActionBarProps {
  pub: PublicState;
  localPlayerId: string;
}

/**
 * Barra de ações do jogador da vez. Deriva as ações válidas do estado público;
 * ações direcionadas abrem a seleção de alvo. Totalmente em HTML (acessível),
 * independente da cena 3D (requirements §9).
 */
export function ActionBar({ pub, localPlayerId }: ActionBarProps): JSX.Element | null {
  const [pendingTargetFor, setPendingTargetFor] = useState<ActionType | null>(null);
  const actions = availableActions(pub, localPlayerId);
  if (actions.length === 0) return null;

  const targets = validTargets(pub, localPlayerId);

  function onClickAction(action: ActionType): void {
    if (actionNeedsTarget(action)) {
      setPendingTargetFor(action);
    } else {
      declareAction(action);
    }
  }

  function onPickTarget(targetId: string): void {
    if (pendingTargetFor) {
      declareAction(pendingTargetFor, targetId);
      setPendingTargetFor(null);
    }
  }

  return (
    <div className="rounded-lg bg-black/60 p-3 shadow-lg ring-1 ring-amber-900/50">
      <p className="mb-2 text-sm font-medium text-amber-200">Sua vez — escolha uma ação</p>
      {!pendingTargetFor ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onClickAction(a)}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
            >
              {ACTION_LABELS[a]}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm text-amber-100">
            Alvo para {ACTION_LABELS[pendingTargetFor]}:
          </p>
          <div className="flex flex-wrap gap-2">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPickTarget(t.id)}
                className="rounded-md bg-tavern-700 px-3 py-1.5 text-sm text-amber-100 hover:bg-tavern-600"
              >
                {t.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPendingTargetFor(null)}
              className="rounded-md bg-black/40 px-3 py-1.5 text-sm text-amber-200 hover:bg-black/60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
