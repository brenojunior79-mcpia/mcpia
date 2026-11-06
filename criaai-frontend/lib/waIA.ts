// Assistente de IA (Junior) dentro das conversas do WhatsApp (suporte e recuperacao).
// So responde nas conversas em que o ADMIN ligou o assistente (wa_conversations.ia_ativa) ou quando ele ligou para todas (wa_ia_config.geral).
import { JUNIOR_PROMPT, FINAL_REMINDER, NEW_STUDENT_RULE, situacaoPlanoAluno, soUmPasso, tirarLinkMarkdown, linkClicavel, tirarFrasesDeAjuda, tipoFinalConversa, situacaoFinalConversa } from '@/lib/junior'
import { phoneIdDaConversa, postMessage } from '@/lib/whatsapp'
import { agoraNoFuso } from '@/lib/waHours'
import { REGRA_EXPRESS_WHATSAPP, pediuLiberarExpress, removerMarcaExpress, liberarExpressPeloJunior, emailDaMarca } from '@/lib/juniorExpress'
import { REGRA_ASSINATURA_WHATSAPP, pediuVerificarAssinatura, removerMarcaAssinatura, emailsDaMarcaAssinatura, verificarAssinaturaPeloJunior } from '@/lib/juniorAssinatura'

const MARCA_HUMANO = '[[HUMANO]]'
const MARCA_FIM = '[[FIM]]'
const MARCA_COMPROU = '[[JA_COMPROU]]'
const MARCA_VIDEO = '[[VIDEO_APP]]'
// Link de pagamento da mentoria Cristao Prospero (Hubla)
const LINK_PAGAMENTO = 'https://pay.hub.la/GTKvY7Bjy0ouDG8CtPJg'
const PERGUNTA_RANKING = 'Você gostaria de ganhar R$200 no Pix como premiação? 💰'
const PERGUNTA_EXPRESS = 'Por acaso, você já viu os novos produtos que o Breno lançou lá na Estrutura Express? Eles estão dando uma estimativa de R$ 200 de lucro por dia (é só uma estimativa, não uma garantia).'

const REGRAS_WHATSAPP = `# REGRAS DESTE ATENDIMENTO NO WHATSAPP (PRIORIDADE MAXIMA)
- Voce esta conversando com uma pessoa pelo WhatsApp. Se perguntarem, diga que e o Junior, assistente virtual da equipe. Nunca diga que e uma pessoa.
- Quem fala com voce e leigo e comeca do zero, muitos sao idosos: palavras bem simples, sem termos tecnicos (se usar "link", "print" etc., explique rapidinho), cada passo bem detalhado (onde clicar, como e o botao), mas aos poucos, sem muita informacao de uma vez (regra 29 da base).
- Responda SEMPRE com UMA unica mensagem curta, com uma so ideia e no maximo UMA pergunta. Nunca mande duas ou tres mensagens seguidas, nunca repita lembretes que ja deu e nao junte aviso extra no fim.
- Escreva mensagens bem curtas e diretas ao ponto (1 a 3 frases curtas), simples e acolhedoras, em portugues do Brasil. Perguntas simples, de uma linha, sem introducao e sem explicar o motivo. Sem markdown (nada de **, #, tabelas). No maximo 1 emoji. Se a pessoa so confirmar que o acesso deu certo, responda apenas: "Otimo! Agora e comecar a estudar as aulas no seu melhor horario. Qualquer duvida, estou a disposicao. Pode me chamar quando quiser." (regra 28 da base).
- Excecao ao tamanho: quando a pessoa estiver travada num assunto (portfolio da Meta, conta de anuncios, Pixel, erro etc.), oriente com o passo a passo, mas SEMPRE UM PASSO POR MENSAGEM (regra 27 da base): mande so o PASSO 1 (onde entrar, o que clicar, qual opcao escolher), sem lista com varios passos, e termine com: "Quando fizer isso, me avise aqui que eu te mando o proximo passo." (nao pergunte "conseguiu entender?" nem "posso mandar o segundo?"). So mande o passo seguinte depois que ela avisar que fez. Sem markdown. ANTES de orientar, entenda o contexto fazendo UMA pergunta curta por mensagem (nunca varias de uma vez, nunca lista): espere a resposta e siga com a proxima de acordo com o que ela disse (regras 20, 24 e 26 da base). Se ela mandou so um print, diga em uma frase o que parece ver e confirme com ela, sem dar solucao nem dica generica ainda. Se a pessoa pedir ajuda sem dizer qual e a duvida ("pode me ajudar?", "nao consegui", "nao estou conseguindo", "qual o lugar correto?"), NAO peca print ainda: sua PRIMEIRA mensagem e so entender a duvida, por exemplo: "Claro, vou te ajudar! Qual e a sua duvida? Me conta o que esta acontecendo." Depois que ela contar a duvida, CONFIRME o que entendeu em uma frase e so entao peca o print da tela onde ela esta (ex.: "Entendi, voce esta com dificuldade em ... Me manda um print da tela onde voce parou?"). Se ela ja disse claramente qual e a duvida na primeira mensagem, pode pedir o print direto. Nada de passo a passo nem lista numerada nessas mensagens. (Excecao: se ela so nao consegue entrar na plataforma, siga a regra de acesso e mande o link.)
- NAO CONSEGUE ENTRAR NA CAKTO, KIWIFY OU KAIROSS (conta da plataforma de produtos, nao a plataforma Cristao Prospero): nao pergunte a duvida nem peca print primeiro. Mande NA HORA o link de login da plataforma citada, em texto puro: Cakto https://app.cakto.com.br/auth/login , Kiwify https://dashboard.kiwify.com.br/login , Kaiross https://app.kaiross.com.br/login . Diga em uma frase curta para entrar por esse link com o e-mail e a senha que cadastrou (se esqueceu a senha, tocar em "Esqueci minha senha") e pergunte se deu certo. So se ela disser que continua sem conseguir, ai entenda o que aparece e peca o print. Se ela ainda nao tem conta, mande o link de cadastro da base.
- LINKS: sempre escreva o endereco completo com https:// (ex.: https://business.facebook.com), sozinho, sem parenteses e sem pontuacao colada, para o link ficar clicavel no WhatsApp. Nunca escreva so "business.facebook.com" nem coloque o link entre parenteses.
- NAO termine a resposta com frases de enrolacao como "Se precisar de ajuda, e so avisar", "Se precisar de mais ajuda...", "Me avise se precisar", "Qualquer duvida, e so chamar" ou "Estou a disposicao". Termine so com o que foi pedido (a pergunta ou o passo). A despedida so existe quando a conversa esta acabando.
- Va com calma: um passo por vez, e espere a pessoa responder.
- Antes de responder, leia TODA a conversa anterior (mensagens da pessoa, da equipe e dos avisos automaticos). Continue de onde parou: nao repita o que ja foi dito ou perguntado e nao se apresente de novo se ja houve conversa.
- Use SOMENTE o que esta na base de conhecimento. Nunca invente preco, desconto, prazo, promessa de ganho ou funcionalidade.
- Reembolso mantido pela pessoa, cobranca ou pagamento que o sistema nao acha: siga a regra QUEM RESOLVE E VOCE (item 6): diga em primeira pessoa que anotou o pedido (sem a palavra "atendente", sem "a equipe vai ajudar" e sem prazo) e termine com a marca ${MARCA_HUMANO}. Para tudo o mais (desconto, duvida, reclamacao, acesso), VOCE resolve: nunca passe a pessoa adiante so porque ela pediu para falar com alguem; diga que voce e o Junior e que vai ajudar, e ajude.
- Se nao souber responder com a base: NAO passe para a equipe. Diga com honestidade o que voce sabe, faca UMA pergunta para entender melhor ou peca o print da tela, e continue ajudando. So registre o caso (marca ${MARCA_HUMANO}) depois de tentar de duas formas diferentes, como diz o item 6 da regra QUEM RESOLVE E VOCE.
- Se a pessoa mandar print, foto ou PDF, voce consegue ver o conteudo: leia com atencao, diga em uma frase o que entendeu e ajude com base nisso. Se a imagem estiver ilegivel ou nao der para entender, peca outro print mais nitido. Comprovante de pagamento ou documento pessoal: NAO confirme pagamento nem libere nada; agradeca e avise que um atendente vai conferir, terminando com ${MARCA_HUMANO}.
- Quando a conversa estiver terminando (a pessoa agradeceu, disse que resolveu, se despediu ou nao precisa de mais nada): escreva so uma despedida curta e acolhedora (uma vez so) e termine com a marca ${MARCA_FIM}. NAO escreva voce mesmo a pergunta final (R$200 no Pix ou Estrutura Express): o sistema acrescenta sozinho no fim da despedida (regras 35 e 36 da base). Se a pessoa responder SIM a pergunta dos R$200, ensine o ranking aos poucos, um passo por mensagem; se responder a pergunta da Estrutura Express, siga a regra 36 (um passo por vez, sem inventar prazo); so depois de terminar o ranking, e se a SITUACAO DO ALUNO permitir a oferta do plano e ela ainda NAO foi feita nesta conversa, faca a oferta curta com as vantagens (regra 25), sem a marca ${MARCA_FIM}. Se ela responder NAO, aceite em uma frase e nao insista. Se a pessoa ainda tem duvida ou esta no meio do assunto, nao use a marca.
- IMPORTANTE: a pessoa JA esta falando com o Suporte pelo WhatsApp, e quem atende e VOCE. NUNCA diga para ela chamar, procurar, falar com ou abrir o "WhatsApp de Suporte" nem o suporte pelo menu, e nunca diga "um atendente vai ajudar".
- Nao peca para a pessoa chamar o WhatsApp de Suporte: ela ja esta falando com o suporte (com voce).
- Se a pessoa disser que comprou faz tempo e so agora comecou, e perguntar se ainda vale: responda "Sim, vale sim! A mentoria é vitalícia." e ajude a entrar na plataforma (link https://www.mcpia.site/ e o primeiro passo, aos poucos).`

