# Plataforma do Cristão Próspero (mcpia.site)

Guia para qualquer agente de código (Codex, Claude Code etc.) que trabalhe neste repositório.
O dono é o Breno. Ele **não é desenvolvedor**: explique em português do Brasil, frases curtas e simples, sem jargão.
Os alunos são, em grande parte, pessoas leigas e idosas: textos de tela e de atendimento precisam ser simples e acolhedores.

## O que é

Plataforma de mentoria para cristãos venderem produtos digitais com anúncios no Facebook (Meta). Os alunos usam o site para
gerar ebook, site de vendas e criativos com IA, e para acompanhar campanhas. Atendimento e vendas também acontecem por WhatsApp,
com um assistente de IA chamado **Júnior**.

## Estrutura

- A aplicação fica em `criaai-frontend/` (Next.js 14, App Router, TypeScript, React 18). Tudo abaixo é relativo a essa pasta.
- `app/dashboard/*`: telas do aluno e do admin (`admin`, `anuncios`, `atendimento`, `chat`, `planos`, `criativo`, `estrutura-express` etc.).
- `app/api/*`: rotas de servidor (`facebook`, `whatsapp`, `push`, `hubla`, `cakto`, `stripe`, `chat`, `criativo` etc.).
- `lib/*`: regras de negócio. Os mais importantes estão na seção "Arquivos-chave".
- `components/*`: componentes (ex.: `components/layout/Sidebar.tsx`, `components/anuncios/*`, `components/admin/*`).
- Banco e login: **Supabase** (projeto "IA - MCP"). Hospedagem e deploy: **Vercel** (projeto `mcpia`).
- Não existe suíte de testes. Antes de enviar mudanças, rode `npx tsc --noEmit -p .` (precisa passar sem erros).

## Como publicar (importante)

- A Vercel publica **sozinha** tudo que entra na branch `main`. Ou seja, `main` = produção, com alunos usando.
- Trabalhe em uma **branch separada e abra um pull request**; só o Breno aprova e junta na `main`.
- Mensagens de commit curtas, em português, dizendo o que mudou para o aluno.
- Chaves e senhas ficam nas variáveis de ambiente da Vercel. **Nunca** coloque chaves, tokens, senhas ou contas de teste no código ou neste arquivo.

## Regras de negócio que não podem quebrar

**Planos:** Starter R$ 39,90, Pro R$ 49,90, Premium R$ 79,90 por mês (tabela `plans`; coluna `profiles.subscription_status` = `active` ou `trialing` para plano ativo).

**Aluno sem plano nos primeiros 7 dias:** não pode saber que existem planos. Menus de plano e de recursos pagos ficam escondidos ou bloqueados, e nenhum texto (tela, notificação ou Júnior) pode mencionar planos para ele.

**Gerenciando seus anúncios** (`app/dashboard/anuncios`, API em `app/api/facebook/*`):
- Só planos **Pro e Premium** usam. Starter e sem plano (7 dias ou mais) veem um aviso com botão para Planos.
- Regras no cliente em `lib/acessoAnuncios.ts` e **também no servidor** em `lib/acessoAnunciosServidor.ts` (`bloqueioAnuncios`). Toda rota do Facebook precisa chamar esse bloqueio. Nunca confie só no menu escondido.
- O admin e a lista `ANUNCIOS_EMAILS_LIBERADOS` sempre passam (inclui a conta de teste do revisor da Meta; não remova).
- A tela conecta o Facebook do aluno, mostra métricas de **Hoje** (padrão), ontem, 7/14/30 dias e este mês, deixa pausar/ativar campanha e mudar orçamento (aumento máximo de 20% por vez). **Não cria** campanha, Pixel nem conta de anúncios: isso é no Gerenciador do Facebook.
- `ANUNCIOS_MENU_PARA_ALUNOS` liga e desliga o menu para os alunos.

**Produtos Sazonais:** menu escondido para todos, inclusive admin (`lib/acessoSazonais.ts`, `SAZONAIS_ADMIN_VE = false`).

