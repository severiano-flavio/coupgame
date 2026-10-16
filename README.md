# Coup 3D — Multiplayer Online

Jogo online 3D baseado nas regras clássicas de **Coup** (edição básica).
De 3 a 6 jogadores competem por influência numa mesa virtual, com estratégia,
blefes, desafios e eliminações. Roda no navegador, com salas privadas por link.

> Interface em português brasileiro. O servidor é a única fonte de verdade das
> regras; o cliente apenas envia intenções e renderiza o estado.

## Stack

- **Frontend:** React 19 + TypeScript + Vite, Three.js + React Three Fiber +
  Drei, Tailwind CSS, Zustand (estado de UI), socket.io-client.
- **Backend:** Node.js + TypeScript, Express + Socket.IO, Zod, motor de regras
  independente da interface (estado em memória no MVP).
- **Ferramentas:** pnpm workspaces, ESLint + Prettier, Vitest, Playwright.

## Estrutura

```text
apps/web        # cliente React + Three.js
apps/server     # API + Socket.IO + motor de regras
packages/shared # contratos e tipos compartilhados
docs/           # regras, arquitetura, padrões, protocolo, testes
.kiro/          # steering (constituição etc.) e spec coup-3d
```

Detalhes em `.kiro/steering/structure.md` e `docs/architecture.md`.

## Pré-requisitos

- Node.js LTS (≥ 20).
- pnpm (`npm i -g pnpm`).

## Instalação

```bash
pnpm install
```

## Desenvolvimento

```bash
pnpm dev                          # sobe web + server
pnpm --filter @coup/server dev    # apenas o servidor
pnpm --filter @coup/web dev       # apenas o cliente
```

> Dev servers são processos de longa duração: execute-os você mesmo no terminal.

## Testes

```bash
pnpm test                         # unidade + integração (Vitest)
pnpm --filter @coup/server test   # engine e servidor
pnpm e2e                          # Playwright (quando configurado)
```

## Build de produção

```bash
pnpm build
```

## Variáveis de ambiente

Servidor (`apps/server/.env`):

```ini
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Cliente (`apps/web/.env`):

```ini
VITE_SERVER_URL=http://localhost:3001
```

> `.env` nunca é versionado. Nenhum segredo no frontend (constituição §14).

## Como criar e entrar numa sala

1. Abra o cliente (`http://localhost:5173`).
2. Informe um apelido e clique em **Criar sala** — você recebe um código/link.
3. Compartilhe o link; outros entram pelo código ou link de convite.
4. No lobby, cada jogador marca **Pronto**.
5. Com 3 a 6 prontos, o host inicia a partida.
6. Após o início, novos jogadores não entram (MVP).

## Limitações conhecidas (MVP)

- Variante de 2 jogadores fora do escopo.
- Estado das partidas em memória: reiniciar o servidor encerra as salas.
- Sem bots, chat de voz, ranking, loja, autenticação social ou matchmaking.
- Ambiguidades de regra registradas em `docs/game-rules.md §9` (A1, A2).
- Adaptações digitais (timers, timeouts, desistência) em `docs/game-rules.md §8`.
- Testes E2E de UI no navegador (Playwright) ainda não automatizados; o fluxo
  cliente-servidor é coberto por testes e2e de Socket.IO e o cliente por
  typecheck/build (ver `docs/testing.md §10`).
- Escala horizontal exigiria adaptador de Socket.IO (ex.: Redis) e persistência
  — fora do escopo do MVP.

## Documentação

- Regras: `docs/game-rules.md`
- Arquitetura e máquina de estados: `docs/architecture.md`
- Padrões de engenharia: `docs/engineering-standards.md`
- Protocolo multiplayer: `docs/multiplayer-protocol.md`
- Testes: `docs/testing.md`
- Governança (constituição e steering): `.kiro/steering/`
- Spec da feature: `.kiro/specs/coup-3d/`

## Deploy

A arquitetura separa um **servidor** (precisa de WebSockets) de um **cliente
estático** (build Vite). Não exige banco de dados no MVP (estado em memória).

### Servidor (`apps/server`)

1. `pnpm --filter @coup/server build` gera `apps/server/dist`.
2. Execute `node apps/server/dist/index.js` em um host que suporte conexões
   WebSocket persistentes (ex.: Render, Railway, Fly.io, uma VM, ou um
   container). Plataformas puramente serverless/edge sem WebSocket de longa
   duração **não** são adequadas.
3. Variáveis: `PORT` (porta de escuta), `CLIENT_ORIGIN` (origem do cliente para
   CORS), `NODE_ENV=production`.
4. Garanta que o proxy/reverse-proxy encaminhe o upgrade de WebSocket
   (`Connection: upgrade`). Em Nginx, habilite `proxy_set_header Upgrade` e
   `proxy_set_header Connection "upgrade"`.

### Cliente (`apps/web`)

1. Defina `VITE_SERVER_URL` apontando para a URL pública do servidor.
2. `pnpm --filter @coup/web build` gera `apps/web/dist` (estático).
3. Sirva `apps/web/dist` em qualquer host estático/CDN (Netlify, Vercel estático,
   S3+CloudFront, Nginx). O bundle é dividido em chunks (`three`, `react`,
   `vendor`, `net`, app) para melhor cache.

### Notas

- Ajuste o CORS do servidor via `CLIENT_ORIGIN` para a origem exata do cliente.
- Sem segredos no cliente; `VITE_SERVER_URL` é a única variável pública.
- Para escalar horizontalmente além do MVP seria necessário um adaptador de
  Socket.IO (ex.: Redis) e persistência de estado — fora do escopo atual.

## Licença e assets

Assets 3D procedurais ou de licença livre apenas. Nenhum material proprietário
de terceiros (constituição §15). Coup é um jogo de Rikki Tahta; esta é uma
implementação não oficial para fins de estudo.