const REGRAS_CANAL: Record<string, string> = {
  suporte: '# CANAL: SUPORTE\nEsta pessoa fala com o Suporte da plataforma e da mentoria (normalmente aluno). Ajude a resolver a duvida ou dificuldade.',
  recuperacao: '# CANAL: RECUPERACAO\nVoce esta no numero de RECUPERACAO: seu papel e de vendedor acolhedor, nao de professor. Esta pessoa foi contatada pela equipe porque iniciou uma compra (por exemplo gerou um Pix) e nao concluiu, ou acabou de comprar. Tire as duvidas dela sobre a mentoria Cristao Prospero e explique como funciona, com carinho, sem pressionar, SO com o que esta na base (secao SOBRE A MENTORIA), sem inventar condicoes. RESPOSTAS CURTAS: responda so o basico, em 1 a 2 frases, sem textao, e siga a regra 40 (roteiro do Breno para: como vou vender, vou ter que investir, suporte). Este canal NAO e para tirar duvidas sobre aulas ou uso da plataforma. Se ela pedir o link para pagar, mande o link de pagamento (regra na linha SITUACAO DESTA PESSOA). Desconto, valor negociado e problemas de pagamento vao para um atendente. Veja no fim das instrucoes a linha "SITUACAO DESTA PESSOA": se ela ainda NAO e aluna, siga a regra daquela linha (ela vale mais que todas as regras de aluno).',
}

