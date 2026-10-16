# Protocolo Multiplayer — Coup 3D

Transporte: **Socket.IO**. Validação: **Zod** (todos os payloads de entrada).
Todos os contratos vivem em `packages/shared`. O servidor é autoritativo.

## 1. Envelope de comando (cliente → servidor)

Todo comando de jogo é enviado no evento `command` com envelope:

```ts
interface CommandEnvelope {
  matchId: string;        // partida alvo
  stateVersion: number;   // versão do estado que o cliente acredita ser atual
  commandId: string;      // UUID único (idempotência)
  cmd: GameCommand;       // intenção
}
```

`GameCommand` (discriminated union, refinada no design):

```ts
type GameCommand =
  | { type: "DECLARE_ACTION"; action: ActionType; targetId?: string }
  | { type: "CHALLENGE" }
  | { type: "BLOCK"; character: CharacterType }
  | { type: "PASS" }
  | { type: "SELECT_INFLUENCE"; cardId: string }
  | { type: "SELECT_EXCHANGE"; cardIds: string[] };
```

`ActionType`: `INCOME | FOREIGN_AID | COUP | TAX | ASSASSINATE | STEAL | EXCHANGE`.
`CharacterType`: `DUKE | ASSASSIN | CAPTAIN | AMBASSADOR | CONTESSA`.

## 2. Eventos de sala / lobby

Cliente → servidor (HTTP ou socket, definido no design):

- `createRoom { nickname }` → `{ roomCode, playerToken, playerId }`
- `joinRoom { roomCode, nickname }` → `{ playerToken, playerId }`
- `setReady { ready: boolean }`
- `startGame {}` (host) — exige 3–6 prontos
- `reconnect { roomCode, playerToken }`

## 3. Eventos servidor → cliente

- `lobbyState` — lista de jogadores, prontidão, host, código.
- `publicState` — `PublicState` (a todos).
- `privateState` — `PrivatePlayerState` (somente ao dono).
- `gameEvent` — eventos de log/animação (ação declarada, bloqueio, contestação,
  carta perdida, moedas movidas, troca, eliminação, fim de jogo).
- `timer` — fase atual, prazo absoluto do servidor (`deadline` em epoch ms).
- `commandRejected` — `{ commandId, reason }` (motivo tipado, sem estado interno).
- `error` — erro genérico de protocolo.

## 4. Regras de autorização (servidor)

Antes de processar qualquer comando, o servidor valida:

1. Identidade: o socket está associado a `playerId` via `playerToken`.
2. Participação: o `playerId` pertence à `matchId`/sala.
3. Fase/turno: o comando é permitido na fase atual.
   - `DECLARE_ACTION`: apenas o jogador da vez em `WAITING_ACTION`.
   - `CHALLENGE`: apenas em janelas de contestação, por jogador autorizado
     (não o declarante).
   - `BLOCK`: apenas em `BLOCK_WINDOW`, por jogador autorizado (Ajuda externa:
     qualquer adversário; Assassinato/Roubo: apenas o alvo).
   - `SELECT_INFLUENCE`: apenas o jogador que deve perder influência.
   - `SELECT_EXCHANGE`: apenas o jogador da vez em `EXCHANGE_SELECTION`.
   - `PASS`: apenas quem tem reação pendente na janela.
4. Ação permitida e consistente: alvo válido, custo pagável, cartas existentes.
   - Obrigação de Golpe com ≥10 moedas.
5. Idempotência/ordem: `commandId` não repetido; `stateVersion` atual.

Falha em qualquer item → `commandRejected` com motivo; o estado não muda.

> O servidor **nunca** confia em moedas, cartas, resultados ou propriedades
> enviadas pelo cliente (constituição §4, §5).

## 5. Sequenciamento e idempotência

- `stateVersion` é incrementada a cada mutação aceita.
- Comando com `stateVersion` < atual → rejeitado (`STALE_STATE`) para evitar
  ação baseada em visão antiga; o cliente reenvia após novo snapshot.
- `commandId` já visto → ignorado (resposta idempotente), prevenindo duplicados.
- Reações concorrentes: **first valid wins**; comandos subsequentes para a mesma
  janela recebem `WINDOW_CLOSED`.

## 6. Reconexão

1. Cliente guarda `roomCode` + `playerToken` (em memória/sessionStorage; token
   não é segredo de longo prazo, mas não é exposto a terceiros).
2. Ao reconectar: `reconnect { roomCode, playerToken }`.
3. Servidor reassocia socket↔jogador e reenvia `publicState`, `privateState` e
   `timer` correntes.
4. Dentro da tolerância (60 s) o jogador retoma normalmente. Fora dela, aplica
   política de desistência (game-rules.md §8.4).

## 7. Snapshots — exemplos

### PublicState (a todos)

```jsonc
{
  "matchId": "m_ab12",
  "stateVersion": 42,
  "phase": "ACTION_CHALLENGE",
  "currentPlayerId": "p_1",
  "pendingAction": { "action": "TAX", "byPlayerId": "p_1" },
  "players": [
    { "id": "p_1", "name": "Ana",  "coins": 2, "influenceCount": 2,
      "revealed": [], "connected": true, "eliminated": false, "seat": 0 },
    { "id": "p_2", "name": "Beto", "coins": 2, "influenceCount": 1,
      "revealed": ["ASSASSIN"], "connected": true, "eliminated": false, "seat": 1 }
  ],
  "deckCount": 11,
  "log": [ { "t": 1699999999, "kind": "DECLARE", "text": "Ana declarou Impostos" } ]
}
```

Nunca aparece aqui: as **cartas ocultas** de ninguém, a **ordem do baralho**,
RNG ou estado interno de resolução.

### PrivatePlayerState (somente ao dono `p_1`)

```jsonc
{
  "matchId": "m_ab12",
  "stateVersion": 42,
  "playerId": "p_1",
  "hand": [
    { "cardId": "c_7", "character": "DUKE",   "lost": false },
    { "cardId": "c_3", "character": "CAPTAIN","lost": false }
  ],
  "exchangeOffer": null   // preenchido só durante EXCHANGE_SELECTION do próprio
}
```

O `cardId` é opaco e estável para permitir seleção (`SELECT_INFLUENCE`,
`SELECT_EXCHANGE`) sem revelar nada de terceiros.

## 8. Motivos de rejeição (tipados)

`NOT_YOUR_TURN | INVALID_PHASE | NOT_AUTHORIZED | INVALID_TARGET |
INSUFFICIENT_COINS | MUST_COUP | STALE_STATE | DUPLICATE_COMMAND |
WINDOW_CLOSED | INVALID_SELECTION | UNKNOWN`.
