---
inclusion: always
---

# Constituição do Projeto — Coup 3D Multiplayer

Este documento define regras **não negociáveis**. Em caso de conflito entre
uma instrução nova e esta constituição, **interrompa a alteração conflitante
e solicite decisão explícita** antes de prosseguir.

## Regras

1. **Não inventar.** Não inventar regras do Coup, bibliotecas, APIs,
   propriedades ou funcionalidades inexistentes. Toda dependência e API usada
   deve existir e ser verificada na documentação oficial.

2. **Dúvida é registrada, não suposta.** Em caso de dúvida sobre regras ou
   APIs, consultar documentação oficial ou registrar explicitamente a
   incerteza (em `docs/game-rules.md` → "Ambiguidades" ou em comentário/ADR).
   Nunca supor silenciosamente.

3. **Mudanças rastreáveis.** Nunca alterar regras do jogo, stack tecnológica
   ou contratos compartilhados sem atualizar a documentação correspondente e
   justificar a decisão.

4. **Autoridade do servidor.** Nenhuma lógica determinante de jogo pode
   depender do cliente. O servidor é a única fonte de verdade. O cliente
   envia apenas intenções (comandos); o servidor valida e resolve.

5. **Privacidade de informação oculta.** Nunca expor pela rede informações
   ocultas de uma partida (cartas de adversários, ordem do baralho, cartas
   sorteadas não autorizadas, estado interno secreto). Esconder apenas na UI
   é insuficiente — os dados não podem chegar ao cliente não autorizado.

6. **TypeScript strict.** `strict: true` obrigatório. Não usar `any` nem
   suprimir erros (`@ts-ignore`, `eslint-disable`) sem justificativa
   explícita documentada no próprio local.

7. **Validação e resiliência.** Validar toda mensagem externa (Zod) e tratar
   erros, reconexões e condições de corrida de forma explícita.

8. **Reutilização com parcimônia.** Reutilizar componentes e abstrações
   quando houver benefício real; evitar duplicação e engenharia excessiva
   (DRY + YAGNI em equilíbrio).

9. **Separação de camadas.** Separar regras de negócio (engine), transporte
   (Socket.IO), estado de interface (Zustand/React) e renderização 3D
   (Three.js/R3F). A engine não importa nada de rede nem de renderização.

10. **Dependências justificadas.** Não adicionar dependências sem necessidade
    verificada. Preferir pacotes estáveis e mantidos; versões fixadas.

11. **Testes honestos.** Não criar testes fictícios, mocks que escondam erros,
    nem afirmar sucesso sem executar as verificações pertinentes.

12. **Regressão para bugs de regra.** Toda correção de bug nas regras do jogo
    deve acompanhar um teste de regressão que falhava antes da correção.

13. **Mudança consciente.** Não modificar funcionalidades existentes sem
    verificar os impactos (dependentes, testes, contratos).

14. **Sem segredos no frontend.** Não armazenar credenciais no frontend nem
    versionar segredos. Usar variáveis de ambiente e `.env` ignorado no git.

15. **Sem material proprietário.** Não copiar artes, logotipos ou materiais
    proprietários de terceiros sem autorização apropriada. Assets procedurais
    ou de licença livre apenas.

16. **Aceite real.** Não marcar uma tarefa como concluída se seus critérios de
    aceite não foram atendidos e verificados.

## Precedência

Prioridades do projeto, nesta ordem, quando houver trade-off:

1. Fidelidade às regras do Coup.
2. Segurança e sincronização multiplayer.
3. Experiência 3D imersiva.
4. Performance, manutenção e qualidade visual.
