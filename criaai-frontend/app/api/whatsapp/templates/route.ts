import { NextRequest, NextResponse } from 'next/server'
import { adminClient, escopoDoUsuario, graphError, graphFetch, requireAdmin, requireStaff, wabaId, waConfig } from '@/lib/whatsapp'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const SEM_WABA = 'Nao consegui achar a conta do WhatsApp (WABA). Adicione a chave WHATSAPP_WABA_ID na Vercel com o ID da conta de mensagens e faca Redeploy.'

// Conta do WhatsApp (WABA) do modelo: a do suporte, ou a do numero escolhido (ex.: Recuperacao)
async function wabaDaPasta(connId: string): Promise<string> {
  if (!connId) return await wabaId()
  const c = await adminClient().from('wa_connections').select('waba_id').eq('id', connId).maybeSingle()
  return String(c.data?.waba_id || '')
}

function maxVar(text: string): number {
  let n = 0
  const re = /\{\{(\d+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) { n = Math.max(n, parseInt(m[1], 10)) }
  return n
}

// Guarda a lista por 2 minutos (a Meta e lenta e a lista quase nao muda). ?fresh=1 ignora; criar/apagar limpa.
const cacheTpl = new Map<string, { t: number; lista: any[] }>()
const VALE_TPL = 2 * 60 * 1000

// Lista os modelos (templates) da conta
export async function GET(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const cfg = waConfig()
  if (!cfg.token) return NextResponse.json({ error: 'O WhatsApp ainda nao foi conectado.' }, { status: 400 })
  // Atendente de so um chat nao ve os modelos do outro
  const escopo = await escopoDoUsuario(staffId)
  const pedeOutro = !!req.nextUrl.searchParams.get('connection')
  if ((pedeOutro && escopo === 'suporte') || (!pedeOutro && escopo === 'recuperacao')) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  // Com ?connection=<id> lista os modelos da conta de OUTRO numero (ex.: Recuperacao)
  const waba = await wabaDaPasta(req.nextUrl.searchParams.get('connection') || '')
  if (!waba) return NextResponse.json({ error: SEM_WABA }, { status: 400 })

  const guardado = cacheTpl.get(waba)
  if (guardado && !req.nextUrl.searchParams.get('fresh') && Date.now() - guardado.t < VALE_TPL) return NextResponse.json({ templates: guardado.lista })

  const out: any[] = []
  let url: string | null = waba + '/message_templates?fields=name,language,status,category,components,rejected_reason&limit=100'
  for (let i = 0; i < 5 && url; i++) {
    const r: any = await graphFetch(url)
    if (!r.ok) return NextResponse.json({ error: graphError(r.data) }, { status: 400 })
    for (const t of (r.data?.data || [])) {
      const comps: any[] = t.components || []
      const h = comps.find(function(c) { return c.type === 'HEADER' })
      const b = comps.find(function(c) { return c.type === 'BODY' })
      const f = comps.find(function(c) { return c.type === 'FOOTER' })
      const bt = comps.find(function(c) { return c.type === 'BUTTONS' })
      const body = String(b?.text || '')
      out.push({
        name: t.name, language: t.language, status: t.status, category: t.category,
        rejected_reason: t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : '',
        header: h && h.format === 'TEXT' ? String(h.text || '') : (h ? '[' + String(h.format || 'midia').toLowerCase() + ']' : ''),
        body, footer: String(f?.text || ''),
        buttons: (bt?.buttons || []).map(function(x: any) { return String(x.text || '') }),
        vars: maxVar(body),
      })
    }
    url = r.data?.paging?.next || null
  }
  out.sort(function(a, b) { return String(a.name).localeCompare(String(b.name)) })
  cacheTpl.set(waba, { t: Date.now(), lista: out })
  return NextResponse.json({ templates: out })
}

// Cria um modelo e manda para analise da Meta (so admin)
export async function POST(req: NextRequest) {
  cacheTpl.clear()
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores podem criar modelos.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const waba = await wabaDaPasta(String(input?.connection || ''))
  if (!waba) return NextResponse.json({ error: SEM_WABA }, { status: 400 })
  const name = String(input?.name || '').trim()
  const category = String(input?.category || '')
  const language = String(input?.language || 'pt_BR').trim()
  const header = String(input?.header || '').trim()
  const body = String(input?.body || '').trim()
  const footer = String(input?.footer || '').trim()
  const examples: string[] = Array.isArray(input?.examples) ? input.examples.map(function(x: any) { return String(x || '').trim() }) : []

  if (!/^[a-z0-9_]{1,100}$/.test(name)) return NextResponse.json({ error: 'O nome so pode ter letras minusculas, numeros e _ (sem espacos).' }, { status: 400 })
  if (category !== 'MARKETING' && category !== 'UTILITY') return NextResponse.json({ error: 'Escolha a categoria: Utilidade ou Marketing.' }, { status: 400 })
  if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(language)) return NextResponse.json({ error: 'Idioma invalido.' }, { status: 400 })
  if (!body) return NextResponse.json({ error: 'Escreva o texto da mensagem.' }, { status: 400 })
  if (body.length > 1024) return NextResponse.json({ error: 'O texto passa de 1024 caracteres.' }, { status: 400 })
  if (header.length > 60) return NextResponse.json({ error: 'O titulo passa de 60 caracteres.' }, { status: 400 })
  if (/\{\{/.test(header)) return NextResponse.json({ error: 'O titulo nao pode ter variaveis.' }, { status: 400 })
  if (footer.length > 60) return NextResponse.json({ error: 'O rodape passa de 60 caracteres.' }, { status: 400 })
  if (/\{\{/.test(footer)) return NextResponse.json({ error: 'O rodape nao pode ter variaveis.' }, { status: 400 })

  const n = maxVar(body)
  for (let i = 1; i <= n; i++) {
    if (body.indexOf('{{' + i + '}}') < 0) return NextResponse.json({ error: 'As variaveis precisam estar em ordem: {{1}}, {{2}}, {{3}}...' }, { status: 400 })
  }
  if (n > 0) {
    if (/^\s*\{\{\d+\}\}/.test(body) || /\{\{\d+\}\}\s*$/.test(body)) return NextResponse.json({ error: 'O texto nao pode comecar nem terminar com uma variavel. Coloque uma palavra antes e depois.' }, { status: 400 })
    for (let i = 0; i < n; i++) if (!examples[i]) return NextResponse.json({ error: 'Preencha o exemplo da variavel {{' + (i + 1) + '}}.' }, { status: 400 })
  }

  const components: any[] = []
  if (header) components.push({ type: 'HEADER', format: 'TEXT', text: header })
  components.push(n > 0 ? { type: 'BODY', text: body, example: { body_text: [examples.slice(0, n)] } } : { type: 'BODY', text: body })
  if (footer) components.push({ type: 'FOOTER', text: footer })

  const r = await graphFetch(waba + '/message_templates', { method: 'POST', json: { name, language, category, components } })
  if (!r.ok) return NextResponse.json({ error: graphError(r.data) }, { status: 400 })
  return NextResponse.json({ ok: true, status: r.data?.status || 'PENDING' })
}

// Apaga um modelo pelo nome (todos os idiomas) (so admin)
export async function DELETE(req: NextRequest) {
  cacheTpl.clear()
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores podem apagar modelos.' }, { status: 403 })
  const name = new URL(req.url).searchParams.get('name') || ''
  if (!/^[a-z0-9_]{1,100}$/.test(name)) return NextResponse.json({ error: 'Nome invalido.' }, { status: 400 })
  const waba = await wabaDaPasta(new URL(req.url).searchParams.get('connection') || '')
  if (!waba) return NextResponse.json({ error: SEM_WABA }, { status: 400 })
  const r = await graphFetch(waba + '/message_templates?name=' + encodeURIComponent(name), { method: 'DELETE' })
  if (!r.ok) return NextResponse.json({ error: graphError(r.data) }, { status: 400 })
  return NextResponse.json({ ok: true })
}
