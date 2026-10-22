// Montagem do criativo no navegador do aluno (ffmpeg.wasm):
// junta os videos, a narracao, a musica de fundo e queima as legendas no MP4 final.
import { FFmpeg } from '@ffmpeg/ffmpeg'

export type Palavra = { word: string; start: number; end: number }
export type Formato = '9:16' | '1:1' | '16:9'
export type EstiloLegenda = 'amarelo' | 'branco'

export const DIMENSOES: Record<Formato, { w: number; h: number }> = {
  '9:16': { w: 720, h: 1280 },
  '1:1': { w: 720, h: 720 },
  '16:9': { w: 1280, h: 720 },
}

export type OpcoesRender = {
  clipes: Blob[]
  narracao: Blob
  duracaoNarracao: number // segundos
  musica?: Blob | null
  volumeMusica: number // 0 a 1
  palavras: Palavra[] | null // null = sem legenda
  formato: Formato
  estiloLegenda: EstiloLegenda
  onProgresso: (fracao: number, etapa: string) => void
}

let ffmpegPronto: FFmpeg | null = null

export async function carregarEditor(onEtapa?: (t: string) => void): Promise<FFmpeg> {
  if (ffmpegPronto) return ffmpegPronto
  onEtapa && onEtapa('Carregando o editor (so na primeira vez)...')
  const ff = new FFmpeg()
  await ff.load({ coreURL: '/ffmpeg/ffmpeg-core.js', wasmURL: '/ffmpeg/ffmpeg-core.wasm' })
  ffmpegPronto = ff
  return ff
}

function tempoAss(s: number) {
  const t = Math.max(0, s)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = t - h * 3600 - m * 60
  const cs = Math.min(99, Math.round((sec - Math.floor(sec)) * 100))
  return h + ':' + String(m).padStart(2, '0') + ':' + String(Math.floor(sec)).padStart(2, '0') + '.' + String(cs).padStart(2, '0')
}

function limpaPalavra(w: string) {
  return w.replace(/[{}\\]/g, '').replace(/\s+/g, ' ').trim()
}

// Agrupa as palavras em blocos curtos (ate 3 palavras, quebra em pontuacao ou pausa longa)
export function agruparPalavras(palavras: Palavra[]): Palavra[][] {
  const grupos: Palavra[][] = []
  let atual: Palavra[] = []
  palavras.forEach(function(p, i) {
    const w = limpaPalavra(p.word)
    if (!w) return
    atual.push({ word: w, start: p.start, end: p.end })
    const prox = palavras[i + 1]
    const fimFrase = /[.!?,;:]$/.test(w)
    const pausa = prox ? prox.start - p.end > 0.6 : true
    if (atual.length >= 3 || fimFrase || pausa) { grupos.push(atual); atual = [] }
  })
  if (atual.length) grupos.push(atual)
  return grupos
}

export function gerarAss(palavras: Palavra[], w: number, h: number, estilo: EstiloLegenda): string {
  const tam = Math.round(w * (w > h ? 0.05 : 0.075))
  const margemV = Math.round(h * (w > h ? 0.1 : 0.2))
  const destaque = estilo === 'amarelo' ? '&H0000FFFF&' : '&H00FFFFFF&' // BGR: amarelo = 00FFFF
  const normal = '&H00FFFFFF&'
  const linhas: string[] = []
  linhas.push('[Script Info]', 'ScriptType: v4.00+', 'PlayResX: ' + w, 'PlayResY: ' + h, 'WrapStyle: 2', '')
  linhas.push('[V4+ Styles]')
  linhas.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding')
  linhas.push('Style: Default,Montserrat ExtraBold,' + tam + ',&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,' + Math.max(4, Math.round(tam / 9)) + ',0,2,40,40,' + margemV + ',1')
  linhas.push('', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')
  const grupos = agruparPalavras(palavras)
  grupos.forEach(function(g, gi) {
    const inicioProx = gi < grupos.length - 1 ? grupos[gi + 1][0].start : Infinity
    g.forEach(function(p, i) {
      const ini = p.start
      const fim = i < g.length - 1 ? g[i + 1].start : Math.min(Math.max(p.end, p.start + 0.2) + 0.12, inicioProx)
      const texto = g.map(function(q, j) {
        const t = q.word.toUpperCase()
        return j === i ? '{\\c' + destaque + '}' + t + '{\\c' + normal + '}' : t
      }).join(' ')
      linhas.push('Dialogue: 0,' + tempoAss(ini) + ',' + tempoAss(fim) + ',Default,,0,0,0,,' + texto)
    })
  })
  return linhas.join('\n') + '\n'
}

export function duracaoDoAudio(blob: Blob): Promise<number> {
  return new Promise(function(resolve, reject) {
    const url = URL.createObjectURL(blob)
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = function() { const d = a.duration; URL.revokeObjectURL(url); isFinite(d) && d > 0 ? resolve(d) : reject(new Error('duracao invalida')) }
    a.onerror = function() { URL.revokeObjectURL(url); reject(new Error('audio invalido')) }
    a.src = url
  })
}

async function bytes(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await b.arrayBuffer())
}

