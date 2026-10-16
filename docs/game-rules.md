# Regras do Coup — Edição Básica (implementação digital)

Este documento é a **fonte de verdade das regras** para a implementação.
Separa claramente as **regras originais** do Coup (edição básica, Rikki Tahta)
das **adaptações digitais** necessárias para o multiplayer online.

> Fidelidade às regras é a prioridade número 1 do projeto (ver constituição).
> Nenhuma variante própria pode ser criada sem autorização.

---

## 1. Componentes e preparação (original)

- **15 cartas de influência**, 3 de cada personagem:
  Duque, Assassino, Capitão, Embaixador, Condessa.
- De **3 a 6 jogadores** (variante de 2 jogadores fora do MVP).
- Cada jogador começa com **2 moedas** e **2 cartas de influência**
  (viradas para baixo, ocultas dos adversários).
- As cartas restantes formam o **baralho da corte** (deck central), embaralhado.
- A **ordem inicial é sorteada**; os turnos seguem no **sentido horário**.
- Quem perde suas **duas influências** é **eliminado**.
- O **último jogador** com influência **vence**.

## 2. Ações gerais (original)

| Ação          | Efeito                                              | Bloqueio / Contestação                     |
|---------------|-----------------------------------------------------|--------------------------------------------|
| **Renda**     | Recebe 1 moeda                                      | Não pode ser bloqueada nem contestada      |
| **Ajuda externa** | Recebe 2 moedas                                 | Pode ser bloqueada por quem declarar Duque |
| **Golpe (Coup)** | Paga 7 moedas, remove 1 influência de um alvo    | Não pode ser bloqueado nem contestado      |

**Regra obrigatória:** quem **inicia** o turno com **10 ou mais moedas** é
**obrigado a executar um Golpe** (não pode escolher outra ação).

## 3. Personagens e habilidades (original)

| Personagem    | Ação                                                    | Bloqueio                 |
|---------------|---------------------------------------------------------|--------------------------|
| **Duque**     | Impostos: recebe 3 moedas                               | Bloqueia Ajuda externa   |
| **Assassino** | Assassinar: paga 3 moedas para remover 1 influência     | —                        |
| **Capitão**   | Roubar: tira até 2 moedas de outro jogador              | Bloqueia Roubo           |
| **Embaixador**| Trocar (Exchange): compra 2 cartas da corte e reorganiza| Bloqueia Roubo           |
| **Condessa**  | Nenhuma ação própria                                    | Bloqueia Assassinato     |

As habilidades podem ser declaradas **mesmo sem possuir a carta** — o **blefe**
é parte essencial do jogo.

## 4. Desafios (original)

Quando um jogador declara possuir um personagem (para ação **ou** bloqueio),
qualquer outro jogador autorizado pode **contestar** essa declaração.

Resolução:

- **O contestado possui a carta declarada:**
  - Revela a carta temporariamente.
  - Devolve-a ao baralho, **embaralha** e **compra uma substituta**.
  - **Quem contestou perde uma influência.**
  - A declaração (ação ou bloqueio) **procede**.
- **O contestado NÃO possui a carta:**
  - **Perde uma influência** imediatamente.
  - A ação ou bloqueio contestado **falha**.
- Quem perde influência **escolhe** qual carta ainda ativa será revelada
  **permanentemente**.
- Cartas já perdidas **não retornam** ao baralho.
- Contestações devem ocorrer **antes da resolução** da declaração.

## 5. Bloqueios (original)

- **Ajuda externa:** qualquer adversário pode declarar **Duque**.
- **Assassinato:** apenas **o alvo** pode declarar **Condessa**.
- **Roubo:** apenas **o alvo** pode declarar **Capitão** ou **Embaixador**.
- Bloqueios também podem ser **blefes** e podem ser **contestados**.
- Se o bloqueio for comprovado → a ação original é **impedida**.
- Se o bloqueio for desmentido → a ação original **prossegue**, desde que
  ainda seja aplicável.

## 6. Regras especiais / casos-limite (original)

1. **Custo do Assassinato é pago na declaração.** O Assassino paga 3 moedas no
   momento da declaração, **mesmo que** depois seja bloqueado ou contestado com
   sucesso. (As 3 moedas não voltam.)
2. **Assassinato + contestação perdida pelo alvo.** Se o alvo de um Assassinato
   contesta o Assassino **verdadeiro** e perde a contestação, ele perde uma
   influência pela contestação **e** ainda poderá perder outra pelo
   Assassinato, caso este se conclua.
   - Caso-limite: se o alvo tinha apenas 1 influência, a contestação perdida já
     o elimina; o Assassinato então não tem segunda influência para remover.
     Registrado como ambiguidade A1 abaixo.
3. **Roubo limitado.** Roubo obtém no máximo 2 moedas, limitado ao saldo da
   vítima (se a vítima tem 1 moeda, rouba 1; se tem 0, rouba 0).
4. **Troca (Embaixador).** Compra 2 cartas da corte, junta-as às suas cartas
   ativas, escolhe **quais manter respeitando o número de influências ainda
   ativas**; as restantes **retornam ao baralho**, que é **embaralhado**.
   - Com 2 influências ativas: tem 2+2=4 cartas em mãos, mantém 2.
   - Com 1 influência ativa: tem 1+2=3 cartas, mantém 1.
