# Design — Coup 3D Multiplayer

Este design detalha modelos de dados, contratos, máquina de estados e
componentes, servindo de base para `tasks.md`. Alinhado à constituição e aos
docs em `docs/`.

## 1. Visão de alto nível

Monorepo pnpm com três pacotes: `@coup/shared` (contratos), `@coup/server`
(engine pura + rede + salas + snapshots + timers) e `@coup/web` (R3F + HUD).
O servidor é autoritativo; o cliente envia comandos e renderiza snapshots.

```text
web ──command──► server.net ──► engine.reducer ──► snapshots ──► web (public+private)
```

## 2. Contratos compartilhados (`packages/shared`)

### 2.1 Enums

```ts
export const CHARACTERS = ["DUKE","ASSASSIN","CAPTAIN","AMBASSADOR","CONTESSA"] as const;
export type CharacterType = (typeof CHARACTERS)[number];

export const ACTIONS = ["INCOME","FOREIGN_AID","COUP","TAX","ASSASSINATE","STEAL","EXCHANGE"] as const;
export type ActionType = (typeof ACTIONS)[number];

export const PHASES = ["LOBBY","DEALING","WAITING_ACTION","ACTION_CHALLENGE",
  "BLOCK_WINDOW","BLOCK_CHALLENGE","RESOLVING","INFLUENCE_SELECTION",
  "EXCHANGE_SELECTION","NEXT_TURN","GAME_OVER"] as const;
export type Phase = (typeof PHASES)[number];
```

### 2.2 Comandos e envelope (Zod)

```ts
import { z } from "zod";

export const gameCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("DECLARE_ACTION"),
             action: z.enum(ACTIONS), targetId: z.string().optional() }),
  z.object({ type: z.literal("CHALLENGE") }),
  z.object({ type: z.literal("BLOCK"), character: z.enum(CHARACTERS) }),
  z.object({ type: z.literal("PASS") }),
  z.object({ type: z.literal("SELECT_INFLUENCE"), cardId: z.string() }),
  z.object({ type: z.literal("SELECT_EXCHANGE"), cardIds: z.array(z.string()) }),
]);
export type GameCommand = z.infer<typeof gameCommandSchema>;

export const commandEnvelopeSchema = z.object({
  matchId: z.string(),
  stateVersion: z.number().int().nonnegative(),
  commandId: z.string().uuid(),
  cmd: gameCommandSchema,
});
export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;
```

### 2.3 Snapshots (saída, tipos — não precisam de Zod no cliente)

```ts
export interface PublicPlayer {
  id: string; name: string; seat: number;
  coins: number; influenceCount: number;
  revealed: CharacterType[];            // cartas perdidas (públicas)
  connected: boolean; eliminated: boolean;
}
export interface PublicState {
  matchId: string; stateVersion: number;
  phase: Phase; currentPlayerId: string | null;
  pendingAction?: { action: ActionType; byPlayerId: string; targetId?: string };
  pendingBlock?: { character: CharacterType; byPlayerId: string };
  players: PublicPlayer[];
  deckCount: number;
  log: PublicLogEntry[];
}
export interface PrivateCard { cardId: string; character: CharacterType; lost: boolean; }
export interface PrivatePlayerState {
  matchId: string; stateVersion: number; playerId: string;
  hand: PrivateCard[];
  exchangeOffer: PrivateCard[] | null; // só durante EXCHANGE_SELECTION do dono
}
export interface TimerState { phase: Phase; deadline: number | null; }
```

### 2.4 Eventos servidor→cliente

`lobbyState`, `publicState`, `privateState`, `gameEvent`, `timer`,
`commandRejected { commandId, reason }`, `error`. `reason` é a união tipada de
`docs/multiplayer-protocol.md §8`.

## 3. Engine (`apps/server/src/engine`) — pura

### 3.1 Estado interno

```ts
interface InternalCard { cardId: string; character: CharacterType; lost: boolean; }
interface InternalPlayer {
  id: string; name: string; seat: number;
  coins: number; cards: InternalCard[];  // SECRETO
  connected: boolean; eliminated: boolean;
}
interface PendingLoss { playerId: string; reason: "COUP"|"ASSASSINATE"|"CHALLENGE"; }
interface InternalState {
  matchId: string; stateVersion: number; phase: Phase;
  order: string[];              // ids em ordem horária
  turnIndex: number;            // índice em order do jogador da vez
  players: Record<string, InternalPlayer>;
  deck: InternalCard[];         // SECRETO (ordem)
  pending?: {                   // contexto da resolução em curso
    action?: { action: ActionType; by: string; target?: string };
    block?: { character: CharacterType; by: string };
    reactionDeadlineOwners?: string[]; // quem ainda pode reagir
    losses: PendingLoss[];      // perdas encadeadas a aplicar
    exchangeDraw?: InternalCard[]; // 2 cartas oferecidas na troca
  };
  winnerId?: string;
}
```

### 3.2 Reducer

```ts
interface EngineCtx { rng: () => number; now: () => number; }
interface EngineResult { state: InternalState; events: GameEventOut[]; }
function applyCommand(state: InternalState, actorId: string,
                      cmd: GameCommand, ctx: EngineCtx): EngineResult;
// pura, determinística; lança/retorna rejeição tipada em caso inválido.
```

Também expõe `applyTimeout(state, phase, ctx)` que injeta o efeito das políticas
D1–D3 como caminho de resolução único (ADR-5).

### 3.3 Deck

