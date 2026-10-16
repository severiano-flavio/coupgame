# Requisitos — Coup 3D Multiplayer

## Introdução

Esta especificação define os requisitos de um jogo online 3D de **Coup**
(edição básica) para 3 a 6 jogadores, com salas privadas, motor de regras
autoritativo no servidor, informação privada protegida e interface 3D em
primeira pessoa limitada por assento. Os requisitos são verificáveis e usam
critérios de aceite objetivos (EARS). Fidelidade às regras é prioridade máxima;
em seguida, segurança/sincronização, experiência 3D e performance.

Termos: "sistema" = conjunto cliente+servidor; "servidor" = autoridade de
regras; "cliente" = aplicação web. Regras do Coup em `docs/game-rules.md`.

---

## Requisito 1 — Salas e lobby

**User story:** Como jogador convidado, quero criar e entrar em salas privadas
por link, para jogar com amigos sem cadastro.

### Critérios de aceite
1. QUANDO um usuário cria uma sala informando um apelido, O servidor DEVE gerar
   um código de sala único e um token de identidade do jogador, e retornar um
   link de convite.
2. QUANDO um usuário acessa um link/código válido e informa apelido, O servidor
   DEVE adicioná-lo à sala e emitir o estado de lobby atualizado a todos.
3. ENQUANTO a sala está em LOBBY, O sistema DEVE exibir a lista de participantes
   e seus estados de prontidão.
4. QUANDO há entre 3 e 6 jogadores todos prontos E o host inicia, O servidor
   DEVE transicionar a sala para DEALING; caso contrário DEVE rejeitar o início.
5. QUANDO a partida já iniciou, O servidor DEVE impedir a entrada de novos
   jogadores (MVP).
6. QUANDO a partida inicia, O servidor DEVE atribuir assentos distintos (0..n-1)
   e sortear a ordem inicial dos turnos.

## Requisito 2 — Autoridade do servidor e validação

**User story:** Como jogador, quero que o resultado das ações seja decidido
pelo servidor, para que ninguém trapaceie pelo cliente.

### Critérios de aceite
1. O servidor DEVE validar todo comando com Zod antes de processá-lo.
2. QUANDO um comando chega, O servidor DEVE verificar identidade, participação
   na sala, fase/turno, autorização, custo/saldo, alvo e existência de cartas.
3. SE qualquer verificação falhar, ENTÃO o servidor DEVE responder
   `commandRejected` com motivo tipado E NÃO DEVE alterar o estado.
4. O servidor NÃO DEVE confiar em moedas, cartas, propriedades ou resultados
   fornecidos pelo cliente.
5. QUANDO um comando repete um `commandId` já processado, O servidor DEVE
   tratá-lo de forma idempotente (sem novo efeito).
6. QUANDO um comando chega com `stateVersion` desatualizada, O servidor DEVE
   rejeitá-lo com `STALE_STATE`.

## Requisito 3 — Privacidade de informação oculta

**User story:** Como jogador, quero que minhas cartas e o baralho fiquem
secretos, para preservar o blefe.

### Critérios de aceite
1. O servidor NÃO DEVE enviar a nenhum cliente as cartas ocultas de outros
   jogadores, a ordem do baralho, cartas sorteadas não autorizadas ou estado
   interno de resolução.
2. O servidor DEVE produzir um `PublicState` (comum) e um `PrivatePlayerState`
   por jogador (apenas dados autorizados).
3. QUANDO uma carta é perdida/revelada, O `PublicState` DEVE passar a exibi-la
   como revelada e inativa.
4. Testes automatizados DEVEM confirmar que nenhum campo oculto aparece em
   `PublicState` nem no privado de outro jogador.

## Requisito 4 — Regras do Coup (ações)

**User story:** Como jogador, quero que todas as ações sigam a edição básica,
para uma partida fiel.

### Critérios de aceite
1. Renda DEVE conceder +1 moeda e NÃO DEVE ser contestável nem bloqueável.
2. Ajuda externa DEVE conceder +2 moedas E DEVE poder ser bloqueada por quem
   declarar Duque.
3. Golpe DEVE custar 7 moedas e remover 1 influência do alvo, sem contestação
   nem bloqueio.
4. QUANDO um jogador inicia o turno com 10 ou mais moedas, O servidor DEVE
   exigir Golpe e rejeitar qualquer outra ação (`MUST_COUP`).
5. Impostos (Duque) DEVE conceder +3 moedas e ser contestável.
6. Assassinato DEVE custar 3 moedas pagas na declaração, ser bloqueável apenas
   pelo alvo com Condessa e ser contestável; o custo NÃO DEVE ser restituído em
   caso de bloqueio/contestação bem-sucedidos.
7. Roubo (Capitão) DEVE transferir até 2 moedas limitado ao saldo da vítima,
   ser bloqueável apenas pelo alvo com Capitão ou Embaixador, e ser contestável.
8. Troca (Embaixador) DEVE comprar 2 cartas, permitir manter o número de cartas
   igual às influências ativas, devolver as demais ao baralho e embaralhar; e
   ser contestável.

## Requisito 5 — Desafios, bloqueios e perda de influência

**User story:** Como jogador, quero contestar e bloquear declarações, para que
blefes tenham consequências corretas.

### Critérios de aceite
1. QUANDO um jogador declara um personagem (ação ou bloqueio), outros
   autorizados DEVEM poder contestar antes da resolução.
2. SE o contestado possui a carta, ENTÃO o contestante DEVE perder uma
   influência, a carta DEVE ser devolvida, embaralhada e substituída, e a
   declaração DEVE prosseguir.
