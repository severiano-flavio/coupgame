import type { JSX } from 'react';
import { CHARACTER_LABELS, type PrivatePlayerState } from '@coup/shared';
import { selectInfluence } from '../net/commands.js';

interface InfluenceLossModalProps {
  priv: PrivatePlayerState;
}

/**
 * Modal para o jogador escolher qual influência (carta ativa) revelar
 * permanentemente. Só aparece quando é a vez de o jogador perder influência.
 */
export function InfluenceLossModal({ priv }: InfluenceLossModalProps): JSX.Element {
  const active = priv.hand.filter((c) => !c.lost);

  return (
    <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-tavern-800 p-5 shadow-2xl ring-1 ring-red-700/60">
        <h3 className="mb-1 text-lg font-semibold text-red-200">Perder influência</h3>
        <p className="mb-4 text-sm text-amber-200/80">
          Escolha qual carta revelar. A escolha é permanente.
        </p>
        <div className="flex justify-center gap-3">
          {active.map((c) => (
            <button
              key={c.cardId}
              type="button"
              onClick={() => selectInfluence(c.cardId)}
              className="flex h-32 w-24 flex-col items-center justify-center rounded-lg bg-tavern-700 text-amber-50 ring-1 ring-black/40 transition hover:bg-amber-700"
            >
              <span className="text-sm font-medium">{CHARACTER_LABELS[c.character]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