// Pessoa que o sistema NAO reconhece como aluna (sem cadastro na plataforma e sem compra): nunca recebe link da plataforma nem orientacao de aluno
const REGRA_NAO_ALUNA = `# SITUACAO DESTA PESSOA: AINDA NAO E ALUNA (PRIORIDADE MAXIMA - SOBREPOE TODAS AS REGRAS DE ALUNO ACIMA)
O sistema NAO achou cadastro na plataforma nem compra desta pessoa. Ela NAO e aluna. Por isso:
- NUNCA mande o link da plataforma (mcpia.site), nunca fale em "Criar conta", "Esqueci minha senha", login, menus, aulas, "continue assistindo as aulas", Produtos em Alta, Criativos Manuais, Vendendo no Automatico ou qualquer coisa que so aluno usa. A UNICA excecao e a pessoa que disse que JA COMPROU (veja a regra "JA COMPROU" abaixo). Ignore as regras 24 e 31 e os trechos "ALUNO SEM ACESSO" e "NAO CONSEGUE ACESSAR" da base: eles NAO valem para esta pessoa.
- RESPOSTAS CURTAS (PRIORIDADE): responda so o basico, em 1 a 2 frases curtas, e use o roteiro da regra 40 quando ela perguntar como vai vender, se precisa investir ou sobre o suporte.
- Seu papel aqui e de recuperacao: entender com carinho, UMA pergunta por vez, o que impediu a compra, e tirar duvidas sobre a mentoria SO com o que esta na base (secao SOBRE A MENTORIA), sem pressionar e sem prometer ganho.
- NAO EXISTE AULA GRATUITA. Ignore qualquer trecho da base que diga que as aulas sao gratis ou que ficam na plataforma: isso e so para aluno. Nunca diga que ela vai "acessar as aulas pelo site", nunca explique como usar a plataforma e nunca tire duvida sobre as aulas. Se ela perguntar como acessar as aulas (ou pedir aula gratuita), diga com carinho que hoje nao tem aula gratuita e que as aulas ficam liberadas para quem entra na mentoria; se ela ainda nao tem video, pergunte se quer saber como funciona.
- VIDEO DO APP: neste video o Breno apresenta o aplicativo e a plataforma e mostra como a pessoa usa, entao ela consegue ver ANTES de comprar. Use quando ela tiver duvida sobre a mentoria ou o app, perguntar como funciona, como e por dentro, o que vai receber, se vale a pena, pedir demonstracao, exemplo, prova ou aula gratuita. Escreva UMA frase curta e acolhedora dizendo que vai mandar um video que mostra o aplicativo e como funciona por dentro (se ela pediu aula gratuita, diga antes, com carinho, que hoje nao tem aula gratuita) e termine com a marca ${MARCA_VIDEO} (o sistema envia o video depois da sua mensagem e tira a marca). Se ela fez uma pergunta especifica, responda em uma frase com a base e mande o video junto. So uma vez por conversa: se a linha "Video do app" no fim das instrucoes disser que ja foi enviado, nao use a marca de novo. Depois do video, pergunte se ficou alguma duvida.
- LINK DE PAGAMENTO: se ela disser que quer comprar, se inscrever, entrar na mentoria, pedir o link de pagamento ou aceitar o que o atendente ofereceu (ex.: "pode mandar o link", "vamos", "quero"): mande NESTA mesma mensagem o link ${LINK_PAGAMENTO} (so o link, em texto puro, sem markdown) e diga "Assim que finalizar o pagamento me avisa aqui". NAO peca e-mail, NAO diga que vai liberar acesso e NAO use ${MARCA_HUMANO}. Nao mande o link se ela nao pediu nem demonstrou vontade de comprar: primeiro tire as duvidas dela sobre a mentoria e, se fizer sentido, pergunte se quer que voce mande o link.
- Se a equipe (atendente) ja mandou mensagem nesta conversa, continue de onde ela parou e nunca ignore o que o atendente ofereceu. Nunca peca o mesmo dado (como o e-mail) duas vezes.
- Se ela falar de problema no pagamento, cartao recusado, fatura, limite, falta de dinheiro, preco, parcela, Pix que expirou, desconto ou negociacao (e NAO so pediu o link de pagamento): acolha em uma frase curta e ajude voce mesmo: Pix que expirou ou cartao recusado = mande de novo o link ${LINK_PAGAMENTO} (so o link, sozinho) e diga que la ela gera outro Pix ou tenta outro cartao; preco, parcela ou desconto = diga com carinho que o valor e o que aparece na tela de pagamento e que voce nao negocia valores. Nao invente valor, desconto, prazo ou condicao. So se ela insistir muito em negociar ou o problema continuar depois do link, diga que anotou o pedido (sem a palavra "atendente") e termine com ${MARCA_HUMANO}.
- JA COMPROU (a pessoa disse que ja comprou, que comprou faz tempo e so agora vai comecar, ou perguntou "ainda vale?"): ela e uma aluna que ainda nao entrou na plataforma. Comece a resposta com a marca ${MARCA_COMPROU} (o sistema tira a marca). Se ela perguntou se ainda vale, diga "Sim, vale sim! A mentoria é vitalícia." Depois mande o link https://www.mcpia.site/ e SO o primeiro passo, em palavras bem simples: abrir o link, clicar no botao "Criar conta" e criar a conta com o MESMO e-mail que usou na compra (se ela disser que ja tem conta, oriente entrar com o e-mail e, se esqueceu a senha, tocar em "Esqueci minha senha"). Termine com "Quando fizer isso, me avise aqui que eu te ajudo no proximo passo." Nao peca o e-mail antes, nao diga que vai conferir, nao use ${MARCA_HUMANO} nessa primeira resposta. Se for sobre a Estrutura Express, siga a regra de liberacao da Estrutura Express.
- NAO CONSEGUE ACESSAR A PLATAFORMA (ela disse que nao consegue acessar/entrar/logar na plataforma, no site ou nas aulas, mas NAO disse que comprou): NAO mande o link e NAO passe para a equipe ainda. Responda so, em uma frase curta e acolhedora: "Oi! Você já comprou a mentoria? Se sim, me conta que eu te ajudo a entrar." (sem marca de atendente). Se ela responder que SIM (ou "comprei", "sim"), trate como JA COMPROU (regra abaixo): comece com a marca ${MARCA_COMPROU}, mande o link https://www.mcpia.site/ e so o primeiro passo. Se responder que NAO comprou, diga com carinho que a plataforma e so para quem entra na mentoria e pergunte se quer saber como funciona.
- Se ela disser que JA tentou entrar e nao conseguiu (ou depois de seguir o passo do link ainda nao consegue): pergunte so "Qual e-mail voce usou na compra?" e, quando ela responder, diga que anotou o e-mail e o caso (sem a palavra "atendente" e sem prazo) e termine com ${MARCA_HUMANO}.
- NUNCA diga ou sugira que ela ja e aluna, nunca invente "novos recursos serao liberados em breve" nem nada que nao esteja na base.
- Se ela duvidar de quem voce e ou pedir para provar que voce e o Breno: diga com honestidade que voce e o Junior, assistente virtual da equipe do Breno.`

// Pessoa e aluna se tem cadastro ligado a conversa ou compra (sem reembolso) pelo numero do WhatsApp. Na duvida (erro), trata como NAO aluna: o pior caso e ir para a equipe.
async function pessoaEhAluna(admin: any, waId: string, profileId: string | null): Promise<boolean> {
  try {
    if (profileId) return true
    const tail = String(waId || '').replace(/\D/g, '').slice(-8)
    if (tail.length < 8) return false
    const r = await admin.from('hubla_compras').select('id', { head: true, count: 'exact' }).eq('reembolsado', false).like('wa', '%' + tail)
    if (r.error) return false
    return (r.count || 0) > 0
  } catch (e) { return false }
}