3. SE o contestado não possui a carta, ENTÃO ele DEVE perder uma influência e a
   declaração DEVE falhar.
4. QUANDO um jogador deve perder influência, ELE DEVE escolher qual carta ativa
   revelar permanentemente (`SELECT_INFLUENCE`); cartas perdidas NÃO DEVEM
   retornar ao baralho.
5. Ajuda externa DEVE poder ser bloqueada por qualquer adversário (Duque);
   Assassinato apenas pelo alvo (Condessa); Roubo apenas pelo alvo (Capitão ou
   Embaixador).
6. SE um bloqueio não for contestado ou for comprovado, ENTÃO a ação original
   DEVE ser impedida; SE o bloqueio for desmentido, ENTÃO a ação original DEVE
   prosseguir quando ainda aplicável.
7. QUANDO múltiplos jogadores podem contestar/bloquear, O primeiro comando
   válido recebido DEVE prevalecer e os demais DEVEM receber `WINDOW_CLOSED`.

## Requisito 6 — Máquina de estados e turnos

**User story:** Como jogador, quero um fluxo de turnos determinístico, para que
o jogo seja previsível e justo.

### Critérios de aceite
1. O servidor DEVE implementar as fases LOBBY, DEALING, WAITING_ACTION,
   ACTION_CHALLENGE, BLOCK_WINDOW, BLOCK_CHALLENGE, RESOLVING,
   INFLUENCE_SELECTION, EXCHANGE_SELECTION, NEXT_TURN, GAME_OVER com transições
   válidas explícitas (ver `docs/architecture.md`).
2. O servidor DEVE rejeitar comandos inválidos para a fase atual
   (`INVALID_PHASE`).
3. Os turnos DEVEM seguir no sentido horário, pulando jogadores eliminados.
4. QUANDO resta apenas um jogador com influência, O servidor DEVE transicionar
   para GAME_OVER e declará-lo vencedor.
5. Eliminações, custos e alterações de cartas DEVEM ser aplicados atomicamente.

## Requisito 7 — Temporizadores e desconexões

**User story:** Como jogador, quero prazos claros e reconexão, para que a
partida não trave por ausência.

### Critérios de aceite
1. O servidor DEVE manter temporizadores autoritativos: 60 s para declarar
   ação, 15 s por janela de reação, 20 s para seleção/troca, 60 s de tolerância
   de reconexão (configuráveis).
2. O cliente DEVE exibir o prazo sincronizado com o servidor (deadline absoluto).
3. QUANDO uma janela de reação expira, O servidor DEVE tratar como `PASS`.
4. QUANDO a seleção de influência expira, O servidor DEVE aplicar a política
   determinística D1; QUANDO a troca expira, a política D2; QUANDO a ação do
   turno expira, a política D3 (ver `docs/game-rules.md §8`).
5. QUANDO um jogador reconecta dentro da tolerância com `playerToken` válido, O
   servidor DEVE restaurar identidade, assento e estado privado.
6. QUANDO a desconexão excede a tolerância, O servidor DEVE aplicar a política
   de desistência D4 sem travar a sala.

## Requisito 8 — Interface 3D e câmera

**User story:** Como jogador, quero ver a mesa em 3D da minha cadeira, para uma
experiência imersiva e legível.

### Critérios de aceite
1. O cliente DEVE renderizar mesa, 3–6 cadeiras proporcionais, avatares simples,
   baralho central, cartas e moedas por posição, com iluminação atmosférica.
2. A câmera DEVE ficar fixa na posição da cabeça do assento do jogador, sem
   WASD, caminhada, voo, teletransporte ou zoom livre.
3. A câmera DEVE limitar yaw a aproximadamente −95°..+95° e pitch a −40°..+50°,
   com movimento suave e sensibilidade configurável, apontando inicialmente ao
   centro da mesa.
4. O cliente DEVE suportar mouse (desktop) e arrasto por toque, sem exigir VR.
5. QUANDO o jogador reconecta, A câmera DEVE restaurar a orientação do assento.
6. Cartas próprias DEVEM aparecer legíveis; cartas adversárias viradas para
   baixo; cartas perdidas visíveis e marcadas inativas; moedas com contador
   numérico acessível.

## Requisito 9 — Interações, HUD e acessibilidade

**User story:** Como jogador, quero controles claros e acessíveis, para agir
sem depender de animações.

### Critérios de aceite
1. O cliente DEVE oferecer interface HTML sobreposta para ações, seleção de
   alvo, timers e informações críticas.
2. Desafios e bloqueios DEVEM aparecer com destaque e temporizador.
3. O jogador da vez DEVE receber indicação visual discreta.
4. ENQUANTO as animações estiverem desativadas, O jogo DEVE permanecer
   compreensível e jogável.
5. A seleção de ações e alvos NÃO DEVE ser impedida por câmera ou animações.
6. Alvos DEVEM ser selecionáveis por clique no 3D ou por interface auxiliar.

## Requisito 10 — Qualidade, performance e entrega

**User story:** Como mantenedor, quero código sustentável e build reproduzível,
para evoluir o projeto com segurança.

### Critérios de aceite
1. Todo o código DEVE compilar em TypeScript strict sem `any` injustificado.
2. O cliente NÃO DEVE causar re-render React por frame para animações 3D.
3. O cliente DEVE usar instancing e geometria reutilizável e descartar recursos
   3D ao desmontar.
4. Nenhum segredo DEVE aparecer em logs, mensagens públicas ou snapshots.
5. Frontend e servidor DEVEM executar localmente com comandos documentados.
6. A suíte de testes de unidade/integração DEVE passar e o build de produção
   DEVE concluir sem erros antes da entrega de cada etapa.
