// Monta as palavras da legenda com o TEXTO COMPLETO da narracao e os tempos que o Whisper conseguiu medir.
// O Whisper as vezes pula trechos ou para antes do fim; aqui as palavras que ele nao achou entram mesmo assim,
// com o tempo estimado entre as palavras vizinhas que ele acertou.

export type PalavraTempo = { word: string; start: number; end: number }

function norm(w: string): string {
  return String(w || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Divide o texto em palavras de legenda (descarta so o que nao tem letra nem numero, como "—")
function dividir(texto: string): string[] {
  return String(texto || '').replace(/\s+/g, ' ').trim().split(' ').filter(function(t) { return norm(t) !== '' })
}

// Distribui as palavras de [ini, fim] em proporcao ao tamanho de cada uma
function espalhar(palavras: string[], ini: number, fim: number): PalavraTempo[] {
  if (!palavras.length) return []
  const total = Math.max(0.05 * palavras.length, fim - ini)
  const pesos = palavras.map(function(p) { return norm(p).length + 2 })
  const soma = pesos.reduce(function(a, b) { return a + b }, 0)
  const out: PalavraTempo[] = []
  let t = ini
  palavras.forEach(function(p, i) {
    const d = total * (pesos[i] / soma)
    out.push({ word: p, start: t, end: t + d })
    t += d
  })
  return out
}

export function alinharPalavras(texto: string, whisper: PalavraTempo[], duracao: number, fimFala?: number): PalavraTempo[] {
  const S = dividir(texto)
  const W = whisper.filter(function(w) { return norm(w.word) !== '' })
  const fimTotal = Math.max(duracao || 0, W.length ? W[W.length - 1].end : 0, fimFala || 0)
  if (!S.length) return W
  if (!W.length) return espalhar(S, 0, fimTotal > 0 ? fimTotal : S.length * 0.4)

  // Alinhamento por maior subsequencia comum (LCS) entre as palavras do texto e as do Whisper
  const n = S.length, m = W.length
  const a = S.map(norm), b = W.map(function(w) { return norm(w.word) })
  const tab: Uint16Array[] = []
  for (let i = 0; i <= n; i++) tab.push(new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      tab[i][j] = a[i] === b[j] ? tab[i + 1][j + 1] + 1 : Math.max(tab[i + 1][j], tab[i][j + 1])
    }
  }
  const par: Record<number, number> = {} // indice do texto -> indice do Whisper
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { par[i] = j; i++; j++ }
    else if (tab[i + 1][j] >= tab[i][j + 1]) i++
    else j++
  }

  const out: PalavraTempo[] = new Array(n)
  const ancoras = Object.keys(par).map(Number).sort(function(x, y) { return x - y })
  if (!ancoras.length) return espalhar(S, W[0].start, Math.max(fimTotal, W[W.length - 1].end))

  ancoras.forEach(function(k) { const w = W[par[k]]; out[k] = { word: S[k], start: w.start, end: Math.max(w.end, w.start + 0.05) } })

  // Preenche os buracos entre as palavras reconhecidas
  const inicioFala = W[0].start
  let anterior = -1
  const fechar = function(de: number, ate: number, ini: number, fim: number) {
    // palavras de->ate (inclusive) ainda sem tempo, entre os instantes ini e fim
    const grupo = S.slice(de, ate + 1)
    const t = espalhar(grupo, ini, Math.max(fim, ini + 0.05 * grupo.length))
    t.forEach(function(x, q) { out[de + q] = x })
  }
  ancoras.forEach(function(k) {
    if (k - anterior > 1) {
      const ini = anterior < 0 ? Math.max(0, Math.min(inicioFala, out[k].start - 0.3 * (k - anterior - 1))) : out[anterior].end
      fechar(anterior + 1, k - 1, ini, out[k].start)
    }
    anterior = k
  })
  if (anterior < n - 1) {
    const ini = out[anterior].end
    const fim = Math.max(fimTotal, ini + 0.3 * (n - 1 - anterior))
    fechar(anterior + 1, n - 1, ini, fim)
  }

  // Garante ordem crescente e sem sobreposicao
  for (let q = 1; q < n; q++) {
    if (out[q].start < out[q - 1].start) out[q].start = out[q - 1].start
    if (out[q].end < out[q].start) out[q].end = out[q].start + 0.05
  }
  return out
}
