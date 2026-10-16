// Verificação da Etapa 1: três clientes conectam de forma independente.
// Executar a partir de apps/web (tem socket.io-client instalado), com o
// servidor rodando na porta 3001.
import { io } from 'socket.io-client';

const URL = process.env.VITE_SERVER_URL ?? 'http://localhost:3001';
const CLIENTS = 3;

const sockets = [];
let maxOnline = 0;

function connectOne(i) {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ['websocket'], reconnection: false });
    sockets.push(s);
    s.on('connect', () => console.log(`cliente ${i} conectado: ${s.id}`));
    s.on('presence', (p) => {
      maxOnline = Math.max(maxOnline, p.online);
    });
    s.on('connect_error', reject);
    setTimeout(resolve, 400);
  });
}

for (let i = 1; i <= CLIENTS; i++) {
  await connectOne(i);
}

await new Promise((r) => setTimeout(r, 600));

console.log(`pico de clientes online observado: ${maxOnline}`);
for (const s of sockets) s.close();

if (maxOnline >= CLIENTS) {
  console.log(`OK: ${CLIENTS} clientes conectaram de forma independente.`);
  process.exit(0);
} else {
  console.error(`FALHA: esperado >= ${CLIENTS}, observado ${maxOnline}.`);
  process.exit(1);
}
