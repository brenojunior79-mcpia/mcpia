// Avatares ilustrados do criativo UGC (2 homens e 2 mulheres).
// Sao desenhos originais em SVG; a boca abre e fecha acompanhando a voz da narracao e os olhos piscam.

export type AvatarId = 'rafael' | 'diego' | 'camila' | 'juliana'
export type Avatar = { id: AvatarId; nome: string; sexo: 'h' | 'm'; fundo: string; pele: string; cabelo: string; camisa: string; estilo: 'curto' | 'barba' | 'longo' | 'ondulado'; oculos?: boolean; batom?: string }

export const AVATARES: Avatar[] = [
  { id: 'rafael', nome: 'Rafael', sexo: 'h', fundo: '#dbeafe', pele: '#f1c9a5', cabelo: '#3b2a20', camisa: '#2563eb', estilo: 'barba' },
  { id: 'diego', nome: 'Diego', sexo: 'h', fundo: '#fde7c7', pele: '#b9794f', cabelo: '#17110d', camisa: '#0f766e', estilo: 'curto', oculos: true },
  { id: 'camila', nome: 'Camila', sexo: 'm', fundo: '#fce7f3', pele: '#e8b98f', cabelo: '#5a3320', camisa: '#be185d', estilo: 'longo', batom: '#c2415d' },
  { id: 'juliana', nome: 'Juliana', sexo: 'm', fundo: '#e0f2e9', pele: '#8d5a3b', cabelo: '#1f1410', camisa: '#7c3aed', estilo: 'ondulado', batom: '#a3274a' },
]

export type Boca = 0 | 1 | 2 // 0 fechada, 1 meio aberta, 2 aberta

