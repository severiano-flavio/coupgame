import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { loadConfig } from './config.js';
import { defaultRng } from './engine/index.js';
import { RoomManager } from './rooms/room-manager.js';
import { GameHub } from './net/game-hub.js';
import { registerConnection } from './net/connection.js';

const config = loadConfig();

const app = express();
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.clientOrigin, methods: ['GET', 'POST'] },
});

const rooms = new RoomManager({ rng: defaultRng });
const hub = new GameHub(io);

io.on('connection', (socket) => {
  registerConnection(io, socket, rooms, hub);
});

httpServer.listen(config.port, () => {
  console.log(`[coup-server] escutando na porta ${config.port} (origin: ${config.clientOrigin})`);
});