**Cadastro só com o e-mail da compra:** `public.email_pode_cadastrar(email)` (tabelas `compras_externas` = relatórios de venda Hubla/Cakto, `hubla_compras`, `estrutura_liberados`, `cadastro_liberados` = liberação manual). A tela de login pergunta em `/api/cadastro/verificar` e o banco confere de novo num gatilho `BEFORE INSERT` em `auth.users`. Para criar conta de teste/equipe à mão, primeiro coloque o e-mail em `cadastro_liberados`. O webhook da Cakto grava compradores novos em `compras_externas`; o da Hubla grava em `hubla_compras`.

**Júnior liga sozinho (WhatsApp):** `wa_ia_config.agenda_ativa` + `agenda_inicio/fim` (padrão 08:00 às 20:00, todos os dias, Brasília). Dentro da janela vale como "assistente em todas as conversas"; fora dela vale o aviso de horário de atendimento (`wa_settings` chave `hours`). Lógica em `estadoAgendaIA` (`lib/waIA.ts`); às 8h o cron de 1 minuto (`/api/whatsapp/auto/run`) responde o que chegou de madrugada.

**Base de conhecimento do Júnior (WhatsApp):** aba "Base de conhecimento" em Atendimento; texto por chat (suporte e recuperação) em `wa_conhecimento`. Sem texto salvo vale o padrão do código (`baseCanalPadrao` em `lib/waIA.ts`). As regras do sistema (`REGRA_RESPONSAVEL`, `FINAL_REMINDER`, marcas de Express, assinatura e consulta de compra) ficam no código e sempre somam por cima. O chat do site (`app/api/chat/route.ts`) ainda usa só `lib/junior.ts`.

**Consulta de compra pelo Júnior:** marca `[[CONSULTAR_COMPRA: e-mail ou telefone]]` (`lib/juniorCompra.ts`) procura em `compras_externas` e `hubla_compras` por e-mail e telefone e devolve a resposta pronta; no WhatsApp o número da conversa também é consultado.

**Liberar cadastro pelo Júnior (WhatsApp):** quando o aluno manda o print do erro "Não encontramos uma compra com esse e-mail" OU diz que comprou (inclusive há muito tempo ou em outra plataforma, como Kiwify) e não consegue criar conta/entrar/achar as aulas na plataforma nova, o Júnior (autorizado pelo Breno, vale para qualquer aluno e não passa para a equipe) pede o e-mail digitado e emite `[[LIBERAR_CADASTRO: e-mail]]` (`lib/juniorCadastro.ts`). O sistema grava em `cadastro_liberados` (nota "Liberado pelo Júnior (WhatsApp)" com data e telefone), responde pedindo para criar a conta de novo e, após 3 liberações para o mesmo número, passa para a equipe. Não vale para o chat do site.

**Reembolso:** o Júnior nunca promete prazo nem diz que o dinheiro foi devolvido. Primeiro pergunta o motivo e tenta ajudar; só passa para a equipe se o aluno mantiver o pedido. A equipe executa.

## Júnior (assistente de IA)

- O prompt fica em `lib/junior.ts` (`JUNIOR_PROMPT`) e é **o mesmo** para o chat do site (`app/api/chat/route.ts`) e para o WhatsApp (`lib/waIA.ts`). Qualquer mudança de regra vale para os dois.
- As regras numeradas no começo têm prioridade máxima. Quando mudar uma funcionalidade da plataforma, atualize também a seção correspondente do prompt (ex.: "GERENCIANDO SEUS ANUNCIOS") e a lista de menus da regra 17.
- Para passar a conversa a um atendente, o Júnior termina a resposta com a marca `[[HUMANO]]` (removida antes do envio).
- Modelo atual: `gpt-4o-mini` (OpenAI). Chave `OPENAI_API_KEY` na Vercel.
- **Quem resolve é o Júnior** (bloco `REGRA_RESPONSAVEL` no começo e no fim do prompt): ele nunca diz "um atendente da equipe vai ajudar" nem manda chamar o suporte. Só registra o caso (marca `[[HUMANO]]` no WhatsApp, sem avisar "atendente") em reembolso mantido ou quando já tentou de duas formas. Há travas no código que tiram essas frases (`tirarPromessaDeEquipe` em `lib/junior.ts`, `lib/waIA.ts`). No número de suporte, quem fala é tratado como aluno.

