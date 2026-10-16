# Estrutura do Projeto — Coup 3D

## Árvore do monorepo

```text
coup/
├─ apps/
│  ├─ web/                      # React + Three.js (cliente)
│  │  ├─ src/
│  │  │  ├─ scene/              # Componentes R3F (mesa, cadeiras, cartas, moedas)
│  │  │  ├─ camera/             # Controle de câmera limitado por assento
│  │  │  ├─ ui/                 # HUD, lobby, menus (HTML + Tailwind)
│  │  │  ├─ net/                # Cliente Socket.IO, hooks de conexão
│  │  │  ├─ store/              # Zustand (estado de UI apenas)
│  │  │  ├─ pages/              # Rotas (home, sala, jogo)
│  │  │  └─ main.tsx
│  │  └─ ...config
│  └─ server/                   # API + Socket.IO + game engine
│     ├─ src/
│     │  ├─ engine/             # Motor de regras PURO (sem rede/3D)
│     │  │  ├─ state/           # Tipos de estado interno da partida
│     │  │  ├─ actions/         # Ações, bloqueios, desafios
│     │  │  ├─ fsm/             # Máquina de estados (fases e transições)
│     │  │  ├─ deck.ts          # Baralho, embaralhamento, draw
│     │  │  └─ reducer.ts       # applyCommand(state, cmd) -> {state, events}
│     │  ├─ rooms/              # Salas, lobby, jogadores, reconexão
│     │  ├─ net/                # Handlers Socket.IO, validação Zod
│     │  ├─ snapshots/          # Projeção pública/privada do estado
│     │  ├─ timers/             # Temporizadores de servidor
│     │  └─ index.ts            # Express + Socket.IO bootstrap
│     └─ ...config
├─ packages/
│  └─ shared/                   # Contratos públicos e tipos compartilhados
│     └─ src/
│        ├─ cards.ts            # CharacterType, cartas
│        ├─ actions.ts          # ActionType
│        ├─ commands.ts         # GameCommand + schemas Zod
│        ├─ events.ts           # Eventos servidor->cliente + schemas
│        ├─ snapshots.ts        # PublicState, PrivatePlayerState
│        ├─ phases.ts           # Phase (FSM)
│        └─ index.ts
├─ docs/
│  ├─ game-rules.md
│  ├─ architecture.md
│  ├─ engineering-standards.md
│  ├─ multiplayer-protocol.md
│  └─ testing.md
├─ .kiro/
│  ├─ steering/                 # constitution, product, tech, structure
│  └─ specs/coup-3d/            # requirements, design, tasks
├─ package.json                 # raiz: workspaces + scripts
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md
```

## Regras de dependência entre camadas

- `packages/shared` **não depende** de nada do projeto.
- `apps/server/engine` depende apenas de `shared`. **Nunca** importa Socket.IO,
  Express, nem nada de `apps/web`.
- `apps/server/net` liga a engine ao transporte; valida com Zod; projeta
  snapshots. É a única camada que fala Socket.IO no servidor.
- `apps/web` depende de `shared`. **Nunca** importa de `apps/server`.
- Fluxo de informação: cliente → comando → `net` (valida) → `engine` (resolve)
  → `snapshots` (projeta público/privado) → clientes autorizados.

## Convenções

- Nomes de arquivos: `kebab-case.ts`; componentes React em `PascalCase.tsx`.
- Tipos e enums compartilhados sempre em `packages/shared`.
- Pacotes nomeados `@coup/web`, `@coup/server`, `@coup/shared`.
- Nenhuma lógica de regra fora de `apps/server/engine`.
- Nenhum dado oculto nos snapshots públicos (ver constituição §5).