function rotuloTipo(t: string): string {
  return t === 'image' ? '[imagem]' : t === 'audio' ? '[audio]' : t === 'video' ? '[video]' : t === 'document' ? '[documento]' : t === 'sticker' ? '[figurinha]' : ''
}

// Baixa o audio guardado e transcreve com o Whisper. O texto fica em wa_messages.body (a tela de atendimento nao mostra o body de audio).
async function transcreverAudio(admin: any, msgId: string): Promise<string> {
  try {
    const r = await admin.from('wa_messages').select('body, media_path, mime').eq('id', msgId).maybeSingle()
    const m: any = r.data
    if (!m) return ''
    if (String(m.body || '').trim()) return String(m.body).trim()
    if (!m.media_path) return ''
    const dl = await admin.storage.from('wa-media').download(m.media_path)
    if (dl.error || !dl.data) return ''
    const buf = await dl.data.arrayBuffer()
    if (buf.byteLength < 200) return ''
    const mime = String(m.mime || 'audio/ogg')
    const ext = mime.indexOf('mpeg') >= 0 ? 'mp3' : mime.indexOf('mp4') >= 0 ? 'm4a' : mime.indexOf('aac') >= 0 ? 'aac' : mime.indexOf('amr') >= 0 ? 'amr' : 'ogg'
    const fd = new FormData()
    fd.append('file', new Blob([buf], { type: mime }), 'audio.' + ext)
    fd.append('model', 'whisper-1')
    fd.append('language', 'pt')
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY }, body: fd, signal: AbortSignal.timeout(25000) })
    const j: any = await resp.json().catch(function() { return null })
    const texto = String(j?.text || '').trim()
    if (!resp.ok || !texto) { console.error('[wa-ia] transcricao falhou:', resp.status, JSON.stringify(j?.error || '')); return '' }
    await admin.from('wa_messages').update({ body: texto }).eq('id', msgId)
    return texto
  } catch (e) {
    console.error('[wa-ia] transcricao:', e)
    return ''
  }
}

// Le uma foto/print ou PDF guardado e devolve o pedaco que a IA entende (ou null se nao for imagem/PDF ou for grande demais)
async function parteDaMidia(admin: any, m: any): Promise<any | null> {
  try {
    if (!m || !m.media_path) return null
    const mime = String(m.mime || '').toLowerCase().split(';')[0]
    const imagem = mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp'
    const pdf = mime === 'application/pdf'
    if (!imagem && !pdf) return null
    const dl = await admin.storage.from('wa-media').download(m.media_path)
    if (dl.error || !dl.data) return null
    const buf = Buffer.from(await dl.data.arrayBuffer())
    if (buf.length < 100 || buf.length > (pdf ? 10 : 8) * 1024 * 1024) return null
    const b64 = buf.toString('base64')
    if (imagem) return { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64, detail: 'auto' } }
    return { type: 'file', file: { filename: 'arquivo.pdf', file_data: 'data:application/pdf;base64,' + b64 } }
  } catch (e) {
    console.error('[wa-ia] midia:', e)
    return null
  }
}

// Quando o assistente deveria responder e nao conseguiu: deixa um aviso na conversa para a equipe ver e atender (nunca fica em silencio)
async function avisarFalha(admin: any, convId: string, motivo: string): Promise<void> {
  try {
    console.error('[wa-ia] sem resposta:', motivo)
    await admin.from('wa_messages').insert({ conversation_id: convId, direction: 'out', type: 'system', body: '⚠️ O assistente não conseguiu responder esta mensagem. Atenda manualmente.', status: 'sent', sent_by: null, created_at: new Date().toISOString() })
  } catch (e) { /* aviso e so conforto */ }
}

// Quando o assistente deve responder nesta conversa:
//  - 'manual': o admin ligou nesta conversa (ia_ativa)
//  - 'geral': o admin ligou o assistente para TODAS as conversas (wa_ia_config.geral), a conversa nao foi desligada
//    de proposito (ia_humano). Ligado = responde sempre, mesmo que a equipe tenha respondido antes
export type AgendaIA = { geral: boolean; agendaAtiva: boolean; inicio: string; fim: string; dentro: boolean }

// Le a configuracao do assistente: ligado para todas (geral) e/ou agenda diaria (ex.: das 08:00 as 20:00, todos os dias, horario de Brasilia)
export async function estadoAgendaIA(admin: any, d: Date = new Date()): Promise<AgendaIA> {
  const c = await admin.from('wa_ia_config').select('geral, agenda_ativa, agenda_inicio, agenda_fim').eq('id', 1).maybeSingle()
  const x: any = c.data || {}
  const inicio = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(x.agenda_inicio)) ? String(x.agenda_inicio) : '08:00'
  const fim = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(x.agenda_fim)) ? String(x.agenda_fim) : '20:00'
  const hm = agoraNoFuso('America/Sao_Paulo', d).hm
  const dentro = inicio < fim ? (hm >= inicio && hm < fim) : (hm >= inicio || hm < fim)
  return { geral: x.geral === true, agendaAtiva: x.agenda_ativa === true, inicio, fim, dentro }
}

// true quando o atendimento "de verdade" esta valendo agora para o aviso de horario:
// com a agenda ligada, o assistente atende dentro da janela e fora dela vale o aviso de horario de atendimento
export function assistenteAtendendoAgora(a: AgendaIA): boolean { return a.geral || (a.agendaAtiva && a.dentro) }

export async function modoIA(admin: any, conv: any): Promise<'manual' | 'geral' | null> {
  if (conv.ia_ativa === true) return 'manual'
  if (conv.ia_humano === true) return null
  const a = await estadoAgendaIA(admin)
  if (!assistenteAtendendoAgora(a)) return null
  return 'geral'
}