function escurecer(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f)
  return '#' + [r, g, b].map(function(x) { return Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0') }).join('')
}

export function avatarSvg(a: Avatar, boca: Boca, piscar: boolean): string {
  const peleSombra = escurecer(a.pele, 0.88)
  const feminino = a.sexo === 'm'
  const longo = a.estilo === 'longo' || a.estilo === 'ondulado'
  const p: string[] = []
  p.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">')
  p.push('<defs><clipPath id="c"><circle cx="200" cy="200" r="196"/></clipPath></defs>')
  p.push('<g clip-path="url(#c)">')
  p.push('<rect width="400" height="400" fill="' + a.fundo + '"/>')
  // cabelo de tras (cabelo longo)
  if (a.estilo === 'longo') p.push('<path d="M92 200 C80 120 130 62 200 62 C270 62 320 120 308 200 C312 270 316 330 330 400 L70 400 C84 330 88 270 92 200 Z" fill="' + a.cabelo + '"/>')
  if (a.estilo === 'ondulado') {
    p.push('<path d="M86 190 C70 110 126 54 200 54 C274 54 330 110 314 190 C334 250 318 310 336 400 L64 400 C82 310 66 250 86 190 Z" fill="' + a.cabelo + '"/>')
    p.push('<circle cx="86" cy="262" r="26" fill="' + a.cabelo + '"/><circle cx="314" cy="262" r="26" fill="' + a.cabelo + '"/><circle cx="92" cy="318" r="28" fill="' + a.cabelo + '"/><circle cx="308" cy="318" r="28" fill="' + a.cabelo + '"/>')
  }
  // ombros / camisa
  p.push('<ellipse cx="200" cy="410" rx="165" ry="108" fill="' + a.camisa + '"/>')
  p.push('<path d="M160 318 Q200 352 240 318 L240 340 Q200 380 160 340 Z" fill="' + escurecer(a.camisa, 0.8) + '"/>')
  // pescoco
  p.push('<rect x="170" y="262" width="60" height="76" rx="24" fill="' + peleSombra + '"/>')
  // orelhas
  p.push('<circle cx="112" cy="205" r="17" fill="' + a.pele + '"/><circle cx="288" cy="205" r="17" fill="' + a.pele + '"/>')
  // rosto
  p.push('<ellipse cx="200" cy="194" rx="90" ry="104" fill="' + a.pele + '"/>')
  // barba
  if (a.estilo === 'barba') p.push('<path d="M112 206 C114 300 286 300 288 206 C262 228 238 234 200 234 C162 234 138 228 112 206 Z" fill="' + a.cabelo + '"/>')
  // cabelo da frente
  if (a.estilo === 'curto' || a.estilo === 'barba') p.push('<path d="M108 176 C102 96 148 66 200 66 C252 66 298 96 292 176 C278 138 246 120 200 120 C154 120 122 138 108 176 Z" fill="' + a.cabelo + '"/>')
  if (a.estilo === 'longo') p.push('<path d="M106 190 C100 100 148 64 204 64 C262 64 300 104 294 190 C284 150 262 112 214 108 C176 126 130 140 106 190 Z" fill="' + a.cabelo + '"/>')
  if (a.estilo === 'ondulado') p.push('<path d="M104 188 C96 96 146 58 204 58 C264 58 304 100 296 188 C288 148 262 106 218 102 C178 124 128 136 104 188 Z" fill="' + a.cabelo + '"/>')
  // sobrancelhas
  const sob = escurecer(a.cabelo, 1)
  p.push('<path d="M138 168 Q162 156 186 166" stroke="' + sob + '" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M214 166 Q238 156 262 168" stroke="' + sob + '" stroke-width="8" fill="none" stroke-linecap="round"/>')
  // olhos
  if (piscar) {
    p.push('<path d="M146 196 Q164 204 182 196" stroke="#2a1a14" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M218 196 Q236 204 254 196" stroke="#2a1a14" stroke-width="5" fill="none" stroke-linecap="round"/>')
  } else {
    p.push('<ellipse cx="164" cy="194" rx="17" ry="12" fill="#fff"/><ellipse cx="236" cy="194" rx="17" ry="12" fill="#fff"/>')
    p.push('<circle cx="166" cy="195" r="8.5" fill="#3a2418"/><circle cx="238" cy="195" r="8.5" fill="#3a2418"/><circle cx="169" cy="192" r="2.6" fill="#fff"/><circle cx="241" cy="192" r="2.6" fill="#fff"/>')
    if (feminino) p.push('<path d="M146 190 Q164 178 182 188" stroke="#2a1a14" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M218 188 Q236 178 254 190" stroke="#2a1a14" stroke-width="3.5" fill="none" stroke-linecap="round"/>')
  }
  // oculos
  if (a.oculos) p.push('<g fill="none" stroke="#1f2937" stroke-width="5"><rect x="136" y="174" width="56" height="42" rx="14"/><rect x="208" y="174" width="56" height="42" rx="14"/><path d="M192 192 L208 192"/><path d="M136 190 L114 184"/><path d="M264 190 L286 184"/></g>')
  // nariz
  p.push('<path d="M200 200 C194 222 190 234 200 240 C210 234 206 222 200 200" fill="' + peleSombra + '" opacity="0.55"/>')
  // bochechas
  if (feminino) p.push('<circle cx="140" cy="236" r="16" fill="#f472b6" opacity="0.18"/><circle cx="260" cy="236" r="16" fill="#f472b6" opacity="0.18"/>')
  // boca
  const labio = a.batom || (a.estilo === 'barba' ? '#e3a395' : '#b4524a')
  if (boca === 0) {
    p.push('<path d="M172 254 Q200 268 228 254" stroke="' + labio + '" stroke-width="7" fill="none" stroke-linecap="round"/>')
  } else if (boca === 1) {
    p.push('<ellipse cx="200" cy="258" rx="19" ry="9" fill="#6b1f24"/><path d="M181 258 Q200 252 219 258" stroke="' + labio + '" stroke-width="5" fill="none" stroke-linecap="round"/>')
  } else {
    p.push('<ellipse cx="200" cy="260" rx="24" ry="17" fill="#6b1f24"/><path d="M178 254 Q200 246 222 254 L222 258 Q200 252 178 258 Z" fill="#fff"/><ellipse cx="200" cy="270" rx="12" ry="6" fill="#d9706f"/>')
    p.push('<path d="M176 256 Q200 244 224 256" stroke="' + labio + '" stroke-width="5" fill="none" stroke-linecap="round"/>')
  }
  p.push('</g>')
  p.push('<circle cx="200" cy="200" r="196" fill="none" stroke="#ffffff" stroke-width="8"/>')
  p.push('</svg>')
  return p.join('')
}

export function avatarDataUrl(a: Avatar, boca: Boca = 0): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(a, boca, false))
}