`createDeck()` (15 cartas), `shuffle(deck, rng)`, `draw(state)`,
`returnAndShuffle(state, cards)`. RNG injetado → testes determinísticos.

### 3.4 Resolução das ações (resumo da lógica)

- INCOME: coins += 1 → NEXT_TURN.
- FOREIGN_AID: → BLOCK_WINDOW (Duque, qualquer adversário). Sem bloqueio: +2.
- COUP: exige coins ≥ 7; coins −= 7; alvo → PendingLoss(COUP) →
  INFLUENCE_SELECTION. Se coins ≥ 10 no início do turno, só COUP é permitido.
- TAX: → ACTION_CHALLENGE (Duque). Resolve: +3.
- ASSASSINATE: exige coins ≥ 3; coins −= 3 **na declaração** (não restitui) →
  ACTION_CHALLENGE (Assassino) → BLOCK_WINDOW (Condessa, só alvo) → se segue,
  alvo → PendingLoss(ASSASSINATE).
- STEAL: → ACTION_CHALLENGE (Capitão) → BLOCK_WINDOW (Capitão/Embaixador, só
  alvo) → transfere min(2, vítima.coins).
- EXCHANGE: → ACTION_CHALLENGE (Embaixador) → RESOLVING saca 2 →
  EXCHANGE_SELECTION; mantém = influências ativas; devolve resto e embaralha.

Desafios e perdas encadeadas conforme `docs/game-rules.md §4` e a FSM em
`docs/architecture.md §4`. "First valid wins" nas janelas de reação.

## 4. Rede e salas (`apps/server/src/net`, `/rooms`)

- `RoomManager`: cria/retorna salas, códigos únicos, tokens de jogador, mapa
  socket↔player, estado por sala (InternalState + metadados de lobby).
- Handler `command`: valida envelope (Zod) → autoriza (identidade, sala, fase,
  turno) → checa `stateVersion`/`commandId` → `engine.applyCommand` → persiste
  (stateVersion++) → `snapshots` → emite.
- Idempotência: `Set<commandId>` por sala (com janela de retenção).
- Reconexão: `reconnect { roomCode, playerToken }` reassocia e reenvia estado.

## 5. Snapshots (`apps/server/src/snapshots`)

- `toPublicState(internal): PublicState` — remove toda carta oculta, deck,
  pending interno; expõe apenas contagens e cartas reveladas.
- `toPrivateState(internal, playerId): PrivatePlayerState` — somente a mão do
  dono e, se for a vez dele numa troca, `exchangeOffer`.
- Invariante testável: `toPublicState` não contém `character` de carta não
  revelada de ninguém.

## 6. Timers (`apps/server/src/timers`)

- Um timer por fase ativa, com `deadline` absoluto emitido no evento `timer`.
- Ao expirar, chama `engine.applyTimeout` e segue o mesmo pipeline de snapshots.
- Reset/limpeza em cada transição de fase e no encerramento da sala.

## 7. Cliente (`apps/web`)

### 7.1 Rede e estado
- `net/socket.ts`: conexão, reconexão com backoff, (re)emite `reconnect`.
- `useMatchSnapshot`: assina `publicState`/`privateState`/`timer`; expõe estado
  imutável a React (atualiza uma vez por mensagem).
- `store/ui.ts` (Zustand): seleção de alvo, animações on/off, sensibilidade de
  câmera, estado de conexão. **Nunca** estado de jogo autoritativo.

### 7.2 Cena 3D (`scene/`)
- `Table`, `Seats`, `Avatar`, `DeckCentral`, `PlayerCards`, `CoinStack`
  (instancing para moedas), `TurnIndicator`.
- Geometria/material memoizados; `dispose` ao desmontar; `useFrame` para
  animações mutando refs (sem setState por frame).

### 7.3 Câmera (`camera/SeatCamera.tsx`)
- Controle próprio: yaw limitado −95°..+95°, pitch −40°..+50°, sem translação.
- Suaviza entrada (lerp) com sensibilidade configurável; mouse + toque.
- Posição = cabeça do assento; olhar inicial ao centro; restaura na reconexão.

### 7.4 HUD (`ui/`)
- `ActionBar` (ações válidas conforme fase/saldo), `TargetPicker`,
  `ReactionPrompt` (contestar/bloquear/passar com timer), `InfluenceLossModal`,
  `ExchangeModal`, `Lobby`, `ConnectionBanner`, `GameLog`.
- Tudo acessível por HTML; jogável com animações desligadas.
- Botões derivam do estado público/privado e do próprio `playerId`; o cliente
  nunca decide resultado — apenas quais comandos oferecer.

## 8. Decisões de design

- Engine determinística com RNG/relógio injetados (testes + autoridade).
- Timeouts como comandos sintéticos (caminho único de resolução).
- `cardId` opaco e estável para seleção sem vazar identidade de terceiros.
- Snapshots como projeção pura (privacidade garantida no transporte).
- Zustand restrito a UI; snapshot é a verdade do jogo no cliente.

## 9. Tratamento de erros
- Entrada inválida → `commandRejected` tipado, estado inalterado.
- Erro interno → log + resposta genérica, sem vazar estado.
- Reconexão → banner + reemissão de estado; fora da tolerância → desistência.

## 10. Estratégia de testes (resumo; detalhe em docs/testing.md)
- Unidade engine (ações, desafios, bloqueios, FSM, casos-limite A1/A2).
- Integração net+engine+snapshots (autorização, idempotência, concorrência).
- Privacidade (sem vazamento em snapshots).
- E2E Playwright (sala, lobby, partida 3 abas, reconexão).