// Chamado pelo webhook a cada mensagem recebida.
// Mensagem so de agradecimento/despedida ("valeu", "blz", "obrigado", "amem", "🙏"). Depois que o assistente ja se despediu,
// responder de novo so repete a despedida: nao responde nada.
function soAgradecimento(txt: string): boolean {
  const t = String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const palavras = t.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return t.trim().length > 0 && t.trim().length <= 12 // so emoji/pontuacao (ex.: 🙏 👍)
  if (palavras.length > 6) return false
  const agradece = ['obrigado', 'obrigada', 'obg', 'brigado', 'brigada', 'valeu', 'vlw', 'blz', 'beleza', 'show', 'top', 'joia', 'amem', 'gratidao', 'grato', 'grata', 'tmj', 'tchau', 'abraco', 'abracos', 'fui']
  const neutras = ['muito', 'ok', 'certo', 'ta', 'tudo', 'bem', 'entendi', 'perfeito', 'combinado', 'deus', 'abencoe', 'aben', 'fica', 'com', 'voce', 'vc', 'ate', 'mais', 'paz', 'senhor', 'de', 'nada', 'a', 'o', 'e', 'tá']
  let achou = false
  for (const p of palavras) {
    if (agradece.indexOf(p) >= 0) achou = true
    else if (neutras.indexOf(p) < 0) return false
  }
  return achou
}

// Sabe se o aluno ja tem a Estrutura Express (compra da Express sem reembolso, ou liberado pela equipe). Em caso de duvida devolve null.
async function descobrirTemExpress(admin: any, email: string, admin_: boolean): Promise<boolean | null> {
  try {
    if (admin_) return true
    const e = String(email || '').trim().toLowerCase()
    if (!e) return null
    const [c, l] = await Promise.all([
      admin.from('hubla_compras').select('id', { head: true, count: 'exact' }).eq('cat', 'e').eq('reembolsado', false).ilike('email', e),
      admin.from('estrutura_liberados').select('email', { head: true, count: 'exact' }).ilike('email', e),
    ])
    if (c.error || l.error) return null
    return ((c.count || 0) + (l.count || 0)) > 0
  } catch (er) { return null }
}

