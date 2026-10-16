# Plano de Implementação — Coup 3D

Tarefas pequenas e verificáveis, organizadas pelas etapas do projeto. Cada
tarefa referencia requisitos de `requirements.md`. Marcar concluída apenas com
critérios de aceite atendidos e verificados (constituição §16).

Convenção: `[ ]` pendente, `[-]` em progresso, `[x]` concluída.

---

## Etapa 0 — Especificação e governança (concluída)

- [x] 0.1 Criar constituição e steering (product, tech, structure).
- [x] 0.2 Criar docs: game-rules, architecture, engineering-standards,
  multiplayer-protocol, testing; e README.
- [x] 0.3 Criar spec: requirements, design, tasks.
  - _Aceite: documentação consistente, sem regras conflitantes nem contratos
    indefinidos._

## Etapa 1 — Fundação técnica

- [ ] 1.1 Inicializar monorepo pnpm (`pnpm-workspace.yaml`, `package.json` raiz,
  `tsconfig.base.json`, ESLint + Prettier).
  - _Req: 10.1, 10.5_
- [ ] 1.2 Criar `packages/shared` com enums, schemas Zod de comandos/envelope e
  tipos de snapshot/eventos; configurar Vitest.
  - _Req: 2.1, 3.2_
- [ ] 1.3 Criar `apps/server` (Express + Socket.IO + TS strict), endpoint de
  health e bootstrap; CORS por `CLIENT_ORIGIN`.
  - _Req: 2.1, 10.4, 10.5_
- [ ] 1.4 Criar `apps/web` (Vite + React 19 + TS + Tailwind), cliente Socket.IO
  básico e banner de conexão.
  - _Req: 9.1, 10.5_
- [ ] 1.5 Cena 3D mínima: `Canvas`, `Table`, assentos placeholder, luz.
  - _Req: 8.1_
- [ ] 1.6 Verificar que ≥3 instâncias de navegador conectam de forma
  independente (echo de presença).
  - _Aceite da etapa: apps rodam localmente e três clientes conectam._

## Etapa 2 — Motor de regras (engine pura)

- [ ] 2.1 Modelar estado interno, jogadores, cartas, moedas, ordem e turnos.
  - _Req: 6.1, 6.3_
- [ ] 2.2 Deck: `createDeck` (15 cartas), `shuffle`/`draw`/`returnAndShuffle`
  com RNG injetado + testes deterministas.
  - _Req: 4.8, 5.2_
- [ ] 2.3 FSM: fases e transições válidas explícitas + guardas; rejeição
  `INVALID_PHASE`.
  - _Req: 6.1, 6.2_
- [ ] 2.4 Ações sem personagem: Renda, Golpe (custo 7, `MUST_COUP` ≥10).
  - _Req: 4.1, 4.3, 4.4_
- [ ] 2.5 Ajuda externa + bloqueio por Duque + contestação do bloqueio.
  - _Req: 4.2, 5.5, 5.6_
- [ ] 2.6 Impostos, Roubo, Assassinato, Troca com janelas de contestação.
  - _Req: 4.5, 4.6, 4.7, 4.8_
- [ ] 2.7 Desafios: posse/ausência da carta, substituição, perda e falha;
  `SELECT_INFLUENCE`.
  - _Req: 5.1, 5.2, 5.3, 5.4_
- [ ] 2.8 Perdas encadeadas e atomicidade em RESOLVING; casos-limite A1/A2.
  - _Req: 4.6, 5.3, 6.5_
- [ ] 2.9 Troca (Embaixador) completa com `SELECT_EXCHANGE` e reembaralho.
  - _Req: 4.8_
- [ ] 2.10 Vitória e GAME_OVER (último com influência).
  - _Req: 6.4_
- [ ] 2.11 `applyTimeout` com políticas D1–D3.
  - _Req: 7.3, 7.4_
