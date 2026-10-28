// Geracao de imagem da OpenAI com troca automatica de modelo.
// O modelo antigo (gpt-image-1) foi desligado pela OpenAI em 23/10/2026, entao tentamos
// os modelos novos em ordem. Se um dia algum for desligado, o proximo da lista assume sozinho.
export const MODELOS_IMAGEM = ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'gpt-image-2']

let ultimoQueFuncionou: string | null = null

function erroDeModelo(status: number, msg: string): boolean {
  if (status === 404) return true
  return /model/i.test(msg) && /(does not exist|not found|no access|do not have access|deprecated|shut ?down|unsupported|invalid)/i.test(msg)
}

export async function gerarImagemOpenAI(opts: { prompt: string; size: string; quality: string }): Promise<{ b64: string | null; url: string | null; modelo: string }> {
  const ordem = ultimoQueFuncionou
    ? [ultimoQueFuncionou].concat(MODELOS_IMAGEM.filter(function(m) { return m !== ultimoQueFuncionou }))
    : MODELOS_IMAGEM.slice()
  let ultimoErro = 'Não foi possível gerar a imagem agora.'

  for (const modelo of ordem) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelo, prompt: opts.prompt, n: 1, size: opts.size, quality: opts.quality }),
    })
    const data: any = await res.json().catch(function() { return {} })
    if (res.ok) {
      ultimoQueFuncionou = modelo
      return { b64: data.data?.[0]?.b64_json || null, url: data.data?.[0]?.url || null, modelo }
    }
    const msg = String(data?.error?.message || ('Erro ' + res.status))
    console.error('[openaiImage] modelo ' + modelo + ' falhou: ' + res.status + ' ' + msg)
    ultimoErro = msg
    if (!erroDeModelo(res.status, msg)) break
  }
  throw new Error(ultimoErro)
}

// Mensagem para o aluno (sem texto tecnico em ingles)
export function mensagemAmigavelImagem(msg: string): string {
  if (/verif/i.test(msg)) return 'O serviço de imagens está em ajuste. Tente novamente mais tarde ou fale com o suporte.'
  if (/(quota|billing|credit)/i.test(msg)) return 'O serviço de imagens está temporariamente indisponível. Fale com o suporte.'
  if (/(safety|moderation|content policy)/i.test(msg)) return 'Não conseguimos gerar essa imagem com esse texto. Tente mudar o título ou o tema.'
  return 'Não foi possível gerar a capa agora. Tente novamente em alguns minutos.'
}