// Devolve true quando o assistente esta LIGADO nessa conversa (o webhook entao nao manda o aviso de horario nem os fluxos).
export async function tratarIA(admin: any, convId: string, waId: string, msgId: string, tipo: string, nomeContato: string | null): Promise<boolean> {
  try {
    const cv = await admin.from('wa_conversations').select('id, ia_ativa, ia_humano, connection_id, profile_id, name').eq('id', convId).maybeSingle()
    const conv: any = cv.data
    if (!conv || !(await modoIA(admin, conv))) return false
    // Responde a texto, audio (transcrito antes), imagem/print e PDF (a IA olha o arquivo). Video, figurinha etc. ficam para a equipe ver
    if (tipo !== 'text' && tipo !== 'audio' && tipo !== 'image' && tipo !== 'document') return true
    if (!process.env.OPENAI_API_KEY) { console.error('[wa-ia] OPENAI_API_KEY ausente'); return true }
    if (tipo === 'image' || tipo === 'document') {
      // Outros tipos de arquivo (Word, planilha...) ou arquivo que nao deu para abrir: fica para a equipe
      const mr = await admin.from('wa_messages').select('media_path, mime').eq('id', msgId).maybeSingle()
      if (!(await parteDaMidia(admin, mr.data))) { await avisarFalha(admin, convId, 'arquivo nao pode ser lido pelo assistente'); return true }
    }
    if (tipo === 'audio') {
      const fala = await transcreverAudio(admin, msgId)
      // Nao deu para entender o audio: fica para a equipe ouvir
      if (!fala) { await avisarFalha(admin, convId, 'audio nao transcrito'); return true }
    }

    const hist = await admin.from('wa_messages').select('id, wa_message_id, direction, type, body, created_at, media_path, mime').eq('conversation_id', convId).order('created_at', { ascending: false }).limit(300)
    const linhas: any[] = (hist.data || []).slice().reverse()
    if (linhas.length === 0) return true
    // Se ja chegou mensagem mais nova, ela mesma sera respondida (com a conversa completa)
    const ultimaIn = [...linhas].reverse().find(function(m) { return m.direction === 'in' })
    if (!ultimaIn || String(ultimaIn.id) !== String(msgId)) return true

    const msgs: { role: 'user' | 'assistant'; content: any }[] = []
    for (const m of linhas) {
      const txt = m.type === 'audio' && String(m.body || '').trim() ? '[audio transcrito] ' + String(m.body).trim() : (String(m.body || '').trim() || rotuloTipo(String(m.type || '')))
      if (!txt) continue
      const role = m.direction === 'in' ? 'user' : 'assistant'
      const last = msgs[msgs.length - 1]
      if (last && last.role === role) last.content += '\n' + txt
      else msgs.push({ role, content: txt })
    }
    if (msgs.length === 0 || msgs[msgs.length - 1].role !== 'user') return true
    // So agradeceu/se despediu e o assistente ja tinha encerrado (a ultima mensagem dele nao era uma pergunta): nao responde de novo
    if (tipo === 'text' && soAgradecimento(String((ultimaIn as any).body || ''))) {
      const ultimaOut = [...linhas].reverse().find(function(m) { return m.direction === 'out' && String(m.body || '').trim() })
      if (ultimaOut && !/\?\s*$/.test(String(ultimaOut.body || '').trim())) return true
    }
    // O assistente le a conversa toda (inclusive o que a equipe e os fluxos automaticos ja mandaram) para saber o contexto.
    // Se for muito longa, descarta so as mensagens mais antigas.
    let total = msgs.reduce(function(n, m) { return n + m.content.length + 8 }, 0)
    while (msgs.length > 1 && total > 40000) { total -= msgs[0].content.length + 8; msgs.shift() }

    // Fotos/prints e PDFs que a pessoa mandou desde a ultima resposta (ate 3): a IA olha junto com o texto
    const partes: any[] = []
    for (let i = linhas.length - 1; i >= 0 && partes.length < 3; i--) {
      const m = linhas[i]
      if (m.direction === 'out' && m.type !== 'system') break
      if (m.direction === 'in' && (m.type === 'image' || m.type === 'document')) {
        const pt = await parteDaMidia(admin, m)
        if (pt) partes.unshift(pt)
      }
    }
    if (partes.length > 0) {
      const ult = msgs[msgs.length - 1]
      ult.content = [{ type: 'text', text: String(ult.content) }, ...partes]
    }

    // Quem e a pessoa: aluno da plataforma (nos 7 primeiros dias sem plano nao se fala de planos) ou contato sem cadastro
    let nome = String(nomeContato || conv.name || '').trim()
    let esconderPlanos = true
    let temPlano = false
    let temExpress: boolean | null = null
    if (conv.profile_id) {
      const pr = await admin.from('profiles').select('full_name, created_at, subscription_status, is_admin, email').eq('id', conv.profile_id).maybeSingle()
      const p: any = pr.data
      if (p) {
        if (p.full_name) nome = String(p.full_name)
        temExpress = await descobrirTemExpress(admin, String(p.email || ''), p.is_admin === true)
        const ativo = p.subscription_status === 'active' || p.subscription_status === 'trialing'
        temPlano = ativo
        const idadeMs = p.created_at ? Date.now() - new Date(p.created_at).getTime() : Infinity
        esconderPlanos = !ativo && p.is_admin !== true && idadeMs < 7 * 24 * 60 * 60 * 1000
        // Sem cadastro conhecido ou aluno novo: esconde planos. Aluno antigo: segue o comportamento normal do Junior.
      }
    }
    const primeiro = nome.split(' ')[0] || 'voce'
    const canal = conv.connection_id ? 'recuperacao' : 'suporte'

    let system = JUNIOR_PROMPT.split('{{firstName}}').join(primeiro) + '\n\n' + FINAL_REMINDER + '\n\n' + REGRAS_CANAL[canal] + '\n\n' + REGRAS_WHATSAPP + '\n\n' + REGRA_EXPRESS_WHATSAPP + '\n\n' + REGRA_ASSINATURA_WHATSAPP + '\n\nNome da pessoa: ' + (nome || 'desconhecido')
    if (esconderPlanos) system = NEW_STUDENT_RULE + '\n\n' + system + '\n\n' + NEW_STUDENT_RULE
    const sitPlano = situacaoPlanoAluno(temPlano, esconderPlanos)
    if (sitPlano) system = system + '\n\n' + sitPlano
    // Para a liberacao da Estrutura Express: o Junior so pede o e-mail se o sistema nao conhece a conta desta conversa
    const tipoFinal = tipoFinalConversa(temExpress, convId)
    system = system + '\n\n' + situacaoFinalConversa(tipoFinal)
    // Quem nao e aluna (sem cadastro e sem compra) nunca recebe orientacao nem link de aluno
    // No numero de SUPORTE a pessoa e tratada como aluna (muitos alunos compraram com outro telefone e o sistema nao os reconhece). A trava de "nao aluna" vale so no numero de recuperacao.
    const ehAluna = canal === 'suporte' ? true : await pessoaEhAluna(admin, waId, conv.profile_id || null)
    if (!ehAluna) system = REGRA_NAO_ALUNA + '\n\n' + system + '\n\n' + REGRA_NAO_ALUNA
    system = system + '\n\nEstrutura Express desta pessoa: ' + (temExpress === true ? 'JA TEM acesso liberado no sistema.' : temExpress === false ? 'o sistema NAO achou compra nem liberacao da Estrutura Express nesta conta.' : 'o sistema NAO sabe (conta nao identificada).')
    system = system + '\n\nConta identificada: ' + (conv.profile_id ? 'SIM (o sistema ja sabe quem e a pessoa; nao peca e-mail).' : ehAluna ? 'NAO (peca o e-mail da plataforma antes de liberar).' : 'NAO, e ela ainda nao e aluna (nao peca e-mail para liberar nada; so pergunte o e-mail da compra se ela disser que ja comprou).')

    // Video "App" (resposta rapida salva no canal de recuperacao): so uma vez por conversa
    const jaVideo = linhas.some(function(m) { return m.direction === 'out' && m.type === 'video' })
    system = system + '\n\nVideo do app: ' + (canal !== 'recuperacao' ? 'nao se aplica a este canal (nao use a marca ' + MARCA_VIDEO + ').' : jaVideo ? 'JA foi enviado nesta conversa (nao use a marca ' + MARCA_VIDEO + ' de novo; se ela quiser ver de novo, diga que o video esta logo acima na conversa).' : 'ainda NAO foi enviado nesta conversa.')

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: system }, ...msgs], max_tokens: 700, temperature: 0.2 }),
      signal: AbortSignal.timeout(22000),
    })
    const j: any = await resp.json().catch(function() { return null })
    let texto = String(j?.choices?.[0]?.message?.content || '').trim()
    if (!resp.ok || !texto) { await avisarFalha(admin, convId, 'IA sem resposta ' + resp.status + ' ' + JSON.stringify(j?.error || '')); return true }

    // Sem markdown no WhatsApp: tira ** e __ que a IA as vezes coloca
    texto = linkClicavel(tirarLinkMarkdown(texto.replace(/\*\*/g, '').replace(/__/g, '')))
    // Trava: nunca mandar varios passos de uma vez. Fica so o passo 1 e pergunta se pode mandar o proximo.
    texto = soUmPasso(texto)
    let passaParaHumano = texto.indexOf(MARCA_HUMANO) >= 0
    const jaComprou = texto.indexOf(MARCA_COMPROU) >= 0
    const querVideo = texto.indexOf(MARCA_VIDEO) >= 0 && canal === 'recuperacao' && !jaVideo
    texto = texto.split(MARCA_COMPROU).join('').split(MARCA_VIDEO).join('').split(MARCA_HUMANO).join('').trim()
    if (!texto && passaParaHumano) texto = 'Anotei o seu pedido aqui, ' + primeiro + '.'
    // Trava dura: quem nao e aluna nunca recebe link da plataforma nem "criar conta"/"esqueci minha senha" (vai para a equipe)
    if (!ehAluna && !jaComprou && /mcpia\.site|criar\s+conta|esqueci\s+minha\s+senha|\bsenha\b.*\be-?mail\b|acess(ar|e)\s+o\s+site|dentro\s+da\s+plataforma|mesmo\s+e-?mail/i.test(texto)) {
      console.error('[wa-ia] bloqueado: link/acesso de aluno para quem nao e aluna', convId)
      const msgIn = String((ultimaIn as any).body || '')
      if (/(consig|conseg|acess|entrar|entra[rn]|login|logar|senha|plataforma|site)/i.test(msgIn) && !/(comprei|paguei|ja comprei|já comprei)/i.test(msgIn)) {
        texto = 'Oi! Você já comprou a mentoria? Se sim, me conta que eu te ajudo a entrar.'
      } else {
        texto = 'Me conta um pouquinho melhor o que você precisa, ' + primeiro + '? Se puder, manda um print da tela.'
      }
    }
    // Trava: se mesmo assim mandar a pessoa "chamar o suporte", tira a frase e passa para a equipe
    {
      const frases = texto.split(/(?<=[.!?])\s+|\n+/)
      const ruim = /(whatsapp\s+de\s+suporte|chama(r)?\s+(o\s+)?suporte|fale\s+com\s+o\s+suporte|entre\s+em\s+contato\s+com\s+o\s+suporte|suporte\s+pelo\s+menu)/i
      const boas = frases.filter(function(f) { return f.trim() && !ruim.test(f) })
      if (boas.length < frases.filter(function(f) { return f.trim() }).length) {
        // So tira a frase que manda a pessoa para o suporte; o Junior continua responsavel pela conversa
        texto = boas.join('\n\n').trim()
        if (!texto) texto = 'Me conta um pouquinho melhor o que está acontecendo, ' + primeiro + '? Se puder, manda um print da tela.'
      }
    }
    // Trava: o Junior e o responsavel, entao nao pode dizer que "um atendente / a equipe vai ajudar". Tira so a frase (a marca interna continua avisando o Breno em silencio).
    {
      const promete = /(um|o|nosso)\s+atendente|(a\s+)?equipe\s+(da\s+equipe\s+)?(vai|ira|irá|vem|entra|continua|continuar[aá]|te\s+ajud|verific|confer|libera|assum)|vou\s+(pedir|passar|encaminhar|chamar)\b.{0,40}(atendente|equipe)|vou\s+(verificar|conferir)\s+(a\s+sua|o\s+seu|sua|seu)\s+(conta|cadastro|acesso)/i
      const fr = texto.split(/(?<=[.!?])\s+|\n+/).filter(function(f) { return f.trim() })
      const ok = fr.filter(function(f) { return !promete.test(f) })
      if (ok.length < fr.length) {
        texto = ok.join('\n\n').trim()
        if (!texto) texto = passaParaHumano ? 'Anotei o seu pedido aqui, ' + primeiro + '.' : 'Me conta um pouquinho melhor o que você precisa, ' + primeiro + '? Se puder, manda um print da tela.'
      }
    }
    // Fim da conversa: pergunta (uma vez so por conversa) se a pessoa quer ganhar R$200 no Pix (leva ao ranking)
    let acabou = texto.indexOf(MARCA_FIM) >= 0
    texto = texto.split(MARCA_FIM).join('').trim()
    // O modelo quase nunca lembra de escrever a marca de fim. Entao o sistema tambem reconhece sozinho: a pessoa so agradeceu/confirmou/se despediu
    // e a resposta e uma despedida (sem pergunta). Ai a pergunta final (R$200 no Pix ou Estrutura Express) entra do mesmo jeito.
    if (!acabou && !passaParaHumano && texto && texto.indexOf('?') < 0) {
      const corpoIn = String((ultimaIn as any).body || '').trim()
      const soAgradeceu = (ultimaIn as any).type === 'text' && corpoIn.length > 0 && corpoIn.length <= 45 && /^(?:\s|[^a-zA-Z0-9\u00C0-\u017F]|muito|obrigad[oa]s?|obg|brigad[oa]|valeu|vlw|ok|okay|certo|combinado|beleza|blz|show|perfeito|[oó]timo|am[eé]m|deus|te|aben[cç]o[ae]|t[aá]|bom|entendi|entendido|fechado|consegui|deu|certinho|certo|tchau|at[eé]|mais|logo|gra[cç]as|a|voc[eê]|pela|ajuda|tamb[eé]m|igualmente|para|voc[eê]s|paz|do|senhor)+$/i.test(corpoIn)
      const ehDespedida = /dispo[sz]i[cç][aã]o|qualquer\s+d[uú]vida|aben[cç]oe|bons\s+estudos|boa\s+sorte|at[eé]\s+mais|[eé]\s+s[oó]\s+(me\s+)?chamar|comecar a estudar|começar a estudar/i.test(texto)
      if (soAgradeceu && ehDespedida) acabou = true
    }
    // So alunas recebem a pergunta final (quem ainda nao e aluna nao tem ranking nem Estrutura Express)
    if (acabou && !passaParaHumano && ehAluna) {
      const jaRank = linhas.some(function(m) { return m.direction === 'out' && /ganhar R\$\s?200 no Pix/i.test(String(m.body || '')) })
      const jaExp = linhas.some(function(m) { return m.direction === 'out' && /novos produtos que o Breno/i.test(String(m.body || '')) })
      // alterna: usa o tipo definido; se esse ja foi perguntado antes, tenta o outro (a Express so para quem nao tem); se os dois ja foram, nao pergunta mais
      let escolha: 'ranking' | 'express' | null = tipoFinal
      if (escolha === 'ranking' && jaRank) escolha = (temExpress === false && !jaExp) ? 'express' : null
      else if (escolha === 'express' && jaExp) escolha = !jaRank ? 'ranking' : null
      if (escolha === 'ranking' && texto.indexOf('ganhar R$200 no Pix') < 0) texto = (texto ? texto + '\n\n' : '') + PERGUNTA_RANKING
      if (escolha === 'express' && texto.indexOf('novos produtos que o Breno') < 0) texto = (texto ? texto + '\n\n' : '') + PERGUNTA_EXPRESS
    }
    // Frases de enrolacao no fim ("Se precisar de ajuda, e so avisar") saem, a nao ser que seja a despedida final da conversa
    if (!acabou) texto = tirarFrasesDeAjuda(texto)
    if (!texto) { await avisarFalha(admin, convId, 'texto vazio'); return true }

    // Depois de pensar: conferir de novo se continua ligado e se nao chegou mensagem mais nova
    const [cv2, ult] = await Promise.all([
      admin.from('wa_conversations').select('id, ia_ativa, ia_humano').eq('id', convId).maybeSingle(),
      admin.from('wa_messages').select('id').eq('conversation_id', convId).eq('direction', 'in').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (!cv2.data || !(await modoIA(admin, cv2.data))) return true
    if (!ult.data || String((ult.data as any).id) !== String(msgId)) return true

    // O assistente pediu para conferir a assinatura (plano da plataforma): o sistema confere o pagamento, libera se estiver tudo certo e escreve a resposta
    if (pediuVerificarAssinatura(texto) && !pediuLiberarExpress(texto)) {
      let contaEmail = ''
      if (conv.profile_id) {
        const pe = await admin.from('profiles').select('email').eq('id', conv.profile_id).maybeSingle()
        contaEmail = String((pe.data as any)?.email || '')
      }
      const resA = await verificarAssinaturaPeloJunior(admin, { conta: contaEmail, waId, origem: 'whatsapp', emails: emailsDaMarcaAssinatura(texto) })
      texto = resA.texto
      if (resA.humano) passaParaHumano = true
    } else if (pediuLiberarExpress(texto)) {
      // Conta ligada a conversa (se houver); senao o banco acha pelo numero do WhatsApp
      let contaEmail = ''
      if (conv.profile_id) {
        const pe = await admin.from('profiles').select('email').eq('id', conv.profile_id).maybeSingle()
        contaEmail = String((pe.data as any)?.email || '')
      }
      const res = await liberarExpressPeloJunior(admin, { conta: contaEmail, waId, origem: 'whatsapp', emailInformado: emailDaMarca(texto) })
      texto = res.texto
      if (res.humano) passaParaHumano = true
    } else {
      texto = removerMarcaAssinatura(removerMarcaExpress(texto))
      if (!texto) { await avisarFalha(admin, convId, 'texto vazio apos marca express'); return true }
    }

    // A resposta nao sai na hora: vai para a fila e o Junior "digita" como uma pessoa (lib/waIAFila.ts).
    // Respostas antigas ainda nao enviadas desta conversa saem da fila (vale a mais nova).
    const agoraIso = new Date().toISOString()
    await admin.from('wa_ia_fila').update({ estado: 'cancelado', erro: 'substituida', finalizado_em: agoraIso }).eq('conversation_id', convId).eq('estado', 'pendente')
    // Primeira mensagem (conversa parada ha mais de 3h): leva cerca de 1 minuto para ser lida e respondida.
    // No meio de uma conversa em andamento a leitura e mais rapida.
    const jaConversavam = linhas.some(function(m) { return String(m.id) !== String(msgId) && Date.now() - new Date(m.created_at).getTime() < 3 * 3600 * 1000 })
    const esperaLeituraS = jaConversavam ? 8 + Math.random() * 10 : 46 + Math.random() * 10
    const lerEm = new Date(Date.now() + esperaLeituraS * 1000).toISOString()
    const ins = await admin.from('wa_ia_fila').insert({ ler_em: lerEm, conversation_id: convId, inbound_msg_id: String(msgId), inbound_wa_id: (ultimaIn as any).wa_message_id || null, wa_id: waId, connection_id: conv.connection_id || null, texto, passa_humano: passaParaHumano, enviar_video: querVideo && !passaParaHumano })
    if (!ins.error) return true
    console.error('[wa-ia] fila indisponivel, enviando na hora:', ins.error.message)

    // Plano B (so se a fila falhar): envia na hora, como antes
    const phoneId = await phoneIdDaConversa(admin, conv.connection_id || null)
    const r = await postMessage({ messaging_product: 'whatsapp', to: waId, type: 'text', text: { body: texto } }, phoneId || undefined)
    if (!r.ok) { console.error('[wa-ia] envio:', JSON.stringify(r.data?.error || r.data)); return true }
    const agora = new Date().toISOString()
    await admin.from('wa_messages').insert({ conversation_id: convId, wa_message_id: r.data?.messages?.[0]?.id || null, direction: 'out', type: 'text', body: texto, status: 'sent', sent_by: null, created_at: agora })
    const upd: any = { last_message_at: agora, last_text: '🤖 ' + texto.slice(0, 120) }
    if (passaParaHumano) {
      upd.ia_ativa = false; upd.ia_humano = true
      try {
        const atual = await admin.from('wa_conversations').select('assigned_to').eq('id', convId).maybeSingle()
        if (atual.data && !(atual.data as any).assigned_to) {
          const dono = await admin.from('profiles').select('id').eq('is_admin', true).order('created_at', { ascending: true }).limit(1).maybeSingle()
          if (dono.data?.id) upd.assigned_to = (dono.data as any).id
        }
      } catch (e) {}
    }
    await admin.from('wa_conversations').update(upd).eq('id', convId)
    return true
  } catch (e) {
    console.error('[wa-ia] erro:', e)
    await avisarFalha(admin, convId, 'erro: ' + String((e as any)?.message || e).slice(0, 150))
    return true
  }
}