- [ ] 2.12 Cobertura de testes da matriz (docs/testing.md §3): partida completa
  dirigida por comandos, sem Three.js.
  - _Aceite da etapa: partida completa executável por comandos; suíte verde._

## Etapa 3 — Multiplayer funcional

- [ ] 3.1 `RoomManager`: criar/entrar por código, tokens, lobby, prontidão,
  atribuição de assentos e sorteio de ordem.
  - _Req: 1.1–1.6_
- [ ] 3.2 Handler `command`: Zod + autorização (identidade/sala/fase/turno) +
  `stateVersion`/`commandId` + chamada à engine.
  - _Req: 2.2, 2.3, 2.5, 2.6_
- [ ] 3.3 Snapshots público/privado e emissão por socket (dono recebe privado).
  - _Req: 3.1, 3.2, 3.3_
- [ ] 3.4 Timers de servidor + evento `timer` com deadline; integração com
  `applyTimeout`.
  - _Req: 7.1, 7.2, 7.3, 7.4_
- [ ] 3.5 Reconexão (restaura identidade/assento/privado) e desistência D4.
  - _Req: 7.5, 7.6_
- [ ] 3.6 Testes de integração: concorrência (first valid wins / WINDOW_CLOSED),
  idempotência, STALE_STATE, privacidade.
  - _Req: 2.5, 2.6, 3.4, 5.7_
- [ ] 3.7 Validar: três navegadores concluem uma partida com estado consistente.
  - _Aceite da etapa._

## Etapa 4 — Interface 3D jogável

- [ ] 4.1 `SeatCamera`: yaw −95°..+95°, pitch −40°..+50°, sem translação,
  mouse+toque, suavização, restauração por assento.
  - _Req: 8.2, 8.3, 8.4, 8.5_
- [ ] 4.2 Render de jogadores/avatares, cartas próprias legíveis, adversárias
  viradas, perdidas marcadas; moedas com instancing + contador.
  - _Req: 8.1, 8.6, 10.2, 10.3_
- [ ] 4.3 HUD: `ActionBar`, `TargetPicker`, `ReactionPrompt` (com timer),
  `InfluenceLossModal`, `ExchangeModal`, `GameLog`, indicador de vez.
  - _Req: 9.1, 9.2, 9.3, 9.6_
- [ ] 4.4 Animações leves (moedas, virar carta, alvo) com toggle; jogo legível
  com animações off; sem bloquear seleção.
  - _Req: 9.4, 9.5_
- [ ] 4.5 Validar: partida completa jogável pela UI, sem comandos de dev.
  - _Aceite da etapa._

## Etapa 5 — Validação e entrega

- [ ] 5.1 Rodar unidade + integração; corrigir falhas.
  - _Req: 10.6_
- [ ] 5.2 E2E Playwright (sala, lobby, partida 3 abas, reconexão) quando viável.
  - _Req: 1.*, 7.5_
- [ ] 5.3 Partidas com 3, 4, 5 e 6 jogadores; validar consistência.
  - _Req: 6.*_
- [ ] 5.4 Auditar ausência de vazamento de cartas ocultas (testes + inspeção).
  - _Req: 3.1, 3.4_
- [ ] 5.5 Otimizar render/carregamento; verificar descarte de recursos 3D.
  - _Req: 10.2, 10.3_
- [ ] 5.6 Documentar deploy com WebSockets; validar build de produção.
  - _Req: 10.6_
  - _Aceite da etapa: MVP funcional, documentado, reproduzível, sem falhas
    conhecidas que impeçam concluir uma partida._

---

## Dependências entre etapas

- Etapa 1 depende de 0. Etapa 2 depende de 1.2 (shared). Etapa 3 depende de 2 e
  1.3. Etapa 4 depende de 3 (snapshots) e 1.4/1.5. Etapa 5 depende de 2–4.
- Regra: antes de iniciar uma etapa, confirmar que contratos, requisitos e
  dependências estão definidos (constituição §3, §16).