function svgParaPng(svg: string, tam: number): Promise<Uint8Array> {
  return new Promise(function(resolve, reject) {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const img = new Image()
    img.onload = function() {
      const c = document.createElement('canvas')
      c.width = tam; c.height = tam
      const g = c.getContext('2d')
      if (!g) { URL.revokeObjectURL(url); reject(new Error('canvas')); return }
      g.drawImage(img, 0, 0, tam, tam)
      URL.revokeObjectURL(url)
      c.toBlob(function(b) {
        if (!b) { reject(new Error('png')); return }
        b.arrayBuffer().then(function(ab) { resolve(new Uint8Array(ab)) })
      }, 'image/png')
    }
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('svg')) }
    img.src = url
  })
}

// Le a narracao e descobre, 12 vezes por segundo, o quanto a pessoa esta falando
const FPS_BOCA = 12
export async function envelopeDaVoz(blob: Blob): Promise<number[]> {
  const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
  const ctx = new AC()
  try {
    const buf: AudioBuffer = await ctx.decodeAudioData(await blob.arrayBuffer())
    const dados = buf.getChannelData(0)
    const passo = Math.floor(buf.sampleRate / FPS_BOCA)
    const n = Math.ceil(dados.length / passo)
    const rms: number[] = []
    for (let i = 0; i < n; i++) {
      let s = 0, c = 0
      const fim = Math.min(dados.length, (i + 1) * passo)
      for (let k = i * passo; k < fim; k += 4) { s += dados[k] * dados[k]; c++ }
      rms.push(c ? Math.sqrt(s / c) : 0)
    }
    return rms
  } finally { try { ctx.close() } catch (e) {} }
}

export type Quadro = { arquivo: string; duracao: number }

// Monta as 6 imagens (3 bocas x olho aberto/fechado) e a lista de quadros para o ffmpeg
export async function prepararAvatar(a: Avatar, voz: Blob, duracaoTotal: number): Promise<{ imagens: { nome: string; dados: Uint8Array }[]; lista: string }> {
  const rms = await envelopeDaVoz(voz)
  const maximo = rms.reduce(function(m, v) { return Math.max(m, v) }, 0.0001)
  const total = Math.ceil(duracaoTotal * FPS_BOCA) + 1
  const estados: string[] = []
  let ant = 0
  for (let i = 0; i < total; i++) {
    const nv = (rms[i] || 0) / maximo
    let b: Boca = nv < 0.14 ? 0 : nv < 0.42 ? 1 : 2
    // suaviza: nao pula direto de fechada para bem aberta
    if (b === 2 && ant === 0) b = 1
    ant = b
    const t = i / FPS_BOCA
    const piscar = (t % 3.6) > 3.4 && t > 1.2
    estados.push(b + (piscar ? 'p' : 'a'))
  }
  const usados: Record<string, boolean> = {}
  estados.forEach(function(s) { usados[s] = true })
  const imagens: { nome: string; dados: Uint8Array }[] = []
  for (const s of Object.keys(usados)) {
    const boca = parseInt(s[0], 10) as Boca
    imagens.push({ nome: 'av_' + s + '.png', dados: await svgParaPng(avatarSvg(a, boca, s[1] === 'p'), 360) })
  }
  // junta quadros iguais seguidos
  const quadros: Quadro[] = []
  estados.forEach(function(s) {
    const arq = 'av_' + s + '.png'
    const ult = quadros[quadros.length - 1]
    if (ult && ult.arquivo === arq) ult.duracao += 1 / FPS_BOCA
    else quadros.push({ arquivo: arq, duracao: 1 / FPS_BOCA })
  })
  const linhas = ['ffconcat version 1.0']
  quadros.forEach(function(q) { linhas.push("file '" + q.arquivo + "'", 'duration ' + q.duracao.toFixed(4)) })
  linhas.push("file '" + quadros[quadros.length - 1].arquivo + "'")
  return { imagens, lista: linhas.join('\n') + '\n' }
}
