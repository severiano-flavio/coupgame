import { z } from 'zod';
import { ACTIONS } from './actions.js';
import { CHARACTERS } from './cards.js';

/**
 * Comandos (intenções) do cliente → servidor. Ver docs/multiplayer-protocol.md §1.
 * O servidor é a autoridade: estes são apenas pedidos, nunca resultados.
 */
export const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('DECLARE_ACTION'),
    action: z.enum(ACTIONS),
    targetId: z.string().min(1).optional(),
  }),
  z.object({ type: z.literal('CHALLENGE') }),
  z.object({ type: z.literal('BLOCK'), character: z.enum(CHARACTERS) }),
  z.object({ type: z.literal('PASS') }),
  z.object({ type: z.literal('SELECT_INFLUENCE'), cardId: z.string().min(1) }),
  z.object({ type: z.literal('SELECT_EXCHANGE'), cardIds: z.array(z.string().min(1)) }),
]);

export type GameCommand = z.infer<typeof gameCommandSchema>;

/** Envelope de transporte com idempotência e versão de estado. */
export const commandEnvelopeSchema = z.object({
  matchId: z.string().min(1),
  stateVersion: z.number().int().nonnegative(),
  commandId: z.string().uuid(),
  cmd: gameCommandSchema,
});

export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;

/* --- Comandos de sala / lobby --- */

export const createRoomSchema = z.object({ nickname: z.string().min(1).max(24) });
export type CreateRoomCommand = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  roomCode: z.string().min(1),
  nickname: z.string().min(1).max(24),
});
export type JoinRoomCommand = z.infer<typeof joinRoomSchema>;

export const setReadySchema = z.object({ ready: z.boolean() });
export type SetReadyCommand = z.infer<typeof setReadySchema>;

export const reconnectSchema = z.object({
  roomCode: z.string().min(1),
  playerToken: z.string().min(1),
});
export type ReconnectCommand = z.infer<typeof reconnectSchema>;
