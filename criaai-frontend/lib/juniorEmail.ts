// Conferencia de e-mail digitado errado (ex.: "@gmai.com" em vez de "@gmail.com"). Antes de liberar cadastro ou acesso,
// o Junior confere o dominio: se parece um erro de digitacao de um provedor conhecido, pergunta antes de liberar.

const DOMINIOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br', 'icloud.com', 'live.com', 'msn.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'globo.com', 'ig.com.br', 'outlook.com.br', 'hotmail.com.br', 'protonmail.com']

function distancia(a: string, b: string): number {
  const m = a.length, n = b.length
  const d: number[][] = []
  for (let i = 0; i <= m; i++) { d[i] = [i]; for (let j = 1; j <= n; j++) d[i][j] = i === 0 ? j : 0 }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[m][n]
}

// Devolve o e-mail corrigido quando o dominio parece erro de digitacao; null quando esta tudo bem (ou nao da para saber).
export function sugerirCorrecaoEmail(email: string): string | null {
  const e = String(email || '').trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at < 1) return null
  const usuario = e.slice(0, at)
  const dominio = e.slice(at + 1)
  if (!dominio || DOMINIOS.indexOf(dominio) >= 0) return null
  let melhor = ''
  let menor = 99
  for (const d of DOMINIOS) {
    const dist = distancia(dominio, d)
    if (dist < menor) { menor = dist; melhor = d }
  }
  // 1 letra de diferenca (gmai.com, gmial.com, gmail.con, hotmial.com) ou 2 em dominio comprido; dominios curtos/diferentes demais ficam como estao
  if (menor === 1 || (menor === 2 && melhor.length >= 9 && dominio.length >= 8)) return usuario + '@' + melhor
  // terminacao digitada errada: gmail.co, gmail.cm, gmail.com.com
  if (/^(gmail|hotmail|outlook|yahoo|icloud)\.(co|cm|con|comm|om|coom)$/.test(dominio)) return usuario + '@' + dominio.split('.')[0] + '.com'
  if (/^(gmail|hotmail|outlook|yahoo|icloud)\.com\.com$/.test(dominio)) return usuario + '@' + dominio.split('.')[0] + '.com'
  return null
}

export function perguntaEmailSuspeito(escrito: string, sugerido: string): string {
  return 'Só pra confirmar: você escreveu ' + escrito + '. Não seria ' + sugerido + '? Me escreve o e-mail certo, que eu libero 🙏'
}
