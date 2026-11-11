// Prints das telas da plataforma que o Junior manda no WhatsApp (ordem do Breno).
// As imagens ficam em public/prints-junior/<slug>.jpg (tiradas no celular, sem nome nem e-mail de aluno).
// O Junior escolhe pelo slug usando a marca [[PRINT: slug]] no fim da resposta; o sistema manda a imagem depois do texto
// (lib/waIAFila.ts). Para atualizar uma tela: troque o arquivo da imagem.

export type PrintTela = { slug: string; titulo: string; mostra: string }

export const PRINTS: PrintTela[] = [
  { slug: 'menu-lateral', titulo: 'Menu da plataforma', mostra: 'O menu lateral aberto com todos os menus: Painel do Aluno, Assistente IA, Plataformas, Produtos em Alta, Gerador de Ebook, Gerador de Site, Gerador de Criativos, Criativos Manuais, Vendendo no Automatico, Estrutura Express, Gerenciando seus anuncios, WhatsApp de Suporte, Aulas ao Vivo e Planos. No celular ele abre pelo botao roxo de tres tracinhos, no canto de cima, a esquerda. USE quando a pessoa nao acha um menu ou nao sabe por onde comecar.' },
  { slug: 'painel', titulo: 'Painel do Aluno', mostra: 'A tela inicial (Painel do Aluno): "Ola" com o nome, a "Sua jornada em 3 passos" com o mapa do tesouro, o progresso e o botao "Ir para Plataformas". No alto: "Como baixar o app", sino de avisos e perfil. USE quando ela nao sabe qual e a tela inicial ou como voltar ao comeco.' },
  { slug: 'junior', titulo: 'Assistente IA (Junior)', mostra: 'A tela do Assistente IA (o chat com o Junior dentro da plataforma): campo para escrever a duvida e botao do clipe para anexar um print. USE quando ela quer falar com o Junior pela plataforma ou mandar print la.' },
  { slug: 'plataformas', titulo: 'Menu Plataformas', mostra: 'A tela "Plataformas Parceiras" com o passo a passo "Como comecar" e a Cakto, com os botoes Entrar, Criar conta gratis, App Android e App iPhone (e a aula de cadastro mais abaixo). USE quando ela precisa criar conta na Cakto/Kiwify/Kaiross ou nao acha onde se cadastrar.' },
  { slug: 'produtos', titulo: 'Produtos em Alta', mostra: 'A tela "Produtos em Alta": os 3 passos (Escolha o produto, Acesse o material, Comece a vender) e os cartoes dos produtos com os botoes "Quero me afiliar", "Ver site" e "Material". USE quando ela quer escolher um produto para vender ou nao acha o material.' },
  { slug: 'ebook', titulo: 'Gerador de Ebook', mostra: 'A tela do Gerador de Ebook: creditos de ebook, o video "Apos gerar o seu e-book cadastre ele na plataforma" e o formulario (Titulo, Topico principal...). USE quando ela pergunta como criar o ebook.' },
  { slug: 'criativos', titulo: 'Gerador de Criativos', mostra: 'A tela do Gerador de Criativos com as 4 etapas (1 Roteiro, 2 Narracao, 3 Videos, 4 Edicao) e as perguntas do roteiro. Quando a conta ainda nao tem plano ativo aparece o aviso vermelho "Assine um plano para gerar criativos" com o botao "Ver planos". USE quando ela nao entende como gerar o criativo ou por que nao consegue.' },
  { slug: 'criativos-manuais', titulo: 'Criativos Manuais', mostra: 'A tela "Criativos Manuais" com as aulas para criar criativos do zero (Aula 1 Introducao, Ideias...), que se passam com as setas. USE quando ela pergunta onde estao as aulas de criativos manuais.' },
  { slug: 'vendendo-no-automatico', titulo: 'Vendendo no Automatico', mostra: 'A tela "Vendendo no Automatico" com os modulos de aulas (Configurando o aplicativo de vendas, Vendendo produto digital no automatico) em carrosseis que se arrastam para o lado. USE quando ela pergunta onde estao as aulas de anuncio/vendas.' },
  { slug: 'anuncios', titulo: 'Gerenciando seus anuncios', mostra: 'A tela "Gerenciando seus anuncios": a aula "conhecendo o Gerenciador de Anuncios" e o botao azul "Conectar com Facebook". USE quando ela pergunta onde conectar o Facebook ou como ver as campanhas.' },
  { slug: 'planos', titulo: 'Menu Planos', mostra: 'A tela "Planos" com os valores: Pro R$ 49,90/mes (mais popular), Starter R$ 39,90/mes e Premium R$ 79,90/mes, cada um com o botao "Assinar agora". USE quando ela quer ver ou assinar um plano e nao acha onde.' },
  { slug: 'suporte', titulo: 'WhatsApp de Suporte', mostra: 'A tela "WhatsApp de Suporte": mostra se a equipe esta no horario de atendimento (segunda a sexta, 9h as 18h), o atalho para o Assistente IA e o botao verde "Falar com suporte agora". USE quando ela quer falar com a equipe e pergunta onde fica.' },
  { slug: 'aulas-ao-vivo', titulo: 'Aulas ao Vivo', mostra: 'A tela "Aulas ao Vivo" com a gravacao da aula (Conhecendo a plataforma Cristao Prospero) e o botao verde "Avisar quando lancar". USE quando ela pergunta pelas aulas ao vivo ou gravadas.' },
  { slug: 'instalar-iphone', titulo: 'Instalar no iPhone', mostra: 'O aviso "Instalar a plataforma no seu aparelho" na aba iPhone/iPad (abrir no Safari, tocar em Compartilhar, escolher "Adicionar a Tela de Inicio"). Esse aviso abre pelo botao "Como baixar o app", no alto da tela. USE so quando ela tem iPhone e quer instalar o aplicativo.' },
]

