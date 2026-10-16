# Arquitetura — Coup 3D Multiplayer

## 1. Visão geral

Arquitetura cliente-servidor autoritativa. O **servidor** é a única fonte de
verdade: contém o motor de regras, resolve todos os comandos e projeta
snapshots. O **cliente** renderiza o estado e envia intenções.

```text
┌──────────────────────────────┐           ┌──────────────────────────────────┐
│          apps/web            │           │            apps/server            │
│                              │           │                                   │
│  pages/ (home, room, game)   │  Socket   │  net/ (handlers + Zod)            │
│  ui/   (HUD, lobby) ─ Tailwind│◄────────►│    │                              │
│  scene/ (R3F: mesa, cartas)  │   .IO     │    ▼                              │
│  camera/ (yaw/pitch limits)  │           │  rooms/ (lobby, jogadores, recon) │
│  net/  (socket client)       │           │    │                              │
│  store/ (Zustand UI only)    │           │    ▼                              │
│                              │           │  engine/ (regras PURAS)           │
└──────────────────────────────┘           │    reducer: (state,cmd)->{state,  │
            ▲                               │              events}              │
            │ snapshots públicos/privados   │    ▼                              │
            └───────────────────────────────  snapshots/ (projeção por jogador)│
                                            │  timers/ (prazos de servidor)     │
                                            └──────────────────────────────────┘
                     ┌──────────────────────────────┐
                     │       packages/shared        │
                     │  tipos + schemas Zod + enums │
                     │  comandos, eventos, snapshots│
                     └──────────────────────────────┘
```

## 2. Módulos e responsabilidades

### packages/shared
Contratos públicos: `CharacterType`, `ActionType`, `Phase`, `GameCommand`,
eventos servidor→cliente, `PublicState`, `PrivatePlayerState`, schemas Zod.
Sem lógica de jogo. Importado por web e server.

### apps/server/engine (puro)
- `state/` — tipos do **estado interno completo** da partida (inclui dados
  secretos: cartas de todos, ordem do baralho).
- `deck.ts` — criação, embaralhamento (RNG injetável para testes), draw/return.
- `actions/` — regras de cada ação, bloqueio e desafio.
- `fsm/` — fases, transições válidas e guardas.
- `reducer.ts` — função pura `applyCommand(state, cmd, ctx) => { state, events }`.
  Determinística; RNG e relógio injetados. **Não** importa rede nem 3D.

### apps/server/rooms
Ciclo de vida de salas: criar, entrar por código, lobby/prontidão, início,
mapeamento assento↔jogador, reconexão e desistência. Mantém o estado interno
da engine por sala (em memória).

### apps/server/net
Única camada que fala Socket.IO no servidor. Recebe comandos, **valida com
Zod**, verifica autorização (identidade/sala/turno), chama a engine, dispara
snapshots e eventos. Trata idempotência (commandId) e ordenação.

### apps/server/snapshots
Projeta o estado interno em:
- **PublicState** — visível a todos (sem informação oculta).
- **PrivatePlayerState** — por jogador (apenas suas cartas e dados autorizados).
Garante a constituição §5: dados ocultos **nunca** saem no público.

### apps/server/timers
Temporizadores autoritativos por fase. Ao expirar, injeta o comando/efeito de
timeout documentado (políticas D1–D4 em game-rules.md §8).

### apps/web
- `net/` — cliente Socket.IO, reconexão, aplicação de snapshots.
- `store/` — Zustand **apenas para estado de UI** (seleção de alvo, animações
  on/off, câmera). Nunca estado de jogo autoritativo.
- `scene/` — R3F: mesa, cadeiras, cartas, moedas, instancing.
- `camera/` — controle próprio com limites de yaw (−95°..+95°) e pitch
  (−40°..+50°), sem translação.
- `ui/` — HUD, lobby, botões de ação, timers, overlays de desafio/bloqueio.

## 3. Fluxo de dados (um comando)

```text
cliente: emit("command", {matchId, stateVersion, commandId, cmd})
   │
   ▼
net: Zod.parse → autoriza (socket↔player↔room) → checa stateVersion/commandId
   │                                   │ inválido → emit("commandRejected", motivo)
   ▼ válido
engine.applyCommand(internalState, cmd, {rng, now})
   │ => { nextState, events[] }
   ▼
rooms: salva nextState (stateVersion++)
   │
   ▼
snapshots: projeta publicState + privateState por jogador
   │
   ▼
net: emit por socket → publicState a todos; privateState a cada dono; events
```

## 4. Máquina de estados (FSM)

Fases e **transições válidas explícitas**. Nem toda ação passa por todas.

