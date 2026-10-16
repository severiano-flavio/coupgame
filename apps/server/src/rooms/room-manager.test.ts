import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../engine/index.js';
import { RoomError, RoomManager } from './room-manager.js';

function mgr(): RoomManager {
  return new RoomManager({ rng: createSeededRng(1), now: () => 1000 });
}

describe('RoomManager', () => {
  it('cria sala com host e código', () => {
    const m = mgr();
    const { room, player } = m.createRoom('Ana');
    expect(room.code).toHaveLength(6);
    expect(player.isHost).toBe(true);
    expect(room.players.size).toBe(1);
  });

  it('permite entrar e lista no lobby', () => {
    const m = mgr();
    const { room } = m.createRoom('Ana');
    m.joinRoom(room.code, 'Beto');
    m.joinRoom(room.code, 'Caio');
    const lobby = m.toLobbyState(room);
    expect(lobby.players).toHaveLength(3);
    expect(lobby.players[0]!.isHost).toBe(true);
  });

  it('impede entrada após início', () => {
    const m = mgr();
    const { room, player } = m.createRoom('Ana');
    const b = m.joinRoom(room.code, 'Beto');
    const c = m.joinRoom(room.code, 'Caio');
    m.setReady(room.code, player.id, true);
    m.setReady(room.code, b.player.id, true);
    m.setReady(room.code, c.player.id, true);
    m.startGame(room.code, player.id);
    expect(() => m.joinRoom(room.code, 'Novo')).toThrow(RoomError);
  });

  it('só inicia com 3-6 prontos e apenas pelo host', () => {
    const m = mgr();
    const { room, player } = m.createRoom('Ana');
    const b = m.joinRoom(room.code, 'Beto');
    // apenas 2 jogadores → não pode iniciar
    expect(m.canStart(room)).toBe(false);
    const c = m.joinRoom(room.code, 'Caio');
    m.setReady(room.code, player.id, true);
    m.setReady(room.code, b.player.id, true);
    // falta c pronto
    expect(m.canStart(room)).toBe(false);
    m.setReady(room.code, c.player.id, true);
    expect(m.canStart(room)).toBe(true);
    // não-host não inicia
    expect(() => m.startGame(room.code, b.player.id)).toThrow(RoomError);
    const started = m.startGame(room.code, player.id);
    expect(started.phase).toBe('IN_GAME');
    expect(started.game).not.toBeNull();
  });

  it('reconecta por token restaurando conexão', () => {
    const m = mgr();
    const { room, player } = m.createRoom('Ana');
    m.attachSocket(room.code, player.id, 'sock1');
    m.markDisconnected('sock1');
    expect(room.players.get(player.id)!.connected).toBe(false);
    const r = m.reconnect(room.code, player.token, 'sock2');
    expect(r.player.connected).toBe(true);
    expect(r.player.socketId).toBe('sock2');
  });

  it('rejeita token inválido na reconexão', () => {
    const m = mgr();
    const { room } = m.createRoom('Ana');
    expect(() => m.reconnect(room.code, 'token-errado', 's')).toThrow(RoomError);
  });
});