export async function montarCriativo(ff: FFmpeg, o: OpcoesRender): Promise<Blob> {
  const { w, h } = DIMENSOES[o.formato]
  const n = o.clipes.length
  if (!n) throw new Error('Escolha pelo menos um video.')
  const total = Math.max(3, o.duracaoNarracao + 0.5)
  const seg = total / n
  const arquivos: string[] = []
  const grava = async function(nome: string, dados: Uint8Array | string) { await ff.writeFile(nome, dados as any); arquivos.push(nome) }

  const aoLog = function(e: { message: string }) {
    const m = /time=(\d+):(\d+):(\d+\.?\d*)/.exec(e.message)
    if (m) {
      const t = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseFloat(m[3])
      o.onProgresso(Math.min(0.99, t / total), 'Montando o video...')
    }
  }
  ff.on('log', aoLog)
  try {
    o.onProgresso(0, 'Preparando arquivos...')
    for (let i = 0; i < n; i++) await grava('c' + i + '.vid', await bytes(o.clipes[i]))
    await grava('narr.aud', await bytes(o.narracao))
    const temMusica = !!o.musica
    if (o.musica) await grava('musica.aud', await bytes(o.musica))

    const comLegenda = !!(o.palavras && o.palavras.length)
    if (comLegenda) {
      try { await ff.createDir('/fonts') } catch (e) {}
      const fonte = new Uint8Array(await (await fetch('/fonts/Montserrat-ExtraBold.ttf')).arrayBuffer())
      await ff.writeFile('/fonts/Montserrat-ExtraBold.ttf', fonte); arquivos.push('/fonts/Montserrat-ExtraBold.ttf')
      await grava('legenda.ass', gerarAss(o.palavras as Palavra[], w, h, o.estiloLegenda))
    }

    const args: string[] = []
    for (let i = 0; i < n; i++) args.push('-stream_loop', '-1', '-t', seg.toFixed(3), '-i', 'c' + i + '.vid')
    args.push('-i', 'narr.aud')
    if (temMusica) args.push('-stream_loop', '-1', '-i', 'musica.aud')

    const f: string[] = []
    for (let i = 0; i < n; i++) {
      f.push('[' + i + ':v]scale=' + w + ':' + h + ':force_original_aspect_ratio=increase,crop=' + w + ':' + h + ',setsar=1,fps=30,format=yuv420p[v' + i + ']')
    }
    let cadeia = ''
    for (let i = 0; i < n; i++) cadeia += '[v' + i + ']'
    f.push(cadeia + 'concat=n=' + n + ':v=1:a=0[vc]')
    f.push(comLegenda ? '[vc]subtitles=legenda.ass:fontsdir=/fonts[vout]' : '[vc]null[vout]')

    const iN = n
    const fade = 'afade=t=out:st=' + Math.max(0, total - 1.5).toFixed(2) + ':d=1.5'
    if (temMusica) {
      const vm = Math.min(1, Math.max(0, o.volumeMusica))
      f.push('[' + iN + ':a]aresample=44100,apad,volume=2[na]')
      f.push('[' + (iN + 1) + ':a]aresample=44100,volume=' + (2 * vm).toFixed(3) + '[ma]')
      f.push('[na][ma]amix=inputs=2:duration=first:dropout_transition=0,' + fade + '[aout]')
    } else {
      f.push('[' + iN + ':a]aresample=44100,apad,' + fade + '[aout]')
    }

    args.push('-filter_complex', f.join(';'), '-map', '[vout]', '-map', '[aout]',
      '-t', total.toFixed(3), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '27', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', 'saida.mp4')

    o.onProgresso(0.02, 'Montando o video...')
    const code = await ff.exec(args)
    if (code !== 0) throw new Error('O editor nao conseguiu montar o video (codigo ' + code + ').')
    const out = (await ff.readFile('saida.mp4')) as Uint8Array
    arquivos.push('saida.mp4')
    o.onProgresso(1, 'Pronto!')
    return new Blob([out as any], { type: 'video/mp4' })
  } finally {
    ff.off('log', aoLog)
    for (const a of arquivos) { try { await ff.deleteFile(a) } catch (e) {} }
  }
}

// Reduz o audio (mono, 48 kbps) para caber no envio das legendas (limite de 4 MB)
export async function compactarAudio(ff: FFmpeg, blob: Blob): Promise<Blob> {
  await ff.writeFile('in.aud', new Uint8Array(await blob.arrayBuffer()))
  try {
    const code = await ff.exec(['-i', 'in.aud', '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', '-y', 'out.mp3'])
    if (code !== 0) throw new Error('Nao foi possivel preparar o audio.')
    const out = (await ff.readFile('out.mp3')) as Uint8Array
    return new Blob([out as any], { type: 'audio/mpeg' })
  } finally {
    try { await ff.deleteFile('in.aud') } catch (e) {}
    try { await ff.deleteFile('out.mp3') } catch (e) {}
  }
}