export const MARCA_PRINT_RE = /\[\[PRINT:\s*([a-z0-9-]+)\s*\]\]/i

export function printPorSlug(slug: string): PrintTela | null {
  const s = String(slug || '').trim().toLowerCase()
  return PRINTS.find(function(p) { return p.slug === s }) || null
}

export function urlDoPrint(slug: string): string {
  const base = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mcpia.site').replace(/\/+$/, '')
  return base + '/prints-junior/' + slug + '.jpg'
}

// Legenda que vai junto da imagem (tambem serve para saber se aquele print ja foi mandado na conversa)
export function legendaDoPrint(p: PrintTela): string { return '📱 ' + p.titulo }

// Slugs que ja foram mandados nesta conversa (pela legenda da imagem enviada pelo assistente)
export function printsJaEnviados(linhas: any[]): string[] {
  const out: string[] = []
  for (const m of linhas) {
    if (m.direction !== 'out' || m.type !== 'image') continue
    const b = String(m.body || '')
    for (const p of PRINTS) if (b === legendaDoPrint(p) && out.indexOf(p.slug) < 0) out.push(p.slug)
  }
  return out
}

// Instrucoes para o modelo (so para quem e aluna)
export function regraDePrints(jaEnviados: string[]): string {
  const lista = PRINTS.map(function(p) { return '- ' + p.slug + ': ' + p.mostra + (jaEnviados.indexOf(p.slug) >= 0 ? ' [JA ENVIADO nesta conversa: NAO mande de novo]' : '') }).join('\n')
  return [
    'PRINTS DAS TELAS DA PLATAFORMA (PRIORIDADE ALTA): voce pode mandar a foto de uma tela da plataforma (print tirado no celular) para a aluna ver onde clicar. Para mandar, escreva sua explicacao normalmente e coloque no FINAL da resposta a marca [[PRINT: nome]] (so o nome da lista abaixo; o sistema envia a imagem depois do seu texto e tira a marca).',
    'QUANDO MANDAR: so quando a aluna estiver perdida e o print ajudar de verdade: nao acha um menu, nao sabe onde fica uma tela, pergunta "onde fica...?", "nao encontro...". NAO mande print toda hora, nem para duvida que se resolve so com texto, nem na primeira saudacao, nem quando ela ja mandou print da propria tela. No maximo UM print por resposta e nunca repita um print que ja foi enviado na conversa.',
    'COMO EXPLICAR: antes da marca, diga em uma ou duas frases curtas ONDE a aluna esta e o que tocar (use os nomes que aparecem no print: nome do menu, cor e lugar do botao), e que esta mandando um print para ela se guiar. Um passo por vez, como nas outras regras. Se a tela que ela precisa nao esta na lista, NAO invente: peca o print dela.',
    'Telas disponiveis (nome: o que mostra):',
    lista,
  ].join('\n')
}
