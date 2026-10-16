import type { JSX } from 'react';
import { useUiStore } from '../store/ui.js';

const LABELS: Record<string, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  disconnected: 'Desconectado — tentando reconectar…',
};

const COLORS: Record<string, string> = {
  connecting: 'bg-amber-600',
  connected: 'bg-emerald-700',
  disconnected: 'bg-red-700',
};

/** Banner de estado de conexão + contador de presença (Etapa 1). */
export function ConnectionBanner(): JSX.Element {
  const connection = useUiStore((s) => s.connection);
  const onlineCount = useUiStore((s) => s.onlineCount);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white shadow ${COLORS[connection]}`}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full bg-white/90"
        aria-hidden="true"
      />
      <span>{LABELS[connection]}</span>
      <span className="ml-auto rounded bg-black/25 px-2 py-0.5 text-xs">
        Online: {onlineCount}
      </span>
    </div>
  );
}
