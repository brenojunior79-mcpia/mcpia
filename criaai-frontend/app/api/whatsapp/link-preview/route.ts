import { NextRequest, NextResponse } from 'next/server'
import http from 'http'
import https from 'https'
import dns from 'dns'
import net from 'net'
import { requireStaff } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Previa de link (titulo, descricao e site). So para a equipe.
// Seguranca: so http/https nas portas padrao, e o endereco REAL da conexao e conferido (nada de rede interna).

type Prev = { url: string; domain: string; title: string; description: string }
const cache = new Map<string, { v: Prev | null; exp: number }>()
const MAX_BYTES = 300 * 1024

function ipPrivado(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number)
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true
    if (p[0] === 169 && p[1] === 254) return true
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
    if (p[0] === 192 && p[1] === 168) return true
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true
    if (p[0] >= 224) return true
    return false
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase()
    if (s === '::1' || s === '::') return true
    if (s.indexOf('::ffff:') === 0) return ipPrivado(s.slice(7))
    if (s.indexOf('fc') === 0 || s.indexOf('fd') === 0 || s.indexOf('fe8') === 0 || s.indexOf('fe9') === 0 || s.indexOf('fea') === 0 || s.indexOf('feb') === 0) return true
    return false
  }
  return true
}

// Resolve o nome do site e RECUSA enderecos internos no momento da conexao
function lookupSeguro(hostname: string, options: any, cb: any) {
  dns.lookup(hostname, { all: true }, function(err, addrs) {
    if (err || !addrs || addrs.length === 0) return cb(err || new Error('sem endereco'))
    const ok = (addrs as any[]).filter(function(a) { return !ipPrivado(a.address) })
    if (ok.length === 0) return cb(new Error('endereco nao permitido'))
    if (options && options.all) return cb(null, ok)
    cb(null, ok[0].address, ok[0].family)
  })
}

function buscar(urlStr: string, saltos: number): Promise<{ html: string; finalUrl: string } | null> {
  return new Promise(function(resolve) {
    let u: URL
    try { u = new URL(urlStr) } catch (e) { return resolve(null) }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return resolve(null)
    if (u.username || u.password) return resolve(null)
    if (u.port && u.port !== '80' && u.port !== '443') return resolve(null)
    if (net.isIP(u.hostname) && ipPrivado(u.hostname)) return resolve(null)
    const lib = u.protocol === 'https:' ? https : http
    let terminou = false
    const fim = function(v: { html: string; finalUrl: string } | null) { if (!terminou) { terminou = true; resolve(v) } }
    const req = lib.request(u, {
      method: 'GET',
      lookup: lookupSeguro as any,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.5' },
      timeout: 4000,
    }, function(res) {
      const code = res.statusCode || 0
      if (code >= 300 && code < 400 && res.headers.location) {
        res.resume()
        if (saltos <= 0) return fim(null)
        let prox = ''
        try { prox = new URL(res.headers.location, u).toString() } catch (e) { return fim(null) }
        buscar(prox, saltos - 1).then(fim)
        return
      }
      const ct = String(res.headers['content-type'] || '').toLowerCase()
      if (code < 200 || code >= 300 || ct.indexOf('text/html') < 0) { res.resume(); return fim(null) }
      const partes: Buffer[] = []
      let total = 0
      res.on('data', function(ch: Buffer) {
        total += ch.length
        if (total > MAX_BYTES) { res.destroy(); return fim({ html: Buffer.concat(partes).toString('utf8'), finalUrl: u.toString() }) }
        partes.push(ch)
      })
      res.on('end', function() { fim({ html: Buffer.concat(partes).toString('utf8'), finalUrl: u.toString() }) })
      res.on('error', function() { fim(partes.length ? { html: Buffer.concat(partes).toString('utf8'), finalUrl: u.toString() } : null) })
    })
    req.on('timeout', function() { req.destroy(); fim(null) })
    req.on('error', function() { fim(null) })
    req.end()
  })
}

function decodifica(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, function(_m, n) { try { return String.fromCodePoint(Number(n)) } catch (e) { return '' } })
}

function meta(html: string, nomes: string[]): string {
  for (const n of nomes) {
    const a = new RegExp('<meta[^>]+(?:property|name)=["\']' + n + '["\'][^>]*content=["\']([^"\']*)["\']', 'i').exec(html)
    if (a && a[1]) return decodifica(a[1]).trim()
    const b = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + n + '["\']', 'i').exec(html)
    if (b && b[1]) return decodifica(b[1]).trim()
  }
  return ''
}

export async function GET(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
  const raw = (req.nextUrl.searchParams.get('u') || '').trim().slice(0, 2000)
  if (!raw) return NextResponse.json({ error: 'Pedido invalido' }, { status: 400 })
  let alvo = raw
  if (/^www\./i.test(alvo)) alvo = 'https://' + alvo
  let dominio = ''
  try { dominio = new URL(alvo).hostname.replace(/^www\./, '') } catch (e) { return NextResponse.json({ error: 'Link invalido' }, { status: 400 }) }

  const hit = cache.get(alvo)
  if (hit && hit.exp > Date.now()) return NextResponse.json({ preview: hit.v })

  const r = await buscar(alvo, 3)
  let v: Prev | null = null
  if (r) {
    const head = r.html.slice(0, MAX_BYTES)
    const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)
    const title = meta(head, ['og:title', 'twitter:title']) || (t ? decodifica(t[1].replace(/\s+/g, ' ')).trim() : '')
    const description = meta(head, ['og:description', 'twitter:description', 'description'])
    if (title || description) v = { url: r.finalUrl, domain: dominio, title: title.slice(0, 140), description: description.slice(0, 220) }
  }
  cache.set(alvo, { v, exp: Date.now() + (v ? 30 * 60000 : 5 * 60000) })
  if (cache.size > 500) { const k = cache.keys().next().value; if (k) cache.delete(k) }
  return NextResponse.json({ preview: v })
}
