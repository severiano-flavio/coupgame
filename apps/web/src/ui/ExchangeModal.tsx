import { useState } from 'react';
import type { JSX } from 'react';
import { CHARACTER_LABELS, type PrivatePlayerState, type TimerState } from '@coup/shared';
import { CHARACTER_COLOR } from '../scene/cardColors.js';
import { selectExchange } from '../net/commands.js';
import { formatSeconds, useCountdown } from './useCountdown.js';

interface ExchangeModalProps {
  priv: PrivatePlayerState;
  timer: TimerState | null;
}

/**
 * Modal da troca (Embaixador): o jogador junta suas cartas ativas às 2 cartas
 * compradas e escolhe quais MANTER (iguais ao nº de influências ativas). As
 * demais voltam ao baralho. A decisão é SEMPRE do jogador — se o tempo expirar,
 * o servidor preserva as cartas originais (política documentada D2).
 */
export function ExchangeModal({ priv, timer }: ExchangeModalProps): JSX.Element {
  const activeHand = priv.hand.filter((c) => !c.lost);
  const keepCount = activeHand.length;
  const drawn = priv.exchangeOffer ?? [];
  const pool = [...activeHand, ...drawn];
  const drawnIds = new Set(drawn.map((c) => c.cardId));
  const [selected, setSelected] = useState<string[]>([]);
  const remaining = useCountdown(timer?.deadline ?? null);

  function toggle(cardId: string): void {
    setSelected((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= keepCount) return prev;
      return [...prev, cardId];
    });
  }

  const ready = selected.length === keepCount;

  return (
    <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl bg-tavern-800 p-5 shadow-2xl ring-1 ring-emerald-700/60">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-emerald-200">Troca (Embaixador)</h3>
          {remaining !== null && (
            <span className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white">
              {formatSeconds(remaining)}
            </span>
          )}
        </div>
        <p className="mb-4 text-sm text-amber-200/80">
          Você comprou 2 cartas. Escolha <b>{keepCount}</b> para manter — as outras {pool.length - keepCount}{' '}
          voltam ao baralho.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-amber-300">Suas cartas</p>
            <div className="flex flex-wrap gap-2">
              {activeHand.map((c) => (
                <CardButton
                  key={c.cardId}
                  label={CHARACTER_LABELS[c.character]}
                  color={CHARACTER_COLOR[c.character]}
                  chosen={selected.includes(c.cardId)}
                  onClick={() => toggle(c.cardId)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-emerald-300">Compradas</p>
            <div className="flex flex-wrap gap-2">
              {drawn.map((c) => (
                <CardButton
                  key={c.cardId}
                  label={CHARACTER_LABELS[c.character]}
                  color={CHARACTER_COLOR[c.character]}
                  chosen={selected.includes(c.cardId)}
                  onClick={() => toggle(c.cardId)}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!ready}
          onClick={() => selectExchange(selected)}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Manter selecionadas ({selected.length}/{keepCount})
        </button>
        {!ready && (
          <p className="mt-2 text-center text-xs text-amber-200/60">
            Selecione exatamente {keepCount} carta(s) para confirmar.
          </p>
        )}
        {drawnIds.size === 0 && (
          <p className="mt-2 text-center text-xs text-red-300">Aguardando as cartas compradas…</p>
        )}
      </div>
    </div>
  );
}

interface CardButtonProps {
  label: string;
  color: string;
  chosen: boolean;
  onClick: () => void;
}

function CardButton({ label, color, chosen, onClick }: CardButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={chosen}
      className={`flex h-24 w-16 items-center justify-center rounded-lg text-center text-xs font-medium text-white ring-2 transition ${
        chosen ? 'ring-emerald-300' : 'ring-black/30 opacity-80 hover:opacity-100'
      }`}
      style={{ backgroundColor: color, outline: chosen ? '2px solid #6ee7b7' : 'none' }}
    >
      {label}
      {chosen && <span className="ml-1">✓</span>}
    </button>
  );
}
