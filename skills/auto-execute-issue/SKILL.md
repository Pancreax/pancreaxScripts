---
name: auto-execute-issue
description: >-
  Executa uma issue do GitHub de ponta a ponta numa única sessão: planeja com
  plan-multi-phased-code (passando pela grilling quando o plano tem
  bifurcação), pede aprovação do plano, roda cada fase num subagente novo com
  continue-multi-phased-code, um commit por fase numa branch de trabalho, e
  fecha com uma ou duas rodadas de revisão adversarial com diff-based-code-review, em
  que os achados claros viram fases de correção. Nada de push, PR ou
  comentário no GitHub sem confirmação. Use quando pedirem para executar,
  implementar ou resolver uma issue automaticamente, de ponta a ponta ou sem
  uma sessão por fase, ou quando invocarem /auto-execute-issue.
---

# Auto Execute Issue

Leva uma issue do plano até a branch pronta para PR, numa sessão só. Este contexto orquestra;
subagentes implementam e revisam. Skills usadas: `plan-multi-phased-code`,
`grilling`, `continue-multi-phased-code`, `diff-based-code-review`, `generate-pr-description`,
`comment-code` e `figma-read`.

## Regras fixas

- **Nada sai da máquina sem confirmação.** `git push`, abrir PR, comentar ou editar issue/PR
  no GitHub, enviar arquivo ou dado a qualquer serviço externo (API, upload, conversor
  online): só depois de o usuário confirmar aquela ação, com o que vai e para onde. Commits
  são locais. Telemetria padrão das ferramentas e download de dependências não contam.
- **Nunca commitar na branch base**: nem na padrão do repositório, nem em `development`,
  `main` ou `master`. Todo commit vai na branch de trabalho.
- **Um commit por fase**, inclusive nas de correção. Fase só de validação (visual, em
  aparelho), que não muda código, não commita: a evidência vai no diário. `plan/` nunca entra
  em commit.
- **Na dúvida, parar e perguntar.** Fato que o repo, a issue ou o plano respondem: descobrir.
  Decisão que só o usuário toma: parar e perguntar. Nunca chutar. Decisão que só afeta uma
  fase futura vai ao usuário sem parar o fluxo: só essa fase espera a resposta.
- **Comentário em código → `comment-code`**, sem exceção.
- **Artefatos da tarefa** (probes, logs, scripts, patches) ficam em `plan/`, nunca no
  scratchpad, que é apagado. Probe em código que a análise do repo varre (ex.: `.dart`) passa
  nela ou é apagado depois de usado. Clone e worktree vão numa pasta irmã do repo, nunca
  dentro dele. Subagente sem prompt pronto (ex.: pesquisa no planejamento) recebe esta regra
  no prompt.
- **Design do Figma → `figma-read`.** Sem `.fig` local nem cache decodificado, pedir o `.fig`
  ao usuário e esperar.
- **Subagente novo** = sem herdar esta conversa (no Claude Code, `Agent` do tipo
  `general-purpose`, nunca fork). Esperar o resultado de cada um antes do passo seguinte;
  fases nunca rodam em paralelo. Prompts em [references/subagent-prompts.md](references/subagent-prompts.md).

## 1. Preparar

1. Pegar a issue do argumento (URL ou `owner/repo#N`; número puro só se o repositório for
   inequívoco). Ler com `gh issue view <url> --json title,body,comments` (sem terminal,
   `--comments` mostra só os comentários).
2. Descobrir, sem perguntar o que dá para resolver:
   - `<remote>`: o remote cuja URL aponta para o repositório da issue (`git remote -v`);
   - `<base>`: a branch padrão dele
     (`gh repo view <owner>/<repo> --json defaultBranchRef --jq .defaultBranchRef.name`);
   - tipo do repo: **app** (gera um app, ex.: `android/app/` na raiz) ou **lib** (package
     consumido por apps). Sem clareza, perguntar;
   - design: link do Figma na issue ou nos comentários → resolver o `.fig` agora.
3. Working tree com mudança fora de `plan/` → parar e perguntar.
4. `./plan/` já existe: se for desta issue, mostrar o estado (fases, branch, commits) e
   perguntar se retoma da primeira fase não concluída; se for de outra, perguntar antes de
   sobrescrever.

## 2. Planejar

1. Invocar `plan-multi-phased-code` com a issue como fonte, avisando que o fluxo continua nesta
   sessão.
2. **`grilling` só se houver bifurcação**: mais de uma leitura plausível da issue, decisão com
   trade-off real, escopo vago ou dependência de comportamento não documentado. Levar só as
   bifurcações e registrar cada decisão no plano, na fase afetada e como resolvida em
   **Open questions**. Sem bifurcação, pular e dizer isso numa linha no resumo.
3. **Repo de lib: consumidores.** Buscar quem usa o package na organização
   (`gh search code <package> --owner <org> --filename pubspec.yaml`) e dentro do próprio repo
   (`example/`, `embed/`, outros packages de monorepo), e o que cada um assume
   da parte alterada, inclusive o que a assinatura não mostra (tamanho, ordem, formato,
   timing). Se a mudança quebra alguma premissa, o plano escolhe entre uma solução que não
   quebra e declarar breaking (versão major), com o ajuste de cada consumidor.

