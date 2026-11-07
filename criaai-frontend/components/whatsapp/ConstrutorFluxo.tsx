'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { EVENTOS, VARIAVEIS } from '@/lib/waAutoTipos'
import { novoId, textoAtraso, ROTULO_TIPO, type PassoSeq, type Sequencia, type Unidade } from '@/lib/waSeqTipos'

export type StatsSeq = { runs: { step_index: number; status: string; vencido: boolean; n: number }[]; sends: { step_id: string; status: string; n: number }[] }
export type ConexaoSeq = { id: string; name: string; display_phone: string | null; active: boolean }
type Modelo = { name: string; language: string; status: string; body: string; vars: number }

const W = 240          // largura de cada bloco
const GAP = 96         // espaco entre blocos
const PORTA_Y = 34     // altura da bolinha de entrada (a partir do topo do bloco)
const OFFS = [70, 0, 96, 24] // alturas alternadas, como no desenho do exemplo

const MENU: { tipo: PassoSeq['tipo']; icone: string; cor: string; desc: string }[] = [
  { tipo: 'atraso', icone: '⏱', cor: '#ef4444', desc: 'Espera um tempo antes do próximo bloco' },
  { tipo: 'resposta', icone: '↩️', cor: '#8b5cf6', desc: 'Espera a pessoa responder antes de continuar' },
  { tipo: 'ia', icone: '🤖', cor: '#0ea5e9', desc: 'A IA continua a conversa, sem cumprimentar de novo' },
  { tipo: 'texto', icone: '💬', cor: '#16a34a', desc: 'Envia uma mensagem de texto' },
  { tipo: 'audio', icone: '🎤', cor: '#16a34a', desc: 'Envia um áudio' },
  { tipo: 'imagem', icone: '🖼️', cor: '#16a34a', desc: 'Envia uma imagem com legenda' },
  { tipo: 'video', icone: '🎬', cor: '#16a34a', desc: 'Envia um vídeo com legenda' },
  { tipo: 'modelo', icone: '📄', cor: '#16a34a', desc: 'Modelo aprovado da Meta (vale depois de 24 horas)' },
]

function novoPasso(tipo: PassoSeq['tipo']): PassoSeq {
  const id = novoId()
  if (tipo === 'atraso') return { id, tipo, valor: 5, unidade: 'segundos' }
  if (tipo === 'ia') return { id, tipo }
  if (tipo === 'resposta') return { id, tipo, valor: 0, unidade: 'horas', aoExpirar: 'encerrar' }
  if (tipo === 'texto') return { id, tipo, texto: '' }
  if (tipo === 'audio') return { id, tipo, path: '', mime: '', nome: '' }
  if (tipo === 'imagem') return { id, tipo, path: '', mime: '', nome: '', legenda: '' }
  if (tipo === 'video') return { id, tipo, path: '', mime: '', nome: '', legenda: '' }
  return { id, tipo: 'modelo', template: '', language: 'pt_BR', params: [] }
}

// ---------- numeros de cada bloco ----------
function numeros(st: StatsSeq | undefined, passos: PassoSeq[], i: number) {
  const s = st || { runs: [], sends: [] }
  const p = passos[i]
  if (p && (p.tipo === 'atraso' || p.tipo === 'resposta' || p.tipo === 'ia')) {
    let agendado = 0, pendente = 0, concluido = 0
    for (const r of s.runs) {
      if (r.status === 'ativo' && r.step_index === i + 1) { if (r.vencido) pendente += r.n; else agendado += r.n }
      else if (r.step_index > i + 1 || (r.status === 'concluido' && r.step_index === i + 1)) concluido += r.n
    }
    return { agendado, pendente, concluido }
  }
  let enviado = 0, entregue = 0, lido = 0, falha = 0
  for (const x of s.sends) {
    if (!p || x.step_id !== p.id) continue
    if (x.status === 'failed') falha += x.n
    else { enviado += x.n; if (x.status === 'delivered' || x.status === 'read') entregue += x.n; if (x.status === 'read') lido += x.n }
  }
  const pct = function(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) + '%' : '0%' }
  return { enviado, entregue: pct(entregue, enviado), lido: pct(lido, enviado), falha: pct(falha, enviado + falha) }
}

const tituloCartao: React.CSSProperties = { fontWeight: 800, fontSize: 14, color: 'var(--text)', lineHeight: 1.25 }
const etiqueta: React.CSSProperties = { fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, color: 'var(--muted2)', textTransform: 'uppercase' }
const caixa: React.CSSProperties = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', fontSize: 13, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }
const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4, display: 'block' }