// Quando o admin LIGA o assistente numa conversa: responde a ultima mensagem da pessoa, se ela ainda esta sem resposta
// (a ultima mensagem da conversa e dela) e a janela de 24h do WhatsApp ainda esta aberta. Devolve true se pediu a resposta.
export async function responderUltimaPendente(admin: any, convId: string): Promise<boolean> {
  try {
    const [cv, ult] = await Promise.all([
      admin.from('wa_conversations').select('id, wa_id, name').eq('id', convId).maybeSingle(),
      admin.from('wa_messages').select('id, direction, type, created_at').eq('conversation_id', convId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    const c: any = cv.data
    const m: any = ult.data
    if (!c || !c.wa_id || !m || m.direction !== 'in') return false
    // Fora da janela de 24h o WhatsApp nao deixa mandar texto livre
    if (Date.now() - new Date(m.created_at).getTime() > 23.5 * 3600 * 1000) return false
    await tratarIA(admin, convId, String(c.wa_id), String(m.id), String(m.type || 'text'), c.name || null)
    return true
  } catch (e) {
    console.error('[wa-ia] responderUltimaPendente:', e)
    return false
  }
}


// Quando o admin LIGA o assistente para TODAS as conversas: responde, em cada conversa que nao foi desligada (ia_humano) e
// cuja ultima mensagem e da pessoa (ainda sem resposta, dentro de 24h), a mensagem pendente. Devolve quantas conversas foram atendidas.
export async function responderPendentesGeral(admin: any): Promise<number> {
  try {
    const desde = new Date(Date.now() - 23.5 * 3600 * 1000).toISOString()
    const r = await admin.from('wa_conversations').select('id').gte('last_message_at', desde).or('ia_humano.is.null,ia_humano.eq.false').order('last_message_at', { ascending: false }).limit(60)
    const ids: string[] = (r.data || []).map(function(x: any) { return String(x.id) })
    let atendidas = 0
    const inicio = Date.now()
    for (let i = 0; i < ids.length; i += 5) {
      if (Date.now() - inicio > 42000) break
      const res = await Promise.all(ids.slice(i, i + 5).map(function(id) { return responderUltimaPendente(admin, id) }))
      atendidas += res.filter(Boolean).length
    }
    return atendidas
  } catch (e) {
    console.error('[wa-ia] responderPendentesGeral:', e)
    return 0
  }
}
