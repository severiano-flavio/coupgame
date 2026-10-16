// Smoke test de produção: 3 clientes criam/entram numa sala, iniciam a partida
// e jogam uma Renda. Requer o servidor rodando na porta 3001.
// Executar de apps/web (tem socket.io-client).
import { io } from 'socket.io-client';
import { randomUUID } from 'node:crypto';

const URL = process.env.VITE_SERVER_URL ?? 'http://localhost:3001';

function connect() {
  return io(URL, { transports: ['websocket'], forceNew: true });
}
function once(s, ev) {
  return new Promise((res) => s.once(ev, res));
}

const host = connect();
await once(host, 'connect');
host.emit('createRoom', { nickname: 'Ana' });
const created = await once(host, 'roomCreated');
const code = created.roomCode;
console.log('sala criada:', code);

const p2 = connect();
const p3 = connect();
await Promise.all([once(p2, 'connect'), once(p3, 'connect')]);
p2.emit('joinRoom', { roomCode: code, nickname: 'Beto' });
const j2 = await once(p2, 'roomJoined');
p3.emit('joinRoom', { roomCode: code, nickname: 'Caio' });
const j3 = await once(p3, 'roomJoined');

host.emit('setReady', { ready: true });
p2.emit('setReady', { ready: true });
p3.emit('setReady', { ready: true });
await new Promise((r) => setTimeout(r, 150));

const firstPub = once(host, 'publicState');
host.emit('startGame');
const ph = await firstPub;
console.log('partida iniciada; fase:', ph.phase, 'vez de:', ph.currentPlayerId);

const bySocket = {
  [created.playerId]: host,
  [j2.playerId]: p2,
  [j3.playerId]: p3,
};
const actor = bySocket[ph.currentPlayerId];

const after = await new Promise((resolve) => {
  const handler = (s) => {
    if (s.stateVersion > ph.stateVersion) {
      actor.off('publicState', handler);
      resolve(s);
    }
  };
  actor.on('publicState', handler);
  actor.emit('command', {
    matchId: code,
    stateVersion: ph.stateVersion,
    commandId: randomUUID(),
    cmd: { type: 'DECLARE_ACTION', action: 'INCOME' },
  });
});

const actorAfter = after.players.find((p) => p.id === ph.currentPlayerId);
const ok = after.stateVersion === ph.stateVersion + 1 && actorAfter.coins === 3;
console.log('após Renda → version', after.stateVersion, 'moedas', actorAfter.coins);

for (const s of [host, p2, p3]) s.close();

if (ok) {
  console.log('SMOKE OK: fluxo sala→jogo→comando funcionou de ponta a ponta.');
  process.exit(0);
} else {
  console.error('SMOKE FALHOU.');
  process.exit(1);
}