5. **Jogar fora do turno.** Não é permitido, exceto pelas **reações
   autorizadas** (contestar, bloquear, passar).
6. **Atomicidade.** Eliminações, custos e alterações de cartas são processados
   **atomicamente** pelo servidor (ver constituição §4 e architecture.md).

---

## 7. Fluxo de resolução de um turno (síntese)

1. Jogador da vez declara uma ação (`DECLARE_ACTION`), com alvo se aplicável.
   - Se iniciou com ≥10 moedas, a única ação permitida é Golpe.
2. **Ações sem personagem** (Renda, Golpe): resolvem imediatamente.
3. **Ações de personagem** (Duque, Assassino, Capitão, Embaixador) e
   **Ajuda externa** abrem janelas:
   - **Janela de contestação da ação** (quando a ação alega um personagem):
     adversários podem `CHALLENGE` ou `PASS`.
   - **Janela de bloqueio** (Ajuda externa, Assassinato, Roubo): o(s)
     jogador(es) autorizado(s) podem `BLOCK` (declarando o personagem
     bloqueador) ou `PASS`.
   - **Janela de contestação do bloqueio**: outros podem `CHALLENGE` o bloqueio.
4. Resolução final aplica custos, efeitos e perdas de influência.
5. Se a resolução exige escolha (perder influência / troca), entra em
   `INFLUENCE_SELECTION` ou `EXCHANGE_SELECTION`.
6. Passa ao próximo jogador vivo (`NEXT_TURN`) ou encerra (`GAME_OVER`).

> O detalhamento das fases, transições e quem está autorizado em cada janela
> está em `docs/architecture.md` (máquina de estados) e
> `docs/multiplayer-protocol.md`.

---

## 8. Adaptações digitais (NÃO são regras originais)

Estas são decisões de implementação para o meio digital. São **separadas** das
regras originais e devem ser tratadas como políticas do produto.

### 8.1 Temporizadores de servidor

Valores em uso (configuráveis em `apps/server/src/timers/match-timers.ts`):

- **90 s** para declarar a ação do turno.
- **25 s** para cada janela de contestação ou bloqueio.
- **40 s** para escolher carta a perder ou concluir a troca.
- **60 s** de tolerância para reconexão.

> Ajustados para dar tempo de leitura a jogadores humanos (os valores sugeridos
> originalmente — 60/15/20 s — eram apertados na prática). Decisão registrada
> conforme constituição §3.

Temporizadores pertencem ao **servidor**; o cliente apenas exibe sincronizado.

### 8.2 Expiração de prazo

- **Reação não enviada** (contestar/bloquear) → equivale a **passar** (`PASS`).
- **Perda de influência não escolhida** → escolha automática determinística:
  perde a carta de **maior índice** entre as ativas (ordem estável documentada),
  garantindo reprodutibilidade. (Política D1.)
- **Troca não concluída** → **preservar as cartas originais ainda ativas**
  (devolve as 2 compradas ao baralho). (Política D2.)
- **Ação do turno não declarada** no prazo → aplica **Renda** automaticamente
  (ação mais segura e sempre válida), salvo se o jogador for obrigado a Golpe
  (≥10 moedas), caso em que o Golpe é aplicado contra um alvo determinístico
  (o próximo jogador vivo em sentido horário). (Política D3.)

### 8.3 Concorrência de reações

- Quando múltiplos adversários podem contestar/bloquear, **o primeiro comando
  válido recebido pelo servidor prevalece**. Os demais são ignorados para
  aquela resolução. (Determinado pela ordem de chegada no servidor.)

### 8.4 Desconexão

- Reconexão dentro da tolerância (60 s) restaura identidade, assento e estado
  privado do jogador.
- Desconexão prolongada aplica **política explícita de desistência**: o jogador
  é tratado como quem passa em todas as janelas; se for sua vez, aplica a
  política D3. Após ultrapassar a tolerância em seu próprio turno de forma
  repetida, pode ser marcado como **desistente**, revelando suas cartas e sendo
  removido da ordem — sem travar a sala. (Política D4; detalhar no design.)

---

## 9. Ambiguidades registradas (constituição §2)

- **A1 — Assassinato contra alvo com 1 influência que contesta e perde.**
  Pela regra especial (6.2), o alvo perde 1 influência pela contestação. Se
  tinha apenas 1, é eliminado nesse momento; o Assassinato não encontra segunda
  influência para remover. Interpretação adotada: **a eliminação pela
  contestação encerra o efeito**; o custo de 3 moedas do Assassino permanece
  pago. Validar com fonte oficial antes de considerar fechado.
- **A2 — Baralho insuficiente para substituição/troca.** No fluxo normal o
  baralho sempre terá cartas suficientes (15 cartas, no máximo 6 jogadores × 2
  em mão). Documentado para defesa de borda; o servidor deve tratar sem travar.

> Qualquer resolução dessas ambiguidades deve ser confirmada em fonte oficial e
> refletida aqui e nos testes antes de fechar.
