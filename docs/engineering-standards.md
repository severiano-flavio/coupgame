# Padrões de Engenharia — Coup 3D

Aplicam-se a todo o monorepo. Em conflito com a constituição, a constituição
prevalece.

## 1. Princípios

- **SOLID** quando aplicável. Em especial: responsabilidade única por módulo
  (engine ≠ transporte ≠ UI ≠ render) e inversão de dependência (RNG/relógio
  injetados na engine).
- **DRY** — contratos e tipos únicos em `packages/shared`.
- **KISS** — a solução mais simples que satisfaz o requisito.
- **YAGNI** — não construir para requisitos não pedidos (ex.: persistência,
  bots, variante de 2 jogadores).

## 2. TypeScript

- `strict: true` em todos os pacotes. `tsconfig.base.json` compartilhado.
- Proibido `any`; usar `unknown` + narrowing ou tipos precisos. Exceções exigem
  comentário justificando (constituição §6).
- Proibido suprimir erros (`@ts-ignore`, `eslint-disable`) sem justificativa no
  local.
- Preferir `type`/`interface` explícitos nos contratos; `as const` para enums
  literais; discriminated unions para comandos/eventos/fases.

## 3. Convenções

- Arquivos: `kebab-case.ts`. Componentes React: `PascalCase.tsx`.
- Pastas por responsabilidade (ver `.kiro/steering/structure.md`).
- Pacotes: `@coup/web`, `@coup/server`, `@coup/shared`.
- Imports do shared sempre via o nome do pacote, nunca por caminho relativo
  cruzando workspaces.

## 4. React / R3F

- **Separar estado de jogo (servidor) de estado de UI (Zustand).**
- Evitar re-render por frame: animações 3D usam `useFrame` e mutam refs/objetos
  Three diretamente, **não** `setState` a cada frame.
- Snapshots recebidos atualizam estado React uma vez por mensagem; a cena lê
  desse estado.
- Hooks: um hook por preocupação (`useSocket`, `useMatchSnapshot`,
  `useSeatCamera`). Sem efeitos colaterais escondidos.
- Componentes pequenos e compostos; props tipadas; sem `any` em props.
- Acessibilidade: controles críticos em HTML (botões, foco, aria-labels), não
  presos a objetos 3D. O jogo é jogável com animações desativadas.

## 5. Performance Three.js

- **Instancing** para moedas e elementos repetidos.
- **Geometria/material reutilizáveis** (memoizados), não recriados por render.
- **Descarte correto** de geometrias, materiais e texturas ao desmontar
  (`dispose`), evitando vazamento de GPU.
- Sombras moderadas; luzes limitadas. Sem pós-processamento pesado no MVP.
- Separar o loop de render (R3F) da atualização de estado de jogo.

## 6. Rede e segurança

- Toda mensagem de entrada validada com **Zod** antes de qualquer uso.
- Autorização antes de processar: socket↔jogador↔sala, turno, fase.
- Idempotência por `commandId`; versão por `stateVersion`.
- Nenhum segredo em logs, mensagens públicas ou snapshots (constituição §5, §14).
- CORS restrito a `CLIENT_ORIGIN`.

## 7. Tratamento de erros

- Erros de validação → resposta `commandRejected` com motivo tipado, sem vazar
  estado interno.
- Erros inesperados no servidor → log interno + resposta genérica ao cliente.
- Cliente trata desconexão/reconexão com backoff e UI de estado de conexão.
- Nunca engolir erros silenciosamente (constituição §11).

## 8. Testes

- **Vitest** para unidade/integração; **Playwright** para E2E quando viável.
- Engine coberta por testes de regra e casos-limite (deterministas via RNG
  injetado).
- Correção de bug de regra → **teste de regressão** obrigatório (constituição
  §12).
- Testes de privacidade: snapshots não vazam dados ocultos.
- Sem mocks que escondam erros nem asserts triviais (constituição §11).

## 9. Lint / formatação

- ESLint + Prettier compartilhados. CI/local: `pnpm lint` e `pnpm format`.
- Build de produção deve passar sem erros de tipo antes de concluir qualquer
  etapa (constituição §16).

## 10. Git

- Commits apenas quando solicitado. Mensagens claras e escopadas.
- `.env` e segredos nunca versionados.
