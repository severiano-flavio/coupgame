# Produto — Coup 3D Multiplayer

## O que é

Jogo online 3D baseado nas regras clássicas de **Coup** (Rikki Tahta,
edição básica, sem expansões). De 3 a 6 jogadores sentam-se ao redor de
uma mesa virtual e competem por influência através de estratégia, blefes,
desafios e eliminações.

Roda no navegador, sem instalações, com salas privadas acessíveis por link.

## Público e uso

- Jogadores casuais que conhecem ou querem aprender Coup.
- Sessões privadas entre amigos via link de convite.
- Convidados sem cadastro, apenas apelido.

## Escopo do MVP

Incluído:

- Edição básica do Coup (15 cartas: Duque, Assassino, Capitão, Embaixador,
  Condessa — 3 de cada).
- 3 a 6 jogadores (variante de 2 jogadores **fora** do MVP).
- Salas privadas por código/link, lobby com prontidão.
- Motor de regras completo no servidor.
- Mesa 3D com câmera em primeira pessoa limitada por assento.
- Reconexão com recuperação de identidade e estado.
- Temporizadores de servidor para ações e reações.
- UI em português brasileiro.

Fora do MVP (não implementar sem aprovação):

- Variante de 2 jogadores.
- Bots / IA.
- Chat de voz.
- Ranking, loja, autenticação social, matchmaking público.
- Expansões ou personagens adicionais.
- Persistência de partidas em banco (estado é em memória no MVP).

## Princípios de experiência

- O jogo deve permanecer compreensível mesmo com animações desativadas.
- Interface HTML sobreposta ao Canvas para menus, botões, informações
  críticas e acessibilidade.
- Legibilidade e desempenho acima de espetáculo visual.
- Objetivo final: jogo funcional e correto, não demonstração visual.
