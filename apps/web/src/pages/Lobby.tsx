import { useState } from 'react';
import type { JSX } from 'react';
import type { LobbyState } from '@coup/shared';
import { setReady, startGame } from '../net/commands.js';

interface LobbyProps {
  lobby: LobbyState;
  myPlayerId: string;
}

/** Lobby: lista de participantes, prontidão e início (host). */
export function Lobby({ lobby, myPlayerId }: LobbyProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const me = lobby.players.find((p) => p.id === myPlayerId);
  const amHost = me?.isHost ?? false;
  const inviteLink = `${window.location.origin}/?sala=${lobby.roomCode}`;

  function copyLink(): void {
    navigator.clipboard?.writeText(inviteLink).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-tavern-800/90 p-6 shadow-xl ring-1 ring-black/40">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-amber-100">Sala {lobby.roomCode}</h2>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md bg-tavern-700 px-3 py-1.5 text-sm text-amber-100 hover:bg-tavern-600"
          >
            {copied ? 'Link copiado!' : 'Copiar convite'}
          </button>
        </div>

        <p className="mb-4 text-sm text-amber-200/70">
          {lobby.minPlayers} a {lobby.maxPlayers} jogadores. Todos precisam ficar prontos.
        </p>

        <ul className="mb-5 divide-y divide-black/30 overflow-hidden rounded-lg bg-black/20">
          {lobby.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="flex items-center gap-2 text-amber-50">
                {p.name}
                {p.isHost && <span className="rounded bg-amber-700 px-1.5 py-0.5 text-[10px]">ANFITRIÃO</span>}
                {p.id === myPlayerId && <span className="text-xs text-amber-300">(você)</span>}
                {!p.connected && <span className="text-xs text-red-300">desconectado</span>}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs ${p.ready ? 'bg-emerald-700 text-white' : 'bg-tavern-700 text-amber-200'}`}
              >
                {p.ready ? 'Pronto' : 'Aguardando'}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReady(!(me?.ready ?? false))}
            className="flex-1 rounded-md bg-tavern-700 px-4 py-2.5 font-medium text-amber-100 hover:bg-tavern-600"
          >
            {me?.ready ? 'Cancelar prontidão' : 'Estou pronto'}
          </button>
          {amHost && (
            <button
              type="button"
              onClick={() => startGame()}
              disabled={!lobby.canStart}
              className="flex-1 rounded-md bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Iniciar partida
            </button>
          )}
        </div>
        {amHost && !lobby.canStart && (
          <p className="mt-2 text-center text-xs text-amber-200/60">
            Aguardando {lobby.minPlayers}–{lobby.maxPlayers} jogadores prontos.
          </p>
        )}
      </div>
    </div>
  );
}