```text
LOBBY
  └─(start, 3–6 prontos)→ DEALING

DEALING
  └─(cartas e moedas distribuídas)→ WAITING_ACTION

WAITING_ACTION                      (jogador da vez declara)
  ├─ Renda ─────────────────────────→ RESOLVING
  ├─ Golpe (paga 7) ────────────────→ INFLUENCE_SELECTION (alvo escolhe)
  ├─ Ajuda externa ─────────────────→ BLOCK_WINDOW
  ├─ Impostos/Roubo/Troca (char) ───→ ACTION_CHALLENGE
  └─ Assassinato (char, paga 3) ────→ ACTION_CHALLENGE

ACTION_CHALLENGE                    (adversários: CHALLENGE | PASS)
  ├─ ninguém contesta ──────────────→ (ação bloqueável?) BLOCK_WINDOW : RESOLVING
  ├─ contestação, declarante TINHA ─→ (contestante perde infl.) → segue p/ BLOCK_WINDOW|RESOLVING
  └─ contestação, declarante NÃO tinha → ação falha → INFLUENCE_SELECTION (declarante)

BLOCK_WINDOW                        (autorizados: BLOCK char | PASS)
  ├─ ninguém bloqueia ──────────────→ RESOLVING
  └─ alguém bloqueia (declara char) → BLOCK_CHALLENGE

BLOCK_CHALLENGE                     (adversários: CHALLENGE o bloqueio | PASS)
  ├─ ninguém contesta ──────────────→ ação ORIGINAL impedida → NEXT_TURN
  ├─ contestação, bloqueador TINHA ─→ contestante perde infl. → ação impedida → NEXT_TURN
  └─ contestação, bloqueador NÃO tinha → bloqueador perde infl. → ação prossegue → RESOLVING

RESOLVING                           (aplica efeitos atômicos)
  ├─ efeito remove influência ──────→ INFLUENCE_SELECTION
  ├─ ação = Troca ──────────────────→ EXCHANGE_SELECTION
  └─ efeito simples (moedas) ───────→ NEXT_TURN

INFLUENCE_SELECTION                 (jogador afetado: SELECT_INFLUENCE)
  └─(carta revelada permanentemente)→ (vitória?) GAME_OVER : (há efeito pendente?) RESOLVING : NEXT_TURN

EXCHANGE_SELECTION                  (jogador da vez: SELECT_EXCHANGE)
  └─(mantém N, devolve resto, embaralha)→ NEXT_TURN

NEXT_TURN
  ├─ só resta 1 jogador vivo ───────→ GAME_OVER
  └─ próximo vivo (horário) ────────→ WAITING_ACTION

GAME_OVER (terminal)
```

Notas de resolução:
- **Concorrência de reações:** em `ACTION_CHALLENGE`, `BLOCK_WINDOW`,
  `BLOCK_CHALLENGE`, o **primeiro comando válido** recebido prevalece.
- **Assassinato:** o custo (3) é debitado em `WAITING_ACTION`/`ACTION_CHALLENGE`
  (na declaração) e não é restituído, mesmo em bloqueio/contestação bem-sucedidos.
- **Pendências encadeadas:** uma contestação pode gerar perda de influência do
  contestante **e** depois a ação prosseguir, podendo gerar nova perda. O
  `RESOLVING` encadeia `INFLUENCE_SELECTION` quantas vezes necessário, de forma
  atômica e sequencial.

## 5. Segregação de informação privada

- O **estado interno** (engine) contém tudo (cartas de todos, deck).
- **Nunca** é serializado para o cliente diretamente.
- `snapshots/` produz:
  - `PublicState`: jogadores (id, nome, nº de moedas, nº de influências ativas,
    cartas **perdidas/reveladas**), fase, de quem é a vez, timers, log público.
  - `PrivatePlayerState`: apenas as **cartas ocultas do próprio jogador** e,
    quando aplicável, as **cartas oferecidas numa troca** (visíveis só a ele).
- Testes de privacidade (ver testing.md) verificam que nenhum campo oculto
  aparece no `PublicState` nem no privado de outro jogador.

## 6. Idempotência, versão e reconexão

- Cada comando carrega `matchId`, `stateVersion` (otimista) e `commandId` único.
- O servidor rejeita comandos com `stateVersion` desatualizada ou `commandId`
  já processado (idempotência), evitando duplicados/atrasados.
- Reconexão: o cliente reautentica com um token de sessão da sala; o servidor
  reassocia socket↔jogador, reenvia `PublicState` + `PrivatePlayerState` atuais
  e o timer corrente da fase.

## 7. Decisões arquiteturais (ADRs resumidos)

- **ADR-1 Engine pura e determinística.** RNG e relógio injetados → testes
  reprodutíveis e autoridade do servidor (constituição §4, §9).
- **ADR-2 Snapshots por jogador.** Privacidade garantida no transporte, não só
  na UI (constituição §5).
- **ADR-3 Estado em memória no MVP.** Simplicidade; sala some ao encerrar.
  Reavaliar persistência pós-MVP.
- **ADR-4 Reações "first valid wins".** Resolve concorrência de forma
  determinística pela ordem de chegada no servidor.
- **ADR-5 Timeouts como comandos sintéticos.** O timer injeta o mesmo tipo de
  efeito que um comando real → caminho único de resolução.
