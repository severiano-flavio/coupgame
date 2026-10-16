import type { JSX } from 'react';
import { CHARACTER_LABELS, type PrivatePlayerState } from '@coup/shared';
import { CHARACTER_COLOR } from '../scene/cardColors.js';

interface MyHandProps {
  priv: PrivatePlayerState;
}

/**
 * Painel HTML sempre legível com as cartas do próprio jogador. Garante a
 * legibilidade independentemente da cena 3D (requirements §9). Cartas perdidas
 * aparecem esmaecidas e marcadas.
 */
export function MyHand({ priv }: MyHandProps): JSX.Element {
  return (
    <div className="rounded-lg bg-black/60 p-3 ring-1 ring-amber-900/50">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-amber-300">
        Suas cartas
      </p>
      <div className="flex justify-center gap-3">
        {priv.hand.map((c) => (
          <div
            key={c.cardId}
            className={`flex h-28 w-20 flex-col items-center justify-center rounded-lg text-sm font-medium text-white shadow-md ${
              c.lost ? 'opacity-40 grayscale' : ''
            }`}
            style={{ backgroundColor: CHARACTER_COLOR[c.character] }}
          >
            <span>{CHARACTER_LABELS[c.character]}</span>
            {c.lost && <span className="mt-1 text-[10px] text-red-200">perdida</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
