# Estratégia de Testes — Coup 3D

Ferramentas: **Vitest** (unidade/integração), **Playwright** (E2E quando
viável). Nenhum teste fictício ou mock que esconda erro (constituição §11).

## 1. Camadas de teste

| Camada            | Alvo                                   | Ferramenta  |
|-------------------|----------------------------------------|-------------|
| Unidade — engine  | ações, desafios, bloqueios, deck, FSM  | Vitest      |
| Unidade — shared  | schemas Zod (comandos/eventos)         | Vitest      |
| Integração        | net + engine + snapshots (sem browser) | Vitest      |
| Privacidade       | snapshots não vazam dados ocultos      | Vitest      |
| E2E               | sala, lobby, partida 3+ clientes       | Playwright  |

## 2. Determinismo

A engine recebe **RNG e relógio injetados**. Testes usam seed fixa para
embaralhamento e draws reprodutíveis. Nenhum teste depende de aleatoriedade
real nem de `Date.now()`.

## 3. Matriz de cenários (engine)

### Ações
- Renda: +1 moeda; não contestável/bloqueável.
- Ajuda externa: +2; bloqueável por Duque; bloqueio contestável.
- Golpe: paga 7; alvo perde influência; obrigatório com ≥10 moedas; não
  contestável/bloqueável.
- Impostos (Duque): +3; contestável.
- Assassinato: paga 3 na declaração (não restitui); bloqueável por Condessa
  (só o alvo); contestável.
- Roubo (Capitão): até 2, limitado ao saldo da vítima; bloqueável por Capitão
  ou Embaixador (só o alvo); contestável.
- Troca (Embaixador): compra 2, mantém N conforme influências ativas, devolve e
  embaralha; contestável.

### Desafios
- Declarante tinha a carta → contestante perde influência; carta devolvida,
  embaralhada e substituída; ação prossegue.
- Declarante não tinha → declarante perde influência; ação falha.
- Escolha de carta a perder (`SELECT_INFLUENCE`); carta perdida não volta ao
  baralho.

### Bloqueios
- Bloqueio não contestado → ação original impedida.
- Bloqueio contestado e comprovado → contestante perde influência; ação impedida.
- Bloqueio contestado e desmentido → bloqueador perde influência; ação prossegue.

### Casos-limite (ver game-rules.md §6 e §9)
- Assassinato + custo mantido sob bloqueio/contestação bem-sucedidos.
- Alvo com 1 influência que contesta Assassino verdadeiro e perde (A1).
- Roubo com vítima de 0 e de 1 moeda.
- Troca com 1 influência ativa (mantém 1).
- Obrigação de Golpe com ≥10 moedas (outras ações rejeitadas).
- Baralho em situações de borda (A2) sem travar.

### FSM
- Transições válidas e inválidas por fase.
- Encadeamento de perdas de influência em `RESOLVING`.
- Vitória: último jogador vivo → `GAME_OVER`.

## 4. Concorrência (integração)
- Duas contestações simultâneas → **first valid wins**; a segunda recebe
  `WINDOW_CLOSED`.
- Comando duplicado (`commandId` repetido) → idempotente, estado inalterado.
- Comando com `stateVersion` velha → `STALE_STATE`.

## 5. Privacidade (integração)
- Para cada fase relevante, serializar `PublicState` e `PrivatePlayerState` de
  um jogador e **asserir** que nenhum campo contém cartas ocultas de terceiros,
  ordem do baralho ou estado interno de resolução.

## 6. Temporizadores (integração)
- Expiração de janela de reação = `PASS`.
- Expiração de `INFLUENCE_SELECTION` = política D1 (determinística).
- Expiração de `EXCHANGE_SELECTION` = política D2 (preserva originais).
- Expiração de `WAITING_ACTION` = política D3.

## 7. E2E (Playwright, quando viável)
- Criar sala, obter link, 3 abas entram, ficam prontas, host inicia.
- Jogar uma partida curta até `GAME_OVER` com estado consistente nas 3 abas.
- Reconexão: fechar e reabrir uma aba dentro da tolerância restaura assento e
  mão privada.

## 8. Execução

```bash
pnpm test                       # todos os testes de unidade/integração
pnpm --filter @coup/server test # só engine/servidor
pnpm --filter @coup/shared test # só schemas
pnpm e2e                        # Playwright (quando configurado)
```

## 9. Resultados esperados
- Suíte de unidade/integração **verde** antes de concluir cada etapa.
- Build de produção sem erros de tipo.
- Zero vazamento de informação oculta nos testes de privacidade.

## 10. Resultados obtidos (MVP)

Estado atual da suíte automatizada:

- `@coup/shared`: 9 testes (schemas Zod de comandos/envelope).
- `@coup/server`: 72 testes, cobrindo:
  - **engine** — deck, setup, todas as ações, desafios, bloqueios, troca,
    timeouts (D1–D3), partida completa até GAME_OVER e imutabilidade;
  - **tamanhos** — partidas completas para 3, 4, 5 e 6 jogadores com auditoria
    de privacidade a cada passo e conservação das 15 cartas;
  - **snapshots** — projeção pública/privada e auditoria de privacidade por fase
    (cartas ativas de terceiros nunca aparecem no público nem no privado alheio;
    oferta de troca só ao dono);
  - **salas** — ciclo de vida, prontidão, início 3–6, reconexão por token;
  - **sessão** — idempotência de `commandId`, versão otimista (`STALE_STATE`);
  - **autorização** — fase/turno/janela, jogador eliminado;
  - **timers** — mapeamento de fases, agendamento e cancelamento;
  - **e2e (Socket.IO real)** — 3 clientes criam/entram/iniciam, recebem
    `publicState` consistente sem `cardId`, `privateState` só ao dono; round-trip
    de comando (`INCOME` avança `stateVersion` e moedas); rejeição
    `NOT_YOUR_TURN`.

Comando: `pnpm test`. Build de produção: `pnpm build` (cliente dividido em
chunks `three`/`react`/`vendor`/`net`/app).

### Pendências de teste (registradas)

- **E2E Playwright de UI 3D** (navegador real) ainda não automatizado neste MVP;
  o fluxo cliente-servidor é coberto pelos testes e2e de Socket.IO e o cliente
  por typecheck/build. Recomendado adicionar Playwright em iteração futura.
