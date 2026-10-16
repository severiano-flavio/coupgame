# Stack Tecnológica — Coup 3D

Versões fixadas em `package.json`. Usar apenas versões estáveis verificadas na
documentação oficial. Não inventar APIs.

## Monorepo

- **pnpm workspaces** — gerenciador de pacotes e orquestração do monorepo.
- Workspaces: `apps/web`, `apps/server`, `packages/shared`.

## Frontend (`apps/web`)

- **React 19 + TypeScript** (strict).
- **Vite** — bundler e dev server.
- **Three.js** + **@react-three/fiber v9** (pareado com React 19) +
  **@react-three/drei v10** (linha 10.7.x, estável, peer `fiber ^9`).
- **Tailwind CSS** — interfaces HTML sobrepostas ao Canvas.
- **Zustand** — apenas estado de interface do cliente (não estado de jogo).
- **socket.io-client** — transporte em tempo real.

> Nota: R3F v10 / drei v11 estão em alpha nesta data (out/2026). O MVP usa a
> linha estável: fiber v9 + drei 10.7.x. Reavaliar quando v10/v11
> estabilizarem (ver constituição §3).

## Backend (`apps/server`)

- **Node.js + TypeScript** (strict).
- **Express** — HTTP (criar/consultar salas, health).
- **Socket.IO** — eventos de jogo em tempo real.
- **Zod** — validação de todas as mensagens de entrada.
- **Motor de regras independente da interface** — sem imports de rede ou 3D.
- Estado das partidas **em memória** no MVP.

## Contratos (`packages/shared`)

- Tipos TypeScript compartilhados entre web e server.
- Schemas Zod dos comandos e eventos.
- Enums de cartas, ações, fases.
- **Snapshots públicos e privados** definidos aqui.
- Nunca colocar lógica de engine aqui; apenas contratos e tipos.

## Qualidade

- **ESLint + Prettier** — lint e formatação consistentes.
- **Vitest** — testes unitários e de integração (engine, protocolo).
- **Playwright** — testes E2E quando viável (fluxo de sala, partida).
- TypeScript `strict: true` em todos os pacotes.

## Comandos (padrão, documentados no README)

Na raiz:

- `pnpm install` — instala tudo.
- `pnpm dev` — sobe web + server em paralelo.
- `pnpm --filter @coup/server dev` — só o servidor.
- `pnpm --filter @coup/web dev` — só o front.
- `pnpm test` — testes unitários/integração.
- `pnpm lint` / `pnpm format` — qualidade.
- `pnpm build` — build de produção de todos os pacotes.

> Processos de longa duração (dev server, watchers) devem ser executados
> manualmente pelo usuário no terminal — não bloquear o agente com eles.

## Variáveis de ambiente

- `apps/server`: `PORT`, `CLIENT_ORIGIN` (CORS), `NODE_ENV`.
- `apps/web`: `VITE_SERVER_URL`.
- Nenhum segredo versionado. `.env` sempre no `.gitignore`.
