# Prompts dos subagentes

Preencher os `<...>` e mandar o prompt inteiro: o subagente não vê a conversa do orquestrador.
`<repo>` é o caminho absoluto da raiz do repositório.

## Fase

```text
Execute uma fase do plano em <repo> com a skill continue-multi-phased-code.
Fase: <N — título>. Não comece a seguinte.

Branch de trabalho: <branch>. Base: <base>; nunca commite nela nem troque de branch.
Ambiente: <receita do plano | ainda não há: descubra e devolva o que funcionou>.
Pode sair da máquina: <o que o usuário autorizou enviar e para onde | nada>.

Regras:
- Comentário em código: sempre com a skill comment-code.
- Design: <.fig ou cache em <caminho> | não se aplica>. Ler com a skill figma-read.
- Rode os testes e a análise que a fase pede.
- Probes, logs e scripts que criar vão em plan/, nunca no scratchpad. Probe em código que a
  análise do repo varre (ex.: .dart): passe nela ou apague depois de usar. Clone ou worktree:
  numa pasta irmã do repo, nunca dentro dele.
- Antes do commit, rode o formatter do repo (ex.: make format): o CI exige que ele não mude
  nada. O que ele mudar entra no commit da fase, mesmo em arquivo que você não tocou; anote
  no diário.
- Outra mudança que uma ferramenta fez sozinha fora do escopo da fase (ex.: migração
  automática): salve como patch em plan/tool-changes/, desfaça no working tree e registre no
  diário. Se o build não roda sem ela, pare e devolva a dúvida.
- Fase concluída: um único commit local com a fase inteira, mensagem no padrão do repo
  (git log --oneline -10). Adicione os arquivos pelo nome; plan/ nunca entra no commit.
- Fase só de validação (não muda código): sem commit. Evidência (prints, logs) em plan/ e no
  diário. Não corrija o que achar: devolva cada defeito com a evidência.
- Fase parcial ou bloqueada: não commite. Deixe as mudanças no working tree e registre no
  diário o que falta.
- Proibido: git push, abrir PR, comentar ou editar qualquer coisa no GitHub, enviar arquivo
  ou dado a serviço externo além do que "Pode sair da máquina" autoriza. Telemetria padrão
  das ferramentas e download de dependências não contam: use os comandos do repo como são.
- Dúvida que o repo, a issue e o plano não resolvem: não chute. Pare e devolva a dúvida.

Devolva: status (concluída | parcial | bloqueada), sha do commit, resultado dos testes,
receita do ambiente (comandos exatos que fizeram build e testes rodarem), decisões tomadas e
dúvidas que só o usuário resolve.
```

## Revisão

```text
Revise as mudanças da branch atual de <repo> com a skill diff-based-code-review.
Argumento (remote): <remote>. Base: <base> (--base do script).
Issue de referência: <url-da-issue>.
Consumidores da lib: <lista e o que assumem | não se aplica>.
Ambiente: <receita do plano>.
Pode sair da máquina: <o que o usuário autorizou enviar e para onde | nada>.
Rodada anterior: <nenhuma | achados da rodada 1 e commits que os corrigiram: confira esses
pontos e revise o resto do diff como se fosse a primeira vez>.

Regras:
- Não leia nada em plan/: a revisão julga o código e a issue, não o plano de quem implementou.
  Probe, log ou script que criar vai em plan/review/, nunca no scratchpad; se a análise do
  repo varre (ex.: .dart), apague depois de usar. Clone ou worktree: numa pasta irmã do repo,
  nunca dentro dele.
- Seja adversarial: procure o que quebra, não o que funciona.
- Hunk só de formatação: rode o formatter do repo (ex.: make format). Sem mudança, está
  certo e não é achado. Com mudança, é achado (o CI exige zero): liste os arquivos e desfaça
  com git checkout -- <arquivos>.
- Cada achado com prioridade, file:line, as linhas citadas, o que o falsificaria e a correção
  que você proporia.
- Não edite o código, não commite, não use git push nem gh para escrever, não envie arquivo
  ou dado a serviço externo além do que "Pode sair da máquina" autoriza (telemetria padrão
  das ferramentas e download de dependências não contam). Pode rodar testes e análise.

Devolva os achados nas três prioridades da skill.
```