## Atendimento WhatsApp (painel interno)

- Tela: `app/dashboard/atendimento/page.tsx`. Webhook: `app/api/whatsapp/webhook/route.ts`. Envio: `app/api/whatsapp/send/route.ts`.
- Tabelas: `wa_conversations`, `wa_messages`, `wa_connections`, `wa_flows`, `wa_settings`.
- O painel carrega as 500 mensagens **mais recentes** de cada conversa (conversas longas já escondiam as novas por causa disso; não volte para ordem crescente).

## Notificações (push)

- Envio pelo admin em `app/dashboard/admin/notificacoes/page.tsx`, rota `app/api/push/send/route.ts` (só admin). Títulos até 65 letras, mensagens até 240.
- Públicos: teste, todos, sem plano, com plano, **só Pro e Premium**, **todos menos Pro e Premium**.
- Tarefas automáticas diárias estão em `vercel.json` (`/api/push/auto`).

## Meta (Facebook)

- App "Plataforma MCP", ID `4403144806496403`, modo Live. Login do Facebook para Empresas, configuração "Conexao alunos" (ID `1703273714740370`).
- Permissões aprovadas com acesso avançado: `public_profile` (aprovada em 06/11/2026; sem ela só quem tem função no app consegue entrar), `pages_show_list`, `ads_read`, `pages_read_engagement`, `ads_management`. `business_management` **não** está aprovada: não peça.
- O fluxo de login está em `app/api/facebook/connect/route.ts` e `callback/route.ts`.
- Nova permissão ou mudança no uso dos dados exige novo envio na Análise do app da Meta. Só o Breno (administrador) faz isso, no painel de desenvolvedores.

## Estilo e cuidados

- Visual: variáveis CSS do tema em `app/globals.css` (`--accent`, `--surface`, `--border` etc.), com modo claro e escuro. Títulos em Syne. Use as variáveis, não cores fixas.
- Textos para alunos: simples, curtos, sem termos técnicos em inglês (se precisar de um, explique).
- Dados dos alunos são pessoais: não registre tokens, senhas ou conteúdo de conversas em logs.
- Alterações no banco (Supabase) devem ser pedidas ao Breno ou feitas por migração revisada; nunca apague dados sem confirmação.

## Construtor visual de fluxos do WhatsApp (Atendimento > Fluxos > + Novo fluxo > Fluxo em blocos)
- Tabelas: `wa_sequencias` (fluxo: gatilho e blocos em JSON), `wa_seq_runs` (cada pessoa dentro de um fluxo), `wa_seq_sends` (cada envio, com entregue/lido/falha vindos do webhook). Funcoes: `wa_seq_claim`, `wa_seq_stats`.
- Codigo: `lib/waSeq.ts` (validacao, gatilhos, motor), `lib/waSeqTipos.ts` (tipos), `components/whatsapp/ConstrutorFluxo.tsx` (tela em blocos), rotas `app/api/whatsapp/seq/*`.
- Gatilhos: palavra enviada (numero de Recuperacao, repete so apos 12 h; o assistente nao responde essa mensagem) e eventos da Hubla (via `tratarEventoSequencias` no webhook da Hubla).
- Blocos: atraso (1 s a 30 dias), texto, audio, imagem, video (so dentro de 24 h da ultima mensagem da pessoa) e modelo aprovado.
- Motor: pg_cron `wa-seq-run` a cada 15 s chama `/api/whatsapp/seq/run` (mesmo segredo `x-auto-secret`).
- Os fluxos antigos por evento (`wa_auto_flows`: "Pix Gerado" e "Aprovada") continuam separados e rodando em `lib/waAuto.ts`.
