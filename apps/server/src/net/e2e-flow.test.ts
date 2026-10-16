import { createServer, type Server as HttpServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Server } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { createSeededRng } from '../engine/index.js';
import { RoomManager } from '../rooms/room-manager.js';
import { GameHub } from './game-hub.js';
import { registerConnection } from './connection.js';

/**
 * Teste de integração ponta a ponta sobre Socket.IO real (sem browser). Valida
 * o critério de aceite da Etapa 3: três clientes criam/entram numa sala, a
 * partida inicia e os snapshots públicos chegam consistentes a todos, com
 * informação privada entregue apenas ao dono.
 *
 * socket.io-client está disponível como dependência de @coup/web (workspace),
 * resolvido via node_modules do monorepo.
 */

let httpServer: HttpServer;
let io: Server;
let port: number;
const clients: ClientSocket[] = [];

beforeEach(async () => {
  httpServer = createServer();
  io = new Server(httpServer, { cors: { origin: '*' } });
  const rooms = new RoomManager({ rng: createSeededRng(7) });
  const hub = new GameHub(io, { rng: createSeededRng(7) });
  io.on('connection', (socket) => registerConnection(io, socket, rooms, hub));
  await new Promise<void>((resolve) => {
    httpServer.listen(() => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve();
    });
  });
});

afterEach(async () => {
  for (const c of clients) c.close();
  clients.length = 0;
  io.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

function connect(): ClientSocket {
  const c = ioc(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
  clients.push(c);
  return c;
}

function once<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve as (v: unknown) => void));
}

describe('fluxo multiplayer ponta a ponta', () => {
  it('3 clientes criam sala, iniciam e recebem estado consistente e privado', async () => {
    const host = connect();
    await once(host, 'connect');
    host.emit('createRoom', { nickname: 'Ana' });
    const created = await once<{ roomCode: string; playerId: string; playerToken: string }>(
      host,
      'roomCreated',
    );
    const code = created.roomCode;
    expect(code).toHaveLength(6);

    const p2 = connect();
    const p3 = connect();
    await Promise.all([once(p2, 'connect'), once(p3, 'connect')]);
    p2.emit('joinRoom', { roomCode: code, nickname: 'Beto' });
    const j2 = await once<{ playerId: string }>(p2, 'roomJoined');
    p3.emit('joinRoom', { roomCode: code, nickname: 'Caio' });
    const j3 = await once<{ playerId: string }>(p3, 'roomJoined');

    // todos prontos
    const lobbyReady = once(host, 'lobbyState');
    host.emit('setReady', { ready: true });
    await lobbyReady;
    p2.emit('setReady', { ready: true });
    p3.emit('setReady', { ready: true });
    // aguarda o lobby refletir canStart
    await waitFor(() => true, 100);

    // inicia e captura o primeiro publicState de cada cliente
    const pubHost = once<{
      phase: string;
      players: { id: string; coins: number }[];
      stateVersion: number;
      currentPlayerId: string | null;
    }>(host, 'publicState');
    const privHost = once<{ hand: unknown[] }>(host, 'privateState');
    const pubP2 = once<{ phase: string }>(p2, 'publicState');
    host.emit('startGame');

    const [ph, prh, pp2] = await Promise.all([pubHost, privHost, pubP2]);
    expect(ph.phase).toBe('WAITING_ACTION');
    expect(ph.players).toHaveLength(3);
    expect(pp2.phase).toBe('WAITING_ACTION');
    // privado do host: exatamente 2 cartas próprias
    expect(prh.hand).toHaveLength(2);

    // o estado público não deve conter cartas ocultas
    expect(JSON.stringify(ph)).not.toContain('cardId');

    // sanity: ids distintos
    expect(new Set([created.playerId, j2.playerId, j3.playerId]).size).toBe(3);

    // --- jogar: o jogador da vez declara Renda via envelope de comando ---
    const curId = ph.currentPlayerId as string | null;
    const bySocket: Record<string, { socket: ClientSocket; playerId: string }> = {
      [created.playerId]: { socket: host, playerId: created.playerId },
      [j2.playerId]: { socket: p2, playerId: j2.playerId },
      [j3.playerId]: { socket: p3, playerId: j3.playerId },
    };
    const actor = curId ? bySocket[curId] : undefined;
    expect(actor).toBeDefined();

    const beforeCoins = ph.players.find((p) => (p as { id: string }).id === curId) as
      | { coins: number }
      | undefined;

    const after = await new Promise<{ stateVersion: number; players: { id: string; coins: number }[] }>(
      (resolve) => {
        const handler = (s: { stateVersion: number; players: { id: string; coins: number }[] }): void => {
          if (s.stateVersion > ph.stateVersion) {
            actor!.socket.off('publicState', handler);
            resolve(s);
          }
        };
        actor!.socket.on('publicState', handler);
        actor!.socket.emit('command', {
          matchId: code,
          stateVersion: ph.stateVersion,
          commandId: crypto.randomUUID(),
          cmd: { type: 'DECLARE_ACTION', action: 'INCOME' },
        });
      },
    );
    expect(after.stateVersion).toBe(ph.stateVersion + 1);
    const actorAfter = after.players.find((p) => p.id === curId)!;
    expect(actorAfter.coins).toBe((beforeCoins?.coins ?? 2) + 1);
  });

  it('rejeita comando de quem não é a vez (NOT_YOUR_TURN) via rede', async () => {
    const host = connect();
    await once(host, 'connect');
    host.emit('createRoom', { nickname: 'Ana' });
    const created = await once<{ roomCode: string; playerId: string }>(host, 'roomCreated');
    const code = created.roomCode;

    const p2 = connect();
    const p3 = connect();
    await Promise.all([once(p2, 'connect'), once(p3, 'connect')]);
    p2.emit('joinRoom', { roomCode: code, nickname: 'Beto' });
    const j2 = await once<{ playerId: string }>(p2, 'roomJoined');
    p3.emit('joinRoom', { roomCode: code, nickname: 'Caio' });
    await once(p3, 'roomJoined');

    host.emit('setReady', { ready: true });
    p2.emit('setReady', { ready: true });
    p3.emit('setReady', { ready: true });
    await waitFor(() => true, 80);

    const pub = once<{ stateVersion: number; currentPlayerId: string }>(host, 'publicState');
    host.emit('startGame');
    const ph = await pub;

    // escolhe um jogador que NÃO é o da vez
    const notCurrent = [created.playerId, j2.playerId].find((id) => id !== ph.currentPlayerId)!;
    const socket = notCurrent === created.playerId ? host : p2;

    const rejected = once<{ reason: string }>(socket, 'commandRejected');
    socket.emit('command', {
      matchId: code,
      stateVersion: ph.stateVersion,
      commandId: crypto.randomUUID(),
      cmd: { type: 'DECLARE_ACTION', action: 'INCOME' },
    });
    const r = await rejected;
    expect(r.reason).toBe('NOT_YOUR_TURN');
  });
});

function waitFor(_pred: () => boolean, ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
