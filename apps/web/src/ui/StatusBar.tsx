import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { ACTION_LABELS, type PublicState } from '@coup/shared';
import { useGameStore } from '../store/game.js';

interface StatusBarProps {
  pub: PublicState;
  localPlayerId: string;
}

const REJECT_MESSAGES: Record<string, string> = {
  NOT_YOUR_TURN: 'Não é a sua vez.',
  INVALID_PHASE: 'Ação indisponível agora.',
  NOT_AUTHORIZED: 'Você não pode fazer isso.',
  INVALID_TARGET: 'Alvo inválido.',
  INSUFFICIENT_COINS: 'Moedas insuficientes.',
  MUST_COUP: 'Com 10+ moedas, você deve dar um Golpe.',
  STALE_STATE: 'Estado desatualizado, tente novamente.',
  DUPLICATE_COMMAND: 'Comando duplicado.',
  WINDOW_CLOSED: 'A janela de reação já fechou.',
  INVALID_SELECTION: 'Seleção inválida.',
  UNKNOWN: 'Não foi possível processar o comando.',
};

/** Barra de status: fase, de quem é a vez, vencedor e toasts de rejeição. */
export function StatusBar({ pub, localPlayerId }: StatusBarProps): JSX.Element {
  const rejection = useGameStore((s) => s.lastRejection);
  const setRejection = useGameStore((s) => s.setRejection);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!rejection) return;
    setToast(REJECT_MESSAGES[rejection.reason] ?? rejection.reason);
    const id = setTimeout(() => {
      setToast(null);
      setRejection(null);
    }, 2500);
    return () => clearTimeout(id);
  }, [rejection, setRejection]);

  const current = pub.players.find((p) => p.id === pub.currentPlayerId);
  const isMe = pub.currentPlayerId === localPlayerId;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-md bg-black/50 px-3 py-1.5 text-sm text-amber-100 ring-1 ring-black/40">
        {pub.phase === 'GAME_OVER' ? (
          <span className="font-semibold text-amber-300">
            Fim de jogo — {pub.players.find((p) => p.id === pub.winnerId)?.name ?? '—'} venceu!
          </span>
        ) : (
          <span>
            Vez de <b>{isMe ? 'você' : (current?.name ?? '—')}</b>
            {pub.pendingAction && (
              <> · {ACTION_LABELS[pub.pendingAction.action]}</>
            )}
          </span>
        )}
      </div>
      {toast && (
        <div
          role="alert"
          className="rounded-md bg-red-700/90 px-3 py-1.5 text-sm text-white shadow"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
