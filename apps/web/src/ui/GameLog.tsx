import type { JSX } from 'react';
import type { PublicLogEntry } from '@coup/shared';

interface GameLogProps {
  entries: PublicLogEntry[];
}

/** Registro público de eventos (texto pt-BR já pronto pelo servidor). */
export function GameLog({ entries }: GameLogProps): JSX.Element {
  return (
    <div className="max-h-40 w-72 overflow-y-auto rounded-lg bg-black/50 p-2 text-xs text-amber-100 ring-1 ring-black/40">
      <p className="mb-1 font-semibold text-amber-300">Histórico</p>
      <ul className="space-y-0.5">
        {entries.length === 0 && <li className="text-amber-200/50">Sem eventos ainda.</li>}
        {entries.map((e, i) => (
          <li key={`${e.t}-${i}`}>{e.text}</li>
        ))}
      </ul>
    </div>
  );
}
