import { useState } from 'react';
import type { JSX } from 'react';
import { createRoom, joinRoom } from '../net/commands.js';

interface HomeProps {
  initialRoomCode?: string;
}

/** Tela inicial: criar sala ou entrar por código/link, com apelido. */
export function Home({ initialRoomCode }: HomeProps): JSX.Element {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode ?? '');
  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');

  const canSubmit = nickname.trim().length > 0 && (mode === 'create' || roomCode.trim().length > 0);

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === 'create') createRoom(nickname.trim());
    else joinRoom(roomCode.trim().toUpperCase(), nickname.trim());
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl bg-tavern-800/90 p-6 shadow-xl ring-1 ring-black/40"
      >
        <h1 className="mb-1 text-2xl font-semibold text-amber-100">Coup 3D</h1>
        <p className="mb-6 text-sm text-amber-200/70">
          Blefes, desafios e influência. Entre com um apelido para jogar.
        </p>

        <div className="mb-4 flex rounded-lg bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === 'create' ? 'bg-amber-600 text-white' : 'text-amber-200'}`}
            aria-pressed={mode === 'create'}
          >
            Criar sala
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === 'join' ? 'bg-amber-600 text-white' : 'text-amber-200'}`}
            aria-pressed={mode === 'join'}
          >
            Entrar
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-amber-200">Apelido</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            placeholder="Seu apelido"
            className="w-full rounded-md border border-black/40 bg-tavern-900 px-3 py-2 text-amber-50 outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
        </label>

        {mode === 'join' && (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-amber-200">Código da sala</span>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="w-full rounded-md border border-black/40 bg-tavern-900 px-3 py-2 font-mono tracking-widest text-amber-50 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-md bg-amber-600 px-4 py-2.5 font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === 'create' ? 'Criar sala' : 'Entrar na sala'}
        </button>
      </form>
    </div>
  );
}