function Numeros({ itens }: { itens: [string, string | number][] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px 6px', gap: 4 }}>
      {itens.map(function(x) {
        return (
          <div key={x[0]} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted2)', fontWeight: 600 }}>{x[0]}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{x[1]}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function ConstrutorFluxo({ inicial, conexoes, stats, onVoltar }: { inicial: Sequencia; conexoes: ConexaoSeq[]; stats?: StatsSeq; onVoltar: (recarregar: boolean) => void }) {
  const [seq, setSeq] = useState<Sequencia>(inicial)
  const [id, setId] = useState<string | undefined>(inicial.id)
  const [sel, setSel] = useState<string>('gatilho')
  const [menu, setMenu] = useState<{ i: number; x: number; y: number } | null>(null) // i: -1 = depois do gatilho; i = depois do bloco i (x,y = onde abrir, na tela)
  const [sujo, setSujo] = useState(!inicial.id)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const [view, setView] = useState({ x: 24, y: 8, k: 1 })
  const [alturas, setAlturas] = useState<Record<string, number>>({})
  const [palavrasTxt, setPalavrasTxt] = useState((inicial.trigger.tipo === 'palavra' ? inicial.trigger.palavras : []).join(', '))
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [carregandoModelos, setCarregandoModelos] = useState(false)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [teste, setTeste] = useState(false)
  const [tNum, setTNum] = useState('')
  const [tNome, setTNome] = useState('')
  const [tPular, setTPular] = useState(true)
  const [testando, setTestando] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const refs = useRef<Record<string, HTMLDivElement | null>>({})
  const arrasto = useRef<{ x: number; y: number; vx: number; vy: number; moveu: boolean; id: number } | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  // Escolhe sozinho o numero quando so existe um ativo
  useEffect(function() {
    if (!seq.connection_id) {
      const ativos = conexoes.filter(function(c) { return c.active })
      if (ativos.length === 1) setSeq(function(s) { return { ...s, connection_id: ativos[0].id } })
    }
  }, [])

  function mudar(fn: (s: Sequencia) => Sequencia) { setSeq(fn); setSujo(true); setOk('') }

  // Modelos aprovados do numero escolhido
  useEffect(function() {
    if (!seq.connection_id) { setModelos([]); return }
    setCarregandoModelos(true)
    fetch('/api/whatsapp/templates?connection=' + seq.connection_id, { cache: 'no-store' })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) })
      .then(function(x) { setModelos(x.ok ? (x.j.templates || []).filter(function(t: Modelo) { return t.status === 'APPROVED' }) : []) })
      .catch(function() { setModelos([]) }).finally(function() { setCarregandoModelos(false) })
  }, [seq.connection_id])

  // Altura real de cada bloco (para desenhar as linhas)
  useLayoutEffect(function() {
    const novo: Record<string, number> = {}
    let mudou = false
    for (const k of Object.keys(refs.current)) {
      const el = refs.current[k]
      if (el) { novo[k] = el.offsetHeight; if (alturas[k] !== el.offsetHeight) mudou = true }
    }
    if (mudou) setAlturas(novo)
  })

  // Link para tocar/ver o arquivo do bloco selecionado
  const passoSel = seq.steps.find(function(s) { return s.id === sel })
  const caminhoSel = passoSel && (passoSel.tipo === 'audio' || passoSel.tipo === 'imagem' || passoSel.tipo === 'video') ? passoSel.path : ''
  useEffect(function() {
    if (!caminhoSel || urls[caminhoSel]) return
    fetch('/api/whatsapp/seq/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ver: caminhoSel }) })
      .then(function(r) { return r.json() }).then(function(j) { if (j.url) setUrls(function(u) { return { ...u, [caminhoSel]: j.url } }) }).catch(function() {})
  }, [caminhoSel])

  function setPasso(pid: string, fn: (p: PassoSeq) => PassoSeq) { mudar(function(s) { return { ...s, steps: s.steps.map(function(p) { return p.id === pid ? fn(p) : p }) } }) }
  function adicionar(depoisDe: number, tipo: PassoSeq['tipo']) {
    const p = novoPasso(tipo)
    mudar(function(s) { const l = s.steps.slice(); l.splice(depoisDe + 1, 0, p); return { ...s, steps: l } })
    setMenu(null); setSel(p.id)
    const k = depoisDe + 2
    setTimeout(function() { mostrarNo(k) }, 30)
  }
  function duplicar(i: number) {
    const o = seq.steps[i]
    const c: PassoSeq = { ...(o as any), id: novoId() }
    mudar(function(s) { const l = s.steps.slice(); l.splice(i + 1, 0, c); return { ...s, steps: l } })
    setSel(c.id)
  }
  function remover(i: number) {
    const o = seq.steps[i]
    mudar(function(s) { return { ...s, steps: s.steps.filter(function(p) { return p.id !== o.id }) } })
    if (sel === o.id) setSel('gatilho')
  }

  async function salvar(comEnabled?: boolean): Promise<boolean> {
    setSalvando(true); setMsg(''); setOk('')
    const corpo: any = { action: 'salvar', ...seq, id, ...(comEnabled === undefined ? {} : { enabled: comEnabled }) }
    try {
      const r = await fetch('/api/whatsapp/seq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) { setMsg(j.error || 'Não foi possível salvar.'); setSalvando(false); return false }
      if (j.id) setId(j.id)
      if (comEnabled !== undefined) setSeq(function(s) { return { ...s, enabled: comEnabled } })
      setSujo(false); setOk('Salvo!')
      setSalvando(false)
      return true
    } catch (e) { setMsg('Sem conexão. Tente de novo.'); setSalvando(false); return false }
  }

  async function alternarLigado() {
    await salvar(!seq.enabled)
  }

  async function apagar() {
    if (!id) { onVoltar(false); return }
    if (!window.confirm('Apagar o fluxo "' + (seq.name || 'sem nome') + '"? Quem está no meio dele deixa de receber as próximas mensagens.')) return
    try { await fetch('/api/whatsapp/seq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'apagar', id }) }) } catch (e) {}
    onVoltar(true)
  }

  async function testar() {
    setMsg(''); setOk('')
    if (sujo) { const salvou = await salvar(); if (!salvou) return }
    if (!id && !sujo) { setMsg('Salve o fluxo antes de testar.'); return }
    setTestando(true)
    try {
      const r = await fetch('/api/whatsapp/seq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'teste', id, numero: tNum, nome: tNome, pularAtrasos: tPular }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setMsg(j.error || 'Não foi possível testar.'); else setOk('Teste agendado! Chega no seu WhatsApp em até 15 segundos.')
    } catch (e) { setMsg('Sem conexão.') }
    setTestando(false)
  }

  async function enviarArquivo(p: PassoSeq, f: File) {
    if (p.tipo !== 'audio' && p.tipo !== 'imagem' && p.tipo !== 'video') return
    setEnviando(true); setMsg('')
    try {
      const r = await fetch('/api/whatsapp/seq/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mime: f.type, size: f.size, filename: f.name }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) { setMsg(j.error || 'Não consegui enviar o arquivo.'); setEnviando(false); return }
      const esperado = p.tipo === 'imagem' ? 'image' : p.tipo
      if (j.kind !== esperado) { setMsg('Esse arquivo não é ' + (p.tipo === 'audio' ? 'um áudio' : p.tipo === 'imagem' ? 'uma imagem' : 'um vídeo') + '.'); setEnviando(false); return }
      const up = await createClient().storage.from('wa-media').uploadToSignedUrl(j.path, j.token, f, { contentType: j.mime })
      if (up.error) { setMsg('Não consegui enviar o arquivo. Tente de novo.'); setEnviando(false); return }
      setPasso(p.id, function(x) { return { ...(x as any), path: j.path, mime: j.mime, nome: f.name } })
      setUrls(function(u) { const c = { ...u }; delete c[j.path]; return c })
    } catch (e) { setMsg('Não consegui enviar o arquivo. Tente de novo.') }
    setEnviando(false)
  }

  function voltar() {
    if (sujo && !window.confirm('Tem alterações que não foram salvas. Sair mesmo assim?')) return
    onVoltar(true)
  }

  // ---------- posicoes ----------
  const nos: { key: string; passo: PassoSeq | null; i: number }[] = [{ key: 'gatilho', passo: null, i: -1 }]
  seq.steps.forEach(function(p, i) { nos.push({ key: p.id, passo: p, i }) })
  const pos = nos.map(function(n, k) { return { x: 40 + k * (W + GAP), y: OFFS[k % OFFS.length] + 30 } })
  const h = function(key: string) { return alturas[key] || 140 }
  const largura = 40 + nos.length * (W + GAP) + 380
  const altura = Math.max(...nos.map(function(n, k) { return pos[k].y + h(n.key) })) + 140

  // ---------- mover e dar zoom no quadro ----------
  function limita(k: number) { return Math.min(2, Math.max(0.3, k)) }
  function zoomEm(cx: number, cy: number, fator: number) {
    setView(function(v) {
      const k = limita(v.k * fator)
      const r = k / v.k
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }
    })
  }
  function zoomCentro(fator: number) {
    const el = area.current
    if (!el) return
    zoomEm(el.clientWidth / 2, el.clientHeight / 2, fator)
  }
  function ajustar() {
    const el = area.current
    if (!el) return
    const cw = el.clientWidth, ch = el.clientHeight
    const cw2 = pos[pos.length - 1].x + W + 60
    const ch2 = altura - 90
    const k = limita(Math.min(1, (cw - 32) / cw2, (ch - 32) / ch2))
    setView({ k, x: 16, y: Math.max(8, (ch - ch2 * k) / 2) })
  }
  function cem() { setView({ x: 24, y: 8, k: 1 }) }
  // Traz um bloco para a parte visivel do quadro (depois de adicionar)
  function mostrarNo(k: number) {
    const el = area.current
    if (!el) return
    const v = viewRef.current
    const xd = 40 + k * (W + GAP)
    const direita = v.x + (xd + W + 24) * v.k
    const esquerda = v.x + (xd - 24) * v.k
    let nx = v.x
    if (direita > el.clientWidth) nx = el.clientWidth - (xd + W + 24) * v.k
    if (esquerda + (nx - v.x) < 0) nx = -(xd - 24) * v.k
    if (nx !== v.x) setView({ ...v, x: nx })
  }
  function aoPressionar(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-ctl]')) return
    if (e.button !== undefined && e.button > 0 && e.button !== 1) return
    arrasto.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moveu: false, id: e.pointerId }
    setMenu(null)
  }
  function aoMover(e: React.PointerEvent) {
    const a = arrasto.current
    if (!a) return
    const dx = e.clientX - a.x, dy = e.clientY - a.y
    if (!a.moveu) {
      if (Math.hypot(dx, dy) < 5) return
      a.moveu = true
      try { (e.currentTarget as HTMLElement).setPointerCapture(a.id) } catch (err) {}
    }
    setView(function(v) { return { ...v, x: a.vx + dx, y: a.vy + dy } })
  }
  function soltar() { arrasto.current = null }

  // Roda do mouse: rola o quadro. Ctrl (ou Cmd) + roda, ou o gesto de pinca do touchpad: zoom na posicao do mouse.
  useEffect(function() {
    const el = area.current
    if (!el) return
    function roda(e: WheelEvent) {
      e.preventDefault()
      const r = el!.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) zoomEm(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01))
      else setView(function(v) { return { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY } })
    }
    el.addEventListener('wheel', roda, { passive: false })
    return function() { el.removeEventListener('wheel', roda) }
  }, [])

  // Esc fecha o menu de blocos
  useEffect(function() {
    function tecla(e: KeyboardEvent) { if (e.key === 'Escape') setMenu(null) }
    window.addEventListener('keydown', tecla)
    return function() { window.removeEventListener('keydown', tecla) }
  }, [])

  // Ao abrir: se o fluxo for largo, ajusta para caber na tela
  useEffect(function() {
    const t = setTimeout(function() {
      const el = area.current
      if (el && pos[pos.length - 1].x + W + 60 > el.clientWidth) ajustar()
    }, 60)
    return function() { clearTimeout(t) }
  }, [])

  const g = seq.trigger
  const evento = g.tipo === 'evento' ? EVENTOS.find(function(x) { return x.k === g.evento }) : null
  const nGatilho = (stats ? stats.runs : []).reduce(function(a, r) { return a + r.n }, 0)

  function cartao(n: { key: string; passo: PassoSeq | null; i: number }, k: number) {
    const p = n.passo
    const selecionado = sel === n.key
    const cor = !p ? '#f59e0b' : p.tipo === 'atraso' ? '#ef4444' : p.tipo === 'resposta' ? '#8b5cf6' : p.tipo === 'ia' ? '#0ea5e9' : '#16a34a'
    const icone = !p ? '🔔' : MENU.find(function(m) { return m.tipo === p.tipo })!.icone
    const tag = !p ? 'Gatilho' : p.tipo === 'atraso' || p.tipo === 'resposta' || p.tipo === 'ia' ? 'Lógica' : 'Mensagem'
    const titulo = !p ? 'Quando…' : ROTULO_TIPO[p.tipo]
    const num = p ? numeros(stats, seq.steps, n.i) as any : null
    let corpo: React.ReactNode = null
    if (!p) {
      corpo = g.tipo === 'palavra'
        ? <div style={caixa}><b>O contato interagiu</b><div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{g.match === 'igual' ? 'A mensagem é ' : 'A mensagem contém '}<b>{g.palavras.length ? g.palavras.join(', ') : '…'}</b></div></div>
        : <div style={caixa}><b>{evento ? evento.nome : 'Evento da compra'}</b>{g.metodo ? <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>Só {g.metodo}</div> : null}</div>
    } else if (p.tipo === 'atraso') corpo = <div style={caixa}>⏱ {textoAtraso(p)}</div>
    else if (p.tipo === 'ia') corpo = <div style={caixa}>🤖 A IA (Júnior) continua a conversa daqui</div>
    else if (p.tipo === 'resposta') corpo = <div style={caixa}>↩️ Espera a pessoa responder{p.valor > 0 ? ' por até ' + p.valor + ' ' + p.unidade + ' (depois ' + (p.aoExpirar === 'continuar' ? 'continua' : 'encerra') + ')' : ''}</div>
    else if (p.tipo === 'texto') corpo = <div style={{ ...caixa, maxHeight: 96, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{p.texto || <i style={{ color: 'var(--muted2)' }}>Mensagem vazia. Clique para escrever.</i>}</div>
    else if (p.tipo === 'audio') corpo = <div style={caixa}>{p.path ? '🎤 ' + (p.nome || 'áudio') : <i style={{ color: 'var(--muted2)' }}>Sem áudio. Clique para enviar.</i>}</div>
    else if (p.tipo === 'imagem' || p.tipo === 'video') corpo = <div style={caixa}>{p.path ? (p.tipo === 'imagem' ? '🖼️ ' : '🎬 ') + (p.nome || p.tipo) + (p.legenda ? ' — ' + p.legenda.slice(0, 40) : '') : <i style={{ color: 'var(--muted2)' }}>Sem arquivo. Clique para enviar.</i>}</div>
    else corpo = <div style={caixa}>{p.template ? '📄 ' + p.template : <i style={{ color: 'var(--muted2)' }}>Escolha o modelo. Clique aqui.</i>}</div>
    return (
      <div key={n.key} data-bloco="1" ref={function(el) { refs.current[n.key] = el }} onClick={function() { setSel(n.key); setMenu(null) }}
        style={{ position: 'absolute', left: pos[k].x, top: pos[k].y, width: W, background: 'var(--surface)', border: selecionado ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 14, boxShadow: selecionado ? '0 6px 22px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', left: -7, top: PORTA_Y - 7, width: 12, height: 12, borderRadius: 99, background: 'var(--surface)', border: '3px solid #10b981' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icone}</div>
          <div style={{ minWidth: 0 }}>
            <div style={etiqueta}>{tag}</div>
            <div style={tituloCartao}>{titulo}</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {!p && <Numeros itens={[['Iniciaram', nGatilho]]} />}
          {p && p.tipo === 'atraso' && <Numeros itens={[['Agendado', num.agendado], ['Pendente', num.pendente], ['Concluído', num.concluido]]} />}
          {p && p.tipo === 'ia' && <Numeros itens={[['Transferidos', num.concluido]]} />}
          {p && p.tipo === 'resposta' && <Numeros itens={[['Aguardando', num.agendado], ['Pendente', num.pendente], ['Concluído', num.concluido]]} />}
          {p && p.tipo !== 'atraso' && p.tipo !== 'resposta' && p.tipo !== 'ia' && <Numeros itens={[['Enviado', num.enviado], ['Entregue', num.entregue], ['Lido', num.lido], ['Falha', num.falha]]} />}
          <div style={{ padding: '0 12px 10px' }}>{corpo}</div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--surface2)', borderRadius: '0 0 12px 12px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {p && <button data-ctl="1" title="Duplicar bloco" onClick={function(e) { e.stopPropagation(); duplicar(n.i) }} style={miniBtn}>⧉</button>}
            {p && <button data-ctl="1" title="Apagar bloco" onClick={function(e) { e.stopPropagation(); remover(n.i) }} style={miniBtn}>🗑</button>}
          </div>
          <button data-ctl="1" title="Adicionar o próximo bloco" onClick={function(e) { e.stopPropagation(); if (menu && menu.i === n.i) { setMenu(null); return } const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ i: n.i, x: r.right + 12, y: r.top }) }} style={{ cursor: 'pointer', width: 30, height: 30, borderRadius: 99, border: 0, background: '#3f3f46', color: '#fff', fontSize: 20, lineHeight: '28px', fontWeight: 700, padding: 0 }}>+</button>
        </div>
      </div>
    )
  }

  // ---------- painel de edicao ----------
  function painel() {
    if (sel === 'gatilho') {
      return (
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, color: 'var(--text)' }}>🔔 Como o fluxo começa</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button onClick={function() { mudar(function(s) { return { ...s, trigger: { tipo: 'palavra', palavras: [], match: 'contem' } } }); setPalavrasTxt('') }} style={abaBtn(g.tipo === 'palavra')}>Contato enviou uma palavra</button>
            <button onClick={function() { mudar(function(s) { return { ...s, trigger: { tipo: 'evento', evento: 'lead.abandoned_checkout' } } }) }} style={abaBtn(g.tipo === 'evento')}>Evento da compra</button>
          </div>
          {g.tipo === 'palavra' && (
            <div>
              <label style={lab}>Palavra(s) que iniciam o fluxo</label>
              <input className="at-input" value={palavrasTxt} placeholder="Ex.: quero, mentoria" onChange={function(e) {
                const v = e.target.value
                setPalavrasTxt(v)
                const lista = v.split(/[,\n]/).map(function(x) { return x.trim() }).filter(Boolean)
                mudar(function(s) { return { ...s, trigger: { tipo: 'palavra', palavras: lista, match: s.trigger.tipo === 'palavra' ? s.trigger.match : 'contem' } } })
              }} />
              <div style={{ fontSize: 12, color: 'var(--muted2)', margin: '4px 0 10px' }}>Separe várias palavras por vírgula. Não importa maiúscula, minúscula ou acento.</div>
              <label style={lab}>Quando considerar que combinou</label>
              <select className="at-input" value={g.match} onChange={function(e) { const m = e.target.value === 'igual' ? 'igual' : 'contem'; mudar(function(s) { return s.trigger.tipo === 'palavra' ? { ...s, trigger: { ...s.trigger, match: m } } : s }) }}>
                <option value="contem">A mensagem contém a palavra</option>
                <option value="igual">A mensagem é exatamente a palavra</option>
              </select>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 10, lineHeight: 1.5 }}>Vale para as mensagens que chegam no número escolhido lá em cima. A mesma pessoa só entra de novo neste fluxo depois de 12 horas. Enquanto o fluxo roda, o assistente não responde essa primeira mensagem.</div>
            </div>
          )}
          {g.tipo === 'evento' && (
            <div>
              <label style={lab}>Evento</label>
              <select className="at-input" value={g.evento} onChange={function(e) { const v = e.target.value; mudar(function(s) { return { ...s, trigger: { tipo: 'evento', evento: v } } }) }}>
                {EVENTOS.map(function(x) { return <option key={x.k} value={x.k}>{x.nome}</option> })}
              </select>
              {evento && <div style={{ fontSize: 12, color: 'var(--muted2)', margin: '4px 0 10px' }}>{evento.desc}</div>}
              {evento && evento.filtroMetodo && (
                <div>
                  <label style={lab}>Forma de pagamento</label>
                  <select className="at-input" value={g.metodo || ''} onChange={function(e) { const v = e.target.value as any; mudar(function(s) { return s.trigger.tipo === 'evento' ? { ...s, trigger: { ...s.trigger, metodo: v } } : s }) }}>
                    <option value="">Qualquer</option><option value="pix">Só Pix</option><option value="boleto">Só boleto</option><option value="cartao">Só cartão</option>
                  </select>
                </div>
              )}
              <label style={{ ...lab, marginTop: 10 }}>Só para o produto (opcional)</label>
              <input className="at-input" value={g.produto || ''} placeholder="Ex.: mentoria" onChange={function(e) { const v = e.target.value; mudar(function(s) { return s.trigger.tipo === 'evento' ? { ...s, trigger: { ...s.trigger, produto: v } } : s }) }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={seq.cancel_on_purchase} onChange={function(e) { const v = e.target.checked; mudar(function(s) { return { ...s, cancel_on_purchase: v } }) }} style={{ width: 16, height: 16 }} />
                Parar o fluxo se a pessoa comprar
              </label>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 10, lineHeight: 1.5 }}>Nesse caso a pessoa ainda não falou com você: o primeiro envio precisa ser um <b>Modelo aprovado</b>. Texto, áudio, imagem e vídeo só saem se ela tiver falado com você nas últimas 24 horas.</div>
            </div>
          )}
        </div>
      )
    }
    const p = passoSel
    if (!p) return null
    const titulo = <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, color: 'var(--text)' }}>{MENU.find(function(m) { return m.tipo === p.tipo })!.icone} {ROTULO_TIPO[p.tipo]}</div>
    if (p.tipo === 'atraso') {
      return (
        <div>
          {titulo}
          <label style={lab}>Esperar</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="at-input" type="number" min={1} value={p.valor} onChange={function(e) { const v = Math.round(Number(e.target.value)); setPasso(p.id, function(x) { return { ...(x as any), valor: v > 0 ? v : 0 } }) }} style={{ width: 100 }} />
            <select className="at-input" value={p.unidade} onChange={function(e) { const u = e.target.value as Unidade; setPasso(p.id, function(x) { return { ...(x as any), unidade: u } }) }} style={{ width: 'auto' }}>
              <option value="segundos">segundos</option><option value="minutos">minutos</option><option value="horas">horas</option><option value="dias">dias</option>
            </select>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 8, lineHeight: 1.5 }}>Depois desse tempo o fluxo segue para o próximo bloco. De 1 segundo até 30 dias. Cuidado: texto, áudio, imagem e vídeo só saem até 24 horas depois da última mensagem da pessoa. Passou disso, use um Modelo aprovado.</div>
        </div>
      )
    }
    if (p.tipo === 'ia') {
      return (
        <div>
          {titulo}
          <div style={{ ...caixa, marginBottom: 12, lineHeight: 1.5 }}>Aqui o fluxo termina e a <b>IA (Júnior)</b> continua a conversa. Ela lê tudo o que já foi dito e responde <b>sem dar oi nem se apresentar</b>, direto no assunto.</div>
          <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>Se a pessoa acabou de responder, a IA responde logo em seguida. Se não, ela responde na próxima mensagem da pessoa. A IA fica ligada nessa conversa. Este precisa ser o <b>último bloco</b> do fluxo.</div>
        </div>
      )
    }
    if (p.tipo === 'resposta') {
      return (
        <div>
          {titulo}
          <div style={{ ...caixa, marginBottom: 12, lineHeight: 1.5 }}>O fluxo para aqui e só segue para o próximo bloco <b>depois que a pessoa responder</b> (qualquer resposta: texto, áudio ou imagem). Quando ela responde, a janela de 24 horas se abre e dá para enviar texto, áudio, imagem e vídeo.</div>
          <label style={lab}>Esperar a resposta por até (0 = sem limite, até 30 dias)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="at-input" type="number" min={0} value={p.valor} onChange={function(e) { const v = Math.max(0, Math.round(Number(e.target.value) || 0)); setPasso(p.id, function(x) { return { ...(x as any), valor: v } }) }} style={{ width: 100 }} />
            <select className="at-input" value={p.unidade} onChange={function(e) { const u = e.target.value as Unidade; setPasso(p.id, function(x) { return { ...(x as any), unidade: u } }) }} style={{ width: 'auto' }}>
              <option value="minutos">minutos</option><option value="horas">horas</option><option value="dias">dias</option>
            </select>
          </div>
          {p.valor > 0 && (
            <div style={{ marginTop: 12 }}>
              <label style={lab}>Se a pessoa não responder nesse tempo</label>
              <select className="at-input" value={p.aoExpirar} onChange={function(e) { const v = e.target.value === 'continuar' ? 'continuar' : 'encerrar'; setPasso(p.id, function(x) { return { ...(x as any), aoExpirar: v } }) }}>
                <option value="encerrar">Encerrar o fluxo</option>
                <option value="continuar">Continuar para o próximo bloco mesmo assim</option>
              </select>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 10, lineHeight: 1.5 }}>Enquanto a pessoa responde o fluxo, o assistente não responde essas mensagens: o próprio fluxo continua a conversa.</div>
        </div>
      )
    }
    if (p.tipo === 'texto') {
      return (
        <div>
          {titulo}
          <label style={lab}>Mensagem</label>
          <textarea className="at-input" rows={8} value={p.texto} placeholder="Escreva a mensagem. Use {{nome}} para o primeiro nome da pessoa." onChange={function(e) { const v = e.target.value; setPasso(p.id, function(x) { return { ...(x as any), texto: v } }) }} style={{ resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <button onClick={function() { setPasso(p.id, function(x) { return { ...(x as any), texto: (x as any).texto + '{{nome}}' } }) }} style={miniTxt}>+ {'{{nome}}'}</button>
            <span style={{ fontSize: 12, color: 'var(--muted2)' }}>{p.texto.length}/4000</span>
          </div>
        </div>
      )
    }
    if (p.tipo === 'audio' || p.tipo === 'imagem' || p.tipo === 'video') {
      const aceita = p.tipo === 'audio' ? 'audio/*' : p.tipo === 'imagem' ? 'image/jpeg,image/png' : 'video/mp4,video/3gpp'
      const url = p.path ? urls[p.path] : ''
      return (
        <div>
          {titulo}
          {p.path ? (
            <div style={{ marginBottom: 10 }}>
              {p.tipo === 'audio' && (url ? <audio controls src={url} style={{ width: '100%' }} /> : <div style={caixa}>Carregando áudio…</div>)}
              {p.tipo === 'imagem' && (url ? <img src={url} alt="" style={{ width: '100%', borderRadius: 10 }} /> : <div style={caixa}>Carregando imagem…</div>)}
              {p.tipo === 'video' && (url ? <video controls src={url} style={{ width: '100%', borderRadius: 10 }} /> : <div style={caixa}>Carregando vídeo…</div>)}
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>{p.nome}</div>
            </div>
          ) : <div style={{ ...caixa, marginBottom: 10 }}>Nenhum arquivo ainda.</div>}
          <label style={{ ...miniTxt, display: 'inline-block', opacity: enviando ? 0.6 : 1 }}>
            {enviando ? 'Enviando…' : p.path ? 'Trocar arquivo' : 'Escolher arquivo'}
            <input type="file" accept={aceita} disabled={enviando} style={{ display: 'none' }} onChange={function(e) { const f = e.target.files && e.target.files[0]; if (f) enviarArquivo(p, f); e.target.value = '' }} />
          </label>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6 }}>{p.tipo === 'audio' ? 'mp3, m4a, aac, ogg ou amr, até 16 MB.' : p.tipo === 'imagem' ? 'JPG ou PNG, até 5 MB.' : 'MP4 ou 3GP, até 16 MB.'}</div>
          {p.tipo !== 'audio' && (
            <div style={{ marginTop: 12 }}>
              <label style={lab}>Legenda (opcional)</label>
              <textarea className="at-input" rows={3} value={(p as any).legenda} onChange={function(e) { const v = e.target.value; setPasso(p.id, function(x) { return { ...(x as any), legenda: v } }) }} style={{ resize: 'vertical' }} />
            </div>
          )}
        </div>
      )
    }
    // modelo
    const m = modelos.find(function(x) { return x.name === p.template && x.language === p.language })
    return (
      <div>
        {titulo}
        {!seq.connection_id && <div style={{ ...caixa, marginBottom: 8 }}>Escolha o número de WhatsApp lá em cima para ver os modelos.</div>}
        <select className="at-input" value={p.template ? p.template + '|' + p.language : ''} onChange={function(e) {
          const [nome, lang] = e.target.value.split('|')
          const t = modelos.find(function(x) { return x.name === nome && x.language === lang })
          const params: { mode: 'nome' | 'produto' | 'link' | 'texto'; value: string }[] = []
          for (let i = 0; i < (t ? t.vars : 0); i++) params.push({ mode: i === 0 ? 'nome' : 'texto', value: '' })
          setPasso(p.id, function(x) { return { ...(x as any), template: nome || '', language: lang || 'pt_BR', params } })
        }}>
          <option value="">{carregandoModelos ? 'Carregando modelos…' : modelos.length === 0 ? 'Nenhum modelo aprovado neste número' : 'Escolha o modelo…'}</option>
          {modelos.map(function(x) { return <option key={x.name + x.language} value={x.name + '|' + x.language}>{x.name} ({x.language})</option> })}
          {p.template && !m && !carregandoModelos && <option value={p.template + '|' + p.language}>{p.template} (não encontrado)</option>}
        </select>
        {m && p.params.map(function(x, i) {
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{'{{' + (i + 1) + '}}'} =</span>
              <select className="at-input" value={x.mode} onChange={function(e) { const mode = e.target.value as any; setPasso(p.id, function(y) { return { ...(y as any), params: (y as any).params.map(function(z: any, j: number) { return j === i ? { mode, value: z.value } : z }) } }) }} style={{ width: 'auto' }}>
                {VARIAVEIS.map(function(v) { return <option key={v.k} value={v.k}>{v.nome}</option> })}
              </select>
              {x.mode === 'texto' && <input className="at-input" value={x.value} placeholder="Texto" onChange={function(e) { const val = e.target.value; setPasso(p.id, function(y) { return { ...(y as any), params: (y as any).params.map(function(z: any, j: number) { return j === i ? { mode: z.mode, value: val } : z }) } }) }} style={{ flex: '1 1 140px' }} />}
            </div>
          )
        })}
        {m && <div style={{ background: '#d9fdd3', color: '#111b21', borderRadius: 10, padding: '8px 10px', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 10 }}><div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 2 }}>Prévia</div>{m.body}</div>}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .cb-corpo { flex: 1; min-height: 0; display: flex; }
        .cb-painel { width: 340px; flex-shrink: 0; border-left: 1px solid var(--border); background: var(--surface); overflow-y: auto; padding: 14px; }
        @media (max-width: 900px) { .cb-corpo { flex-direction: column; } .cb-painel { width: auto; border-left: 0; border-top: 1px solid var(--border); max-height: 46vh; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={voltar} style={{ cursor: 'pointer', border: 0, background: 'transparent', color: 'var(--accent)', fontWeight: 800, fontSize: 13.5, padding: 0 }}>← Fluxos</button>
        <input className="at-input" value={seq.name} onChange={function(e) { const v = e.target.value; mudar(function(s) { return { ...s, name: v } }) }} placeholder="Nome do fluxo" style={{ flex: '1 1 160px', maxWidth: 280, fontWeight: 800 }} />
        <select className="at-input" value={seq.connection_id || ''} onChange={function(e) { const v = e.target.value || null; mudar(function(s) { return { ...s, connection_id: v } }) }} style={{ width: 'auto', maxWidth: 220 }}>
          <option value="">Escolha o número…</option>
          {conexoes.map(function(c) { return <option key={c.id} value={c.id}>{c.name}{c.display_phone ? ' · ' + c.display_phone : ''}{c.active ? '' : ' (inativo)'}</option> })}
        </select>
        <button onClick={alternarLigado} disabled={salvando} title={seq.enabled ? 'Clique para desligar' : 'Clique para ligar'} style={{ cursor: 'pointer', border: 0, borderRadius: 999, padding: '7px 14px', fontWeight: 800, fontSize: 12.5, background: seq.enabled ? 'rgba(22,163,74,0.16)' : 'var(--surface2)', color: seq.enabled ? '#15803d' : 'var(--muted2)' }}>{seq.enabled ? '● Ligado' : '○ Desligado'}</button>
        <div style={{ flex: 1 }} />
        {ok && <span style={{ fontSize: 12.5, color: '#15803d', fontWeight: 800 }}>{ok}</span>}
        {sujo && !ok && <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Alterações não salvas</span>}
        <button onClick={function() { setTeste(!teste) }} style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13 }}>Testar</button>
        <button onClick={function() { salvar() }} disabled={salvando} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '9px 18px', fontWeight: 800, fontSize: 13.5, opacity: salvando ? 0.6 : 1 }}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        {id && <button onClick={apagar} title="Apagar fluxo" style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 10, padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Apagar</button>}
      </div>
      {msg && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, padding: '6px 14px', background: 'var(--surface)' }}>{msg}</div>}
      {teste && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Enviar um teste para:</span>
          <input className="at-input" value={tNum} onChange={function(e) { setTNum(e.target.value) }} placeholder="Seu WhatsApp com DDD" style={{ width: 190 }} />
          <input className="at-input" value={tNome} onChange={function(e) { setTNome(e.target.value) }} placeholder="Nome (opcional)" style={{ width: 150 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text)', cursor: 'pointer' }}><input type="checkbox" checked={tPular} onChange={function(e) { setTPular(e.target.checked) }} />Pular os atrasos</label>
          <button onClick={testar} disabled={testando || !tNum.trim()} style={{ cursor: 'pointer', border: 0, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, opacity: testando || !tNum.trim() ? 0.6 : 1 }}>{testando ? 'Agendando…' : 'Enviar teste'}</button>
          <span style={{ fontSize: 12, color: 'var(--muted2)', flexBasis: '100%' }}>Texto, áudio, imagem e vídeo só chegam se você mandou mensagem para esse número nas últimas 24 horas.</span>
        </div>
      )}
      <div className="cb-corpo">
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div ref={area} onPointerDown={aoPressionar} onPointerMove={aoMover} onPointerUp={soltar} onPointerCancel={soltar}
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--surface2)', backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: (22 * view.k) + 'px ' + (22 * view.k) + 'px', backgroundPosition: view.x + 'px ' + view.y + 'px', cursor: arrasto.current && arrasto.current.moveu ? 'grabbing' : 'grab', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: largura, height: altura, transformOrigin: '0 0', transform: 'translate(' + view.x + 'px, ' + view.y + 'px) scale(' + view.k + ')' }}>
              <svg width={largura} height={altura} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
                {nos.slice(0, -1).map(function(n, k) {
                  const x1 = pos[k].x + W
                  const y1 = pos[k].y + h(n.key) - 24
                  const x2 = pos[k + 1].x
                  const y2 = pos[k + 1].y + PORTA_Y
                  const d = 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + GAP * 0.6) + ' ' + y1 + ', ' + (x2 - GAP * 0.6) + ' ' + y2 + ', ' + x2 + ' ' + y2
                  return <path key={n.key} d={d} fill="none" stroke="#9ca3af" strokeWidth={1.5} />
                })}
              </svg>
              {nos.map(function(n, k) { return cartao(n, k) })}
            </div>
          </div>
          <div data-ctl="1" style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <button title="Diminuir" onClick={function() { zoomCentro(1 / 1.2) }} style={miniBtn}>−</button>
            <button title="Voltar para 100%" onClick={cem} style={{ ...miniBtn, width: 'auto', minWidth: 52, padding: '0 6px', fontSize: 12.5 }}>{view.k.toFixed(2)}</button>
            <button title="Aumentar" onClick={function() { zoomCentro(1.2) }} style={miniBtn}>+</button>
            <button title="Ajustar o fluxo à tela" onClick={ajustar} style={{ ...miniBtn, width: 'auto', padding: '0 8px', fontSize: 12.5 }}>Ajustar</button>
          </div>
          <div data-ctl="1" style={{ position: 'absolute', right: 12, bottom: 12, fontSize: 11.5, color: 'var(--muted2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', pointerEvents: 'none' }}>Arraste para mover · Ctrl + roda para zoom</div>
        </div>
        <div className="cb-painel">{painel()}</div>
      </div>
      {menu && (
        <div data-ctl="1" style={{ position: 'fixed', left: Math.max(8, Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 290)), top: Math.max(8, Math.min(menu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 380)), width: 270, maxHeight: 'calc(100vh - 16px)', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.22)', zIndex: 1000, padding: 6 }}>
          <div style={{ ...etiqueta, padding: '6px 8px' }}>Adicionar bloco</div>
          {MENU.map(function(m) {
            return (
              <button key={m.tipo} onClick={function() { adicionar(menu.i, m.tipo) }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 0, background: 'transparent', color: 'var(--text)', padding: '8px', borderRadius: 8 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: m.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{m.icone}</span>
                <span><span style={{ display: 'block', fontWeight: 800, fontSize: 13 }}>{ROTULO_TIPO[m.tipo]}</span><span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted2)' }}>{m.desc}</span></span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const miniBtn: React.CSSProperties = { cursor: 'pointer', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 700, padding: 0, lineHeight: '26px' }
const miniTxt: React.CSSProperties = { cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 12.5 }
function abaBtn(on: boolean): React.CSSProperties {
  return { cursor: 'pointer', flex: 1, border: on ? '2px solid var(--accent)' : '1px solid var(--border)', background: on ? 'var(--accent-light)' : 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '8px 8px', fontWeight: 800, fontSize: 12.5 }
}