## 3. Pedir aprovação

Sem implementar nada, mostrar:

- uma linha por fase: título, o que entrega e o "Done when";
- as decisões fechadas, as alternativas descartadas e o que sobrou em **Open questions**;
- a branch que será criada e a base;
- em lib, os consumidores e se a mudança é breaking;
- quantas rodadas de revisão (passo 5) e por quê;
- se alguma fase precisa enviar arquivo ou dado para fora da máquina: o quê e para onde;
- se há design, o `.fig` em uso.

Pedir aprovação explícita. Pedido de mudança → ajustar o plano e reapresentar.

## 4. Executar as fases

1. Criar a branch de trabalho a partir da base atualizada, só local:

   ```bash
   git fetch <remote> <base>
   git switch --no-track -c <branch> <remote>/<base>
   ```

   Nome no padrão do repo (`git branch -a --sort=-committerdate | head -20`); sem padrão,
   `feature/<numero>-<slug>`.
2. Para cada fase não concluída, em ordem, um subagente novo com o prompt **Fase**.
3. Na volta, conferir: ainda na branch de trabalho, exatamente um commit novo (nenhum na fase
   só de validação), sem `plan/`, working tree limpo fora de `plan/` e a fase `[x]` no plano.
   Divergência → parar e relatar.
4. Fase parcial ou com dúvida: resolver se for fato; se for decisão, perguntar. Com a
   resposta, registrar no plano e retomar a fase com outro subagente novo.
5. Defeito achado numa fase de validação: triar como no passo 5. O claro vira
   `Fase N — Correções da validação`, executada em seguida e com a revalidação no "Done when";
   o resto vai para o usuário.
6. A primeira fase que conseguir rodar build e testes devolve a receita do ambiente (comandos
   exatos, destinos, flags, o que desfazer depois). Gravar no plano, em **Context &
   constraints**, e mandar no prompt de todo subagente seguinte, revisor inclusive.

## 5. Revisão adversarial (uma ou duas rodadas)

O número de rodadas é decidido no plano e mostrado na aprovação; o usuário pode mudá-lo ali
ou já no prompt.

- **2 rodadas**: várias fases ou camadas, ou mudança de contrato público (API de lib, formato
  compartilhado).
- **1 rodada**: mudança pequena e localizada. Sobe para 2 se a primeira achar algo de
  prioridade alta ou gerar várias correções; nunca desce sem o usuário.

Em cada rodada:

1. Um subagente revisor novo com o prompt **Revisão**. Ele recebe a issue, mas não o plano,
   o diário ou esta conversa: sem o raciocínio de quem implementou, a revisão fica imparcial.
2. Triar cada achado, conferindo a citação no código:
   - **claro**: defeito confirmado, com correção óbvia, dentro do escopo da issue e sem
     contrariar decisão do plano ou da `grilling`;
   - **decisão questionada**: contraria o que o plano aprovado ou a `grilling` decidiu. Não
     vira correção: vai para o resumo com a decisão e o argumento do revisor, que pode fazer o
     usuário mudar de ideia;
   - **para o usuário**: todo o resto (pede julgamento, está fora do escopo, não foi
     confirmado, é questão de gosto).

   Achado que já está numa das listas do usuário não volta.
3. Achados claros → nova fase no fim do plano, `Fase N — Correções da revisão <R>`, um step
   por achado (`file:line` e correção) e um "Done when". Executar como no passo 4.

A segunda rodada revisa o diff inteiro e recebe um briefing: os achados da primeira e os
commits que os corrigiram, para conferir esses pontos e revisar o resto como se fosse a
primeira vez. Não há terceira: as correções da última rodada são executadas e não voltam para
revisão.

## 6. Encerrar

Parar quando tudo terminar ou quando a próxima fase depender de decisão que só o usuário
toma. Nos dois casos, resumir:

- **Feito**: fases, `sha` de cada commit e resultado de testes/análise;
- **Revisão**: o que cada rodada corrigiu;
- **Para você decidir**: achados não claros e dúvidas abertas, com `file:line`, e as
  mudanças de ferramenta guardadas em `plan/tool-changes/`;
- **Decisões questionadas**: achados que contrariam o plano aprovado;
- **Falta**: o que não foi feito, push e PR.

Com a resposta do usuário, retomar de onde parou.

## 7. Push e PR (só com confirmação)

| Tipo | Remote de push |
|------|----------------|
| App | o fork de quem executa: o remote cujo owner é `gh api user --jq .login`. Sem fork, perguntar. |
| Lib | o `<remote>` do repositório da issue. |

Push da branch no repositório principal de um app cria branch órfã e o PR não recebe o
commit. Se já existe PR, conferir o head com
`gh pr view <n> --json headRepositoryOwner,headRefName` em vez de assumir.

PR: gerar a descrição com `generate-pr-description`, passando a URL da issue, mostrar ao
usuário e só depois do ok criar
(`gh pr create --repo <owner>/<repo> --base <base> --head <owner-do-push>:<branch>`).
