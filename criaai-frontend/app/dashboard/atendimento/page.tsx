'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Modelos, { type Tpl } from '@/components/whatsapp/Modelos'
import TemplatePicker, { type TplSend } from '@/components/whatsapp/TemplatePicker'
import Atendentes from '@/components/whatsapp/Atendentes'
import Fluxos from '@/components/whatsapp/Fluxos'
import Conexoes from '@/components/whatsapp/Conexoes'
import Disparo from '@/components/whatsapp/Disparo'
import { paraMp3 } from '@/lib/audioMp3'
import { classificar } from '@/lib/waMedia'

type Pessoa = { id: string; nome: string; email: string; admin: boolean }
type Conv = { id: string; assigned_to: string | null; wa_id: string; name: string | null; profile_label: string | null; status: string; unread: number; last_text: string | null; last_message_at: string; last_inbound_at: string | null }
type Msg = { id: string; conversation_id: string; direction: 'in' | 'out'; sent_by?: string | null; type: string; body: string | null; media_path: string | null; mime: string | null; status: string; error: string | null; created_at: string }
type Status = { connected: boolean; missing?: string[]; webhookUrl?: string; number?: string; name?: string; quality?: string; error?: string }

const WIN = 24 * 60 * 60 * 1000

function fmtPhone(wa: string): string {
  const d = (wa || '').replace(/\D/g, '')
  if (d.length === 13 && d.indexOf('55') === 0) return '+55 (' + d.slice(2, 4) + ') ' + d.slice(4, 9) + '-' + d.slice(9)
  if (d.length === 12 && d.indexOf('55') === 0) return '+55 (' + d.slice(2, 4) + ') ' + d.slice(4, 8) + '-' + d.slice(8)
  return d ? '+' + d : wa
}
function hora(iso: string): string {
  const d = new Date(iso)
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const ontem = new Date(Date.now() - 86400000)
  if (d.toDateString() === ontem.toDateString()) return 'ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function horaMsg(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function diaMsg(iso: string): string {
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString()) return 'Hoje'
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}
function nomeDe(c: Conv): string { return c.name || fmtPhone(c.wa_id) }
function inicial(c: Conv): string { return (nomeDe(c).replace(/[^A-Za-zÀ-ú0-9]/g, '')[0] || '?').toUpperCase() }

function Tick({ s }: { s: string }) {
  if (s === 'failed') return <span title="Falhou" style={{ color: '#ef4444' }}>⚠</span>
  if (s === 'read') return <span style={{ color: '#34b7f1' }}>✓✓</span>
  if (s === 'delivered') return <span style={{ opacity: 0.6 }}>✓✓</span>
  return <span style={{ opacity: 0.6 }}>✓</span>
}

function Midia({ m }: { m: Msg }) {
  if (!m.media_path) return null
  const src = '/api/whatsapp/media?m=' + m.id
  if (m.type === 'image' || m.type === 'sticker') return <a href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="Imagem" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, display: 'block', marginBottom: m.body ? 6 : 0 }} /></a>
  if (m.type === 'audio') return <audio controls src={src} style={{ maxWidth: '100%', height: 36 }} />
  if (m.type === 'video') return <video controls src={src} style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8 }} />
  return <a href={src} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>📎 Abrir arquivo</a>
}

export default function AtendimentoPage() {
  const supabase = createClient()
  const [convs, setConvs] = useState<Conv[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [aba, setAba] = useState<'abertas' | 'resolvidas'>('abertas')
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [status, setStatus] = useState<Status | null>(null)
  const [staff, setStaff] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<'conversas' | 'atendentes' | 'modelos' | 'disparo' | 'fluxos' | 'conexoes'>('conversas')
  const [tpls, setTpls] = useState<Tpl[] | null>(null)
  const [disparoAberto, setDisparoAberto] = useState(false)
  const [tplErro, setTplErro] = useState('')
  const [tplCarregando, setTplCarregando] = useState(false)
  const [mostrarTpl, setMostrarTpl] = useState(false)
  const [anexo, setAnexo] = useState<File | null>(null)
  const [gravando, setGravando] = useState(false)
  const [segs, setSegs] = useState(0)
  const recRef = useRef<MediaRecorder | null>(null)
  const recCancel = useRef(false)
  const recTimer = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [ferramentas, setFerramentas] = useState(false)
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [meuId, setMeuId] = useState('')
  const [filtro, setFiltro] = useState<string>('todas')
  const [menuAberto, setMenuAberto] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const selRef = useRef<string | null>(null)
  selRef.current = sel

  const carregarConvs = useCallback(async function() {
    const r = await supabase.from('wa_conversations').select('*').order('last_message_at', { ascending: false }).limit(300)
    if (!r.error && r.data) setConvs(r.data as Conv[])
  }, [])

  const carregarMsgs = useCallback(async function(id: string) {
    const r = await supabase.from('wa_messages').select('id, conversation_id, direction, sent_by, type, body, media_path, mime, status, error, created_at').eq('conversation_id', id).order('created_at', { ascending: true }).limit(500)
    if (!r.error && r.data && selRef.current === id) setMsgs(r.data as Msg[])
  }, [])

  const carregarTpls = useCallback(async function() {
    setTplCarregando(true)
    try {
      const r = await fetch('/api/whatsapp/templates', { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (r.ok) { setTpls(j.templates || []); setTplErro('') }
      else { setTplErro(j.error || 'Não foi possível listar os modelos.'); setTpls(function(x) { return x }) }
    } catch (e) { setTplErro('Sem conexão. Tente de novo.') }
    setTplCarregando(false)
  }, [])

  useEffect(function() {
    // Ferramentas de conexao ficam escondidas; abrir com ?ferramentas=1 quando precisar (ex.: trocar de numero)
    try { setFerramentas(new URLSearchParams(window.location.search).get('ferramentas') === '1') } catch (e) {}
    ;(async function() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStaff(false); return }
      setMeuId(user.id)
      const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      setIsAdmin(!!(p.data as any)?.is_admin)
      if (!(p.data as any)?.is_admin) setFiltro('sem')
      if ((p.data as any)?.is_admin) {
        const pe = await supabase.rpc('wa_assignable')
        if (!pe.error && pe.data) setPessoas(pe.data as any)
      }
      const s = await supabase.rpc('wa_is_staff')
      setStaff(s.data === true)
      if (s.data === true) {
        supabase.rpc('wa_staff_names').then(function(r) {
          if (!r.error && r.data) { const m: Record<string, string> = {}; for (const x of (r.data as any[])) m[x.id] = String(x.nome || '').trim().split(/\s+/).slice(0, 2).join(' '); setNomes(m) }
        })
        carregarConvs()
        carregarTpls()
        fetch('/api/whatsapp/status').then(function(r) { return r.json() }).then(setStatus).catch(function() {})
      }
    })()
  }, [])

  // Tempo real + atualizacao de seguranca a cada 20s
  useEffect(function() {
    if (!staff) return
    let t: any = null
    const refresh = function() {
      if (t) return
      t = setTimeout(function() { t = null; carregarConvs(); if (selRef.current) carregarMsgs(selRef.current) }, 300)
    }
    const ch = supabase.channel('wa-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_messages' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversations' }, refresh)
      .subscribe()
    const iv = setInterval(refresh, 20000)
    return function() { clearInterval(iv); if (t) clearTimeout(t); supabase.removeChannel(ch) }
  }, [staff])

  useEffect(function() { if (fim.current) fim.current.scrollIntoView({ block: 'end' }) }, [msgs.length, sel])

  async function abrir(c: Conv) {
    setSel(c.id); setMsgs([]); setErro(''); setTexto('')
    selRef.current = c.id
    await carregarMsgs(c.id)
    if (c.unread > 0 && c.assigned_to) {
      setConvs(function(l) { return l.map(function(x) { return x.id === c.id ? { ...x, unread: 0 } : x }) })
      fetch('/api/whatsapp/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: c.id }) }).catch(function() {})
    }
  }

  const atual = convs.find(function(c) { return c.id === sel }) || null
  const janelaAberta = !!(atual && atual.last_inbound_at && Date.now() - new Date(atual.last_inbound_at).getTime() < WIN)
  const horasRestantes = atual && atual.last_inbound_at ? Math.max(0, Math.ceil((WIN - (Date.now() - new Date(atual.last_inbound_at).getTime())) / 3600000)) : 0

  async function enviar(modelo?: TplSend) {
    if (!atual || enviando) return
    setErro('')
    const body: any = { conversationId: atual.id }
    if (modelo) {
      body.template = { name: modelo.name, language: modelo.language, params: modelo.params, preview: modelo.preview }
    } else {
      if (!texto.trim()) return
      body.text = texto
    }
    setEnviando(true)
    try {
      const r = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Nao foi possivel enviar.')
      else { setTexto(''); setMostrarTpl(false); fetch('/api/whatsapp/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: atual.id }) }).catch(function() {}); await carregarMsgs(atual.id); carregarConvs() }
    } catch (e) { setErro('Sem conexao. Tente de novo.') }
    setEnviando(false)
  }

  function mimeDe(f: File): string {
    if (f.type) return f.type
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    const m: Record<string, string> = { pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', doc: 'application/msword', xls: 'application/vnd.ms-excel', ppt: 'application/vnd.ms-powerpoint',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', amr: 'audio/amr', mp4: 'video/mp4', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }
    return m[ext] || ''
  }

  function escolherArquivo(f: File | null | undefined) {
    if (!f) return
    setErro('')
    const c = classificar(mimeDe(f))
    if ('erro' in c) { setErro(c.erro); return }
    if (f.size > c.max) { setErro('Arquivo grande demais (máximo ' + Math.round(c.max / 1048576) + ' MB para este tipo).'); return }
    setAnexo(f)
  }

  // Envia um arquivo (ou audio gravado): sobe direto ao armazenamento e depois manda pelo WhatsApp
  async function enviarArquivo(file: Blob, nome: string, mime: string, legenda: string) {
    if (!atual || enviando) return
    setEnviando(true); setErro('')
    try {
      const u = await fetch('/api/whatsapp/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: atual.id, filename: nome, mime, size: file.size }) })
      const uj = await u.json().catch(function() { return {} })
      if (!u.ok) { setErro(uj.error || 'Não foi possível preparar o envio.'); setEnviando(false); return }
      const up = await supabase.storage.from('wa-media').uploadToSignedUrl(uj.path, uj.token, file, { contentType: mime })
      if (up.error) { setErro('Não foi possível enviar o arquivo. Tente de novo.'); setEnviando(false); return }
      const r = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: atual.id, media: { path: uj.path, mime, filename: nome, caption: legenda } }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível enviar.')
      else { setTexto(''); setAnexo(null); fetch('/api/whatsapp/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: atual.id }) }).catch(function() {}); await carregarMsgs(atual.id); carregarConvs() }
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
    setEnviando(false)
  }

  async function iniciarGravacao() {
    setErro('')
    // ogg/opus (Firefox) o WhatsApp aceita direto; nos outros navegadores grava e converte para MP3 depois
    const tipos = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    const tipo = typeof MediaRecorder !== 'undefined' ? tipos.find(function(t) { return MediaRecorder.isTypeSupported(t) }) : undefined
    if (!tipo) { setErro('Este navegador não consegue gravar áudio. Use o clipe 📎 para enviar um arquivo de áudio.'); return }
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch (e) { setErro('Permita o uso do microfone no navegador para gravar.'); return }
    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream, { mimeType: tipo })
    recCancel.current = false
    rec.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunks.push(e.data) }
    rec.onstop = async function() {
      stream.getTracks().forEach(function(t) { t.stop() })
      if (recTimer.current) { clearInterval(recTimer.current); recTimer.current = null }
      setGravando(false)
      if (recCancel.current || chunks.length === 0) return
      const mime = tipo.split(';')[0]
      const bruto = new Blob(chunks, { type: mime })
      if (mime === 'audio/ogg') { enviarArquivo(bruto, 'audio.ogg', 'audio/ogg', ''); return }
      setEnviando(true)
      try {
        const mp3 = await paraMp3(bruto)
        setEnviando(false)
        enviarArquivo(mp3, 'audio.mp3', 'audio/mpeg', '')
      } catch (e) {
        setEnviando(false)
        setErro('Não consegui preparar o áudio gravado. Tente de novo ou envie um arquivo de áudio pelo clipe 📎.')
      }
    }
    recRef.current = rec
    rec.start()
    setSegs(0); setGravando(true)
    recTimer.current = setInterval(function() { setSegs(function(x) { return x + 1 }) }, 1000)
  }
  function pararGravacao(cancelar: boolean) {
    recCancel.current = cancelar
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
  }

  async function mudarStatus(novo: 'aberta' | 'resolvida') {
    if (!atual) return
    await supabase.rpc('wa_set_status', { p_conv: atual.id, p_status: novo })
    await carregarConvs()
    if (novo === 'resolvida') setSel(null)
  }

  async function atribuir(userId: string) {
    if (!atual) return
    setErro('')
    const r = await supabase.rpc('wa_assign', { p_conv: atual.id, p_user: userId || null })
    if (r.error) setErro(r.error.message)
    await carregarConvs()
  }
  function primeiroNome(id: string | null): string {
    if (!id) return 'Em espera'
    if (nomes[id]) return nomes[id]
    const p = pessoas.find(function(x) { return x.id === id })
    return p ? (p.nome.split(' ')[0] || p.email) : 'Atendente'
  }

  const lista = convs.filter(function(c) {
    if ((aba === 'abertas') !== (c.status !== 'resolvida')) return false
    if (filtro === 'sem' && c.assigned_to) return false
    if (filtro !== 'todas' && filtro !== 'sem' && c.assigned_to !== filtro) return false
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return nomeDe(c).toLowerCase().indexOf(q) >= 0 || c.wa_id.indexOf(q.replace(/\D/g, '') || '§') >= 0 || (c.profile_label || '').toLowerCase().indexOf(q) >= 0
  })
  const totalNaoLidas = convs.reduce(function(n, c) { return n + (c.status !== 'resolvida' ? c.unread : 0) }, 0)

  if (staff === null) return <div style={{ padding: 24, color: 'var(--muted2)' }}>Carregando…</div>
  if (!staff) return <div style={{ padding: 24, color: 'var(--text)' }}>Este menu é só para a equipe de atendimento.</div>

  return (
    <div style={{ height: 'calc(100vh - 56px)', minHeight: 480, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <style>{`
        .at-wrap { flex: 1; min-height: 0; display: flex; }
        .at-list { width: 340px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; background: var(--surface); }
        .at-chat { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .at-back { display: none; }
        .at-item:hover { background: var(--surface2); }
        .at-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border2); background: var(--surface2); color: var(--text); font-size: 14px; outline: none; font-family: inherit; }
        @media (max-width: 760px) {
          .at-list { width: 100%; border-right: 0; ${sel ? 'display: none;' : ''} }
          .at-chat { ${sel ? '' : 'display: none;'} }
          .at-back { display: inline-flex; }
        }
      `}</style>

      {/* Topo: estado da conexao */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>💬 Atendimento WhatsApp</div>
        {totalNaoLidas > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '2px 8px' }}>{totalNaoLidas} não lida{totalNaoLidas > 1 ? 's' : ''}</span>}
        <div style={{ flex: 1 }} />
        {isAdmin && ferramentas && <button title="Mostra as contas e os IDs dos números que o token enxerga" onClick={async function() {
          try {
            const ids = window.prompt('Cole o ID da conta do WhatsApp (pode colocar mais de um, separados por vírgula). Deixe vazio para tentar automático.', '') || ''
            const r = await fetch('/api/whatsapp/numbers?waba=' + encodeURIComponent(ids), { cache: 'no-store' })
            const j = await r.json().catch(function() { return {} })
            if (!r.ok) { window.alert(j.error || 'Não foi possível listar.'); return }
            const linhas: string[] = ['Em uso agora: número ' + (j.atual.phoneId || '-') + ' · conta ' + (j.atual.waba || '(automática)'), '']
            for (const c of (j.contas || [])) {
              linhas.push('CONTA ' + c.waba + (c.nome ? ' (' + c.nome + ')' : '') + (c.erro ? ' — erro: ' + c.erro : ''))
              for (const n of c.numeros) linhas.push('   número ' + n.numero + (n.nome ? ' · ' + n.nome : '') + '  → ID ' + n.id)
            }
            if (!(j.contas || []).length) linhas.push('Nenhuma conta encontrada. Cole o ID da conta (WABA) quando a janela pedir.')
            window.alert(linhas.join('\n'))
          } catch (e) { window.alert('Sem conexão. Tente de novo.') }
        }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '5px 9px', fontSize: 12, fontWeight: 700 }}>📋 Números</button>}
        {isAdmin && ferramentas && <button title="Liga o webhook à conta do WhatsApp (use depois de trocar o número)" onClick={async function() {
          if (!window.confirm('Ligar o webhook a esta conta do WhatsApp? Use isso depois de trocar o número.')) return
          try {
            const r = await fetch('/api/whatsapp/subscribe', { method: 'POST' })
            const j = await r.json().catch(function() { return {} })
            window.alert(r.ok ? 'Webhook ligado à conta ' + j.waba + '.' + (j.apps && j.apps.length ? '\nApps ligados: ' + j.apps.join(', ') : '') : (j.error || 'Não foi possível ligar.'))
          } catch (e) { window.alert('Sem conexão. Tente de novo.') }
        }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '5px 9px', fontSize: 12, fontWeight: 700 }}>🔗 Ligar webhook</button>}
        {status && !status.connected && <span style={{ fontSize: 12.5, color: '#b45309', fontWeight: 700 }}>🟠 Não conectado</span>}
        {status && status.connected && ferramentas && <span style={{ fontSize: 12.5, color: '#15803d', fontWeight: 700 }}>🟢 Conectado · {status.number}{status.quality ? ' · qualidade ' + status.quality : ''}</span>}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', overflowX: 'auto' }}>
        {([['conversas', '💬 Conversas'], ['atendentes', '👥 Atendentes'], ['modelos', '📄 Modelos'], ['disparo', '📣 Disparo'], ['fluxos', '⚡ Fluxos'], ['conexoes', '🔌 Conexões']] as const).filter(function(t) { return (t[0] !== 'atendentes' && t[0] !== 'fluxos' && t[0] !== 'disparo' && t[0] !== 'conexoes') || isAdmin }).map(function(t) {
          const on = tab === t[0]
          return <button key={t[0]} onClick={function() { setTab(t[0]); if (t[0] === 'modelos') carregarTpls(); if (t[0] === 'disparo') setDisparoAberto(true) }} style={{ cursor: 'pointer', border: 0, borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', background: on ? 'var(--accent-light)' : 'var(--surface2)', color: on ? 'var(--accent)' : 'var(--muted2)' }}>{t[1]}</button>
        })}
      </div>

      {status && !status.connected && (
        <div style={{ margin: 16, padding: 16, borderRadius: 14, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', color: 'var(--text)', fontSize: 13.5, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Falta ligar o número do WhatsApp oficial</div>
          {status.error && <div style={{ marginBottom: 6, color: '#b91c1c' }}>Erro da Meta: {status.error}</div>}
          {status.missing && status.missing.length > 0 && <div>Faltam estas chaves na Vercel: <b>{status.missing.join(', ')}</b>.</div>}
          <div style={{ marginTop: 6 }}>Na Meta (Webhook do WhatsApp), use este endereço de retorno: <b style={{ wordBreak: 'break-all' }}>{status.webhookUrl}</b> e assine o campo <b>messages</b>.</div>
        </div>
      )}

      {tab === 'modelos' && <Modelos isAdmin={isAdmin} tpls={tpls} erro={tplErro} carregando={tplCarregando} onReload={carregarTpls} />}
      {tab === 'atendentes' && isAdmin && <Atendentes />}
      {disparoAberto && isAdmin && <div style={tab === 'disparo' ? { display: 'contents' } : { display: 'none' }}><Disparo tpls={tpls} onLoadTpls={carregarTpls} /></div>}
      {tab === 'fluxos' && isAdmin && <Fluxos />}
      {tab === 'conexoes' && isAdmin && <Conexoes />}

      <div className="at-wrap" style={tab === 'conversas' ? undefined : { display: 'none' }}>
        {/* Lista */}
        <div className="at-list">
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="at-input" placeholder="Buscar nome ou número" value={busca} onChange={function(e) { setBusca(e.target.value) }} />
            {(function() {
              // Estilo Unnichat: dois botoes fixos (Em espera / Minhas) + menu com as demais visoes (so admin)
              const cont = function(k: string) { return convs.filter(function(c) { return c.status !== 'resolvida' && (k === 'todas' ? true : k === 'sem' ? !c.assigned_to : c.assigned_to === k) }).length }
              const nomeFiltro = function(k: string) { return k === 'todas' ? 'Todas' : k === meuId ? 'Minhas' : primeiroNome(k) }
              const emEspera = filtro === 'sem'
              const botao = function(on: boolean): React.CSSProperties { return { cursor: 'pointer', border: 0, borderRadius: 10, padding: '10px 6px', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: on ? '#1f7a5a' : 'var(--surface2)', color: on ? '#fff' : 'var(--muted2)' } }
              const pessoasMenu = pessoas.slice().sort(function(x, y) { return (x.id === meuId ? -1 : 0) - (y.id === meuId ? -1 : 0) })
              return (
                <div style={{ position: 'relative', display: 'flex', gap: 6 }}>
                  <button onClick={function() { setFiltro('sem'); setMenuAberto(false) }} style={{ ...botao(emEspera), flex: 1 }}>Em espera ({cont('sem')})</button>
                  <button onClick={function() { if (emEspera) setFiltro(isAdmin ? 'todas' : meuId); setMenuAberto(false) }} style={{ ...botao(!emEspera), flex: 1 }}>{emEspera ? (isAdmin ? 'Todas' : 'Minhas') + ' (' + cont(isAdmin ? 'todas' : meuId) + ')' : nomeFiltro(filtro) + ' (' + cont(filtro) + ')'}</button>
                  {isAdmin && <button onClick={function() { setMenuAberto(!menuAberto) }} title="Ver por atendente" style={{ ...botao(menuAberto), flex: '0 0 42px', fontSize: 18, padding: '6px 0' }}>☰</button>}
                  {isAdmin && menuAberto && (
                    <>
                      <div onClick={function() { setMenuAberto(false) }} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, width: '100%', maxHeight: 320, overflowY: 'auto', zIndex: 41, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}>
                        {([{ k: 'todas', t: 'Todas as conversas', i: '👥' }] as { k: string; t: string; i: string }[]).concat(pessoasMenu.map(function(pp) { return { k: pp.id, t: pp.id === meuId ? 'Minhas' : (pp.nome || pp.email), i: '👤' } })).map(function(f) {
                          const on = filtro === f.k
                          return (
                            <div key={f.k} onClick={function() { setFiltro(f.k); setMenuAberto(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: on ? 'var(--accent-light)' : undefined, color: 'var(--text)', fontSize: 14, fontWeight: on ? 800 : 600 }}>
                              <span style={{ width: 20, textAlign: 'center' }}>{f.i}</span>
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.t}</span>
                              <span style={{ color: 'var(--muted2)', fontWeight: 700 }}>({cont(f.k)})</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })()}
            <div style={{ display: 'flex', gap: 6 }}>
              {(['abertas', 'resolvidas'] as const).map(function(a) {
                const on = aba === a
                return <button key={a} onClick={function() { setAba(a) }} style={{ flex: 1, cursor: 'pointer', border: 0, borderRadius: 8, padding: '7px 4px', fontWeight: 700, fontSize: 13, background: on ? 'var(--accent-light)' : 'var(--surface2)', color: on ? 'var(--accent)' : 'var(--muted2)' }}>{a === 'abertas' ? 'Abertas' : 'Finalizadas'}</button>
              })}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {lista.length === 0 && <div style={{ padding: 20, fontSize: 13.5, color: 'var(--muted2)', textAlign: 'center' }}>{aba === 'abertas' ? 'Nenhuma conversa aberta.' : 'Nenhuma conversa finalizada.'}</div>}
            {lista.map(function(c) {
              const on = c.id === sel
              return (
                <div key={c.id} className="at-item" onClick={function() { abrir(c) }} style={{ display: 'flex', gap: 10, padding: '11px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: on ? 'var(--accent-light)' : undefined }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#4ade80)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{inicial(c)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: c.unread > 0 ? 800 : 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDe(c)}</div>
                      <div style={{ fontSize: 11.5, color: c.unread > 0 ? '#16a34a' : 'var(--muted2)', flexShrink: 0 }}>{hora(c.last_message_at)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--muted2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_text}</div>
                      {c.unread > 0 && <span style={{ background: '#16a34a', color: '#fff', borderRadius: 999, minWidth: 20, height: 20, padding: '0 6px', fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{c.unread}</span>}
                    </div>
                    {(isAdmin || !c.assigned_to) && <div style={{ fontSize: 11, color: c.assigned_to ? 'var(--muted2)' : '#b45309', fontWeight: 700, marginTop: 2 }}>{c.assigned_to ? '👤 ' + primeiroNome(c.assigned_to) : '⏳ Em espera'}</div>}
                    {c.profile_label && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎓 {c.profile_label}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversa */}
        <div className="at-chat">
          {!atual ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)', fontSize: 14, textAlign: 'center', padding: 20 }}>Escolha uma conversa à esquerda para responder.</div>
          ) : (
            <>
              <div style={{ padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="at-back" onClick={function() { setSel(null) }} style={{ border: 0, background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>←</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDe(atual)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{fmtPhone(atual.wa_id)}{atual.profile_label ? ' · 🎓 ' + atual.profile_label : ''}</div>
                </div>
                {isAdmin && (
                  <select value={atual.assigned_to || ''} onChange={function(e) { atribuir(e.target.value) }} title="Atendente desta conversa" style={{ border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '6px 8px', fontSize: 12.5, fontWeight: 700, maxWidth: 150 }}>
                    <option value="">Em espera</option>
                    {pessoas.map(function(p) { return <option key={p.id} value={p.id}>{p.id === meuId ? 'Eu (' + (p.nome.split(' ')[0] || 'admin') + ')' : (p.nome.split(' ')[0] || p.email)}</option> })}
                  </select>
                )}
                {atual.status === 'resolvida'
                  ? <button onClick={function() { mudarStatus('aberta') }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontWeight: 700, fontSize: 12.5 }}>Reabrir</button>
                  : <button onClick={function() { mudarStatus('resolvida') }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 800, fontSize: 12.5 }}>✓ Finalizar</button>}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {msgs.map(function(m, i) {
                  const novoDia = i === 0 || new Date(msgs[i - 1].created_at).toDateString() !== new Date(m.created_at).toDateString()
                  const meu = m.direction === 'out'
                  if (m.type === 'system') return <div key={m.id} style={{ alignSelf: 'center', textAlign: 'center', fontSize: 12.5, color: 'var(--muted2)', margin: '8px 0', maxWidth: '85%' }}>{m.body}</div>
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      {novoDia && <div style={{ alignSelf: 'center', fontSize: 11.5, color: 'var(--muted2)', background: 'var(--surface2)', borderRadius: 999, padding: '3px 10px', margin: '8px 0' }}>{diaMsg(m.created_at)}</div>}
                      <div style={{ alignSelf: meu ? 'flex-end' : 'flex-start', maxWidth: 'min(78%, 520px)', background: meu ? '#d9fdd3' : 'var(--surface)', color: meu ? '#111b21' : 'var(--text)', border: meu ? 'none' : '1px solid var(--border)', borderRadius: 12, padding: '7px 10px 5px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {meu && !m.sent_by && m.type === 'text' && <div style={{ fontSize: 10.5, fontWeight: 800, opacity: 0.7, marginBottom: 2 }}>🤖 Resposta automática</div>}
                        {meu && m.sent_by && <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75, marginBottom: 3 }}>👤 {nomes[m.sent_by] || 'Atendente'}</div>}
                        <Midia m={m} />
                        {m.type !== 'audio' && m.body && <div>{m.body}</div>}
                        {!m.media_path && m.type !== 'text' && m.type !== 'template' && !m.body && <div style={{ opacity: 0.7 }}>[{m.type}]</div>}
                        <div style={{ fontSize: 10.5, opacity: 0.65, textAlign: 'right', marginTop: 2 }}>{horaMsg(m.created_at)} {meu && <Tick s={m.status} />}</div>
                        {m.status === 'failed' && m.error && <div style={{ fontSize: 11.5, color: '#b91c1c' }}>{m.error}</div>}
                      </div>
                    </div>
                  )
                })}
                <div ref={fim} />
              </div>

              <div style={{ padding: 10, background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                {erro && <div style={{ marginBottom: 8, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>{erro}</div>}
                {!atual.assigned_to && <div style={{ marginBottom: 8, fontSize: 12.5, color: '#b45309', fontWeight: 700 }}>⏳ Esta conversa está em espera. Ao responder, ela fica com você.</div>}
                {janelaAberta ? (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginBottom: 6 }}>Você pode responder por mais ~{horasRestantes}h.</div>
                    {mostrarTpl && <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 10, marginBottom: 8 }}><TemplatePicker tpls={tpls} enviando={enviando} onSend={function(t) { enviar(t) }} /></div>}
                    {gravando ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: '10px 12px' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                        <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Gravando… {Math.floor(segs / 60)}:{String(segs % 60).padStart(2, '0')}</div>
                        <button onClick={function() { pararGravacao(true) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 11px', fontWeight: 700, fontSize: 13 }}>Cancelar</button>
                        <button onClick={function() { pararGravacao(false) }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '7px 13px', fontWeight: 800, fontSize: 13 }}>Enviar áudio</button>
                      </div>
                    ) : (
                      <>
                        {anexo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 10, padding: '7px 10px', marginBottom: 8, fontSize: 13, color: 'var(--text)' }}>
                            <span>📎</span>
                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{anexo.name}</span>
                            <span style={{ color: 'var(--muted2)', fontSize: 12 }}>{anexo.size > 1048576 ? (anexo.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(anexo.size / 1024)) + ' KB'}</span>
                            <button onClick={function() { setAnexo(null) }} style={{ border: 0, background: 'transparent', color: 'var(--muted2)', cursor: 'pointer', fontSize: 16 }}>×</button>
                          </div>
                        )}
                        <textarea className="at-input" rows={2} placeholder={anexo ? 'Legenda (opcional)…' : 'Digite a resposta…'} value={texto} onChange={function(e) { setTexto(e.target.value) }}
                          onKeyDown={function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (anexo) enviarArquivo(anexo, anexo.name, mimeDe(anexo), texto); else enviar() } }} style={{ resize: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <input ref={fileRef} type="file" accept="image/jpeg,image/png,video/mp4,video/3gpp,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" style={{ display: 'none' }} onChange={function(e) { escolherArquivo(e.target.files && e.target.files[0]); e.target.value = '' }} />
                          <button title="Enviar arquivo, foto ou vídeo" onClick={function() { if (fileRef.current) fileRef.current.click() }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 14, fontWeight: 700 }}>📎 Arquivo</button>
                          <button title="Gravar áudio" onClick={iniciarGravacao} disabled={enviando} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 14, fontWeight: 700 }}>🎤 Áudio</button>
                          <button title="Enviar modelo aprovado" onClick={function() { setMostrarTpl(!mostrarTpl) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: mostrarTpl ? 'var(--accent-light)' : 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 14, fontWeight: 700 }}>📄 Modelo</button>
                          <div style={{ flex: 1 }} />
                          <button disabled={enviando || (!texto.trim() && !anexo)} onClick={function() { if (anexo) enviarArquivo(anexo, anexo.name, mimeDe(anexo), texto); else enviar() }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontSize: 14, opacity: enviando || (!texto.trim() && !anexo) ? 0.55 : 1 }}>{enviando ? '…' : 'Enviar'}</button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ background: 'rgba(217,119,6,0.1)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>⏳ Passaram 24 horas desde a última mensagem do aluno.</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 8 }}>Para voltar a falar, escolha um <b>modelo aprovado</b>. Quando o aluno responder, a conversa volta a ficar livre.</div>
                    <TemplatePicker tpls={tpls} enviando={enviando} onSend={function(t) { enviar(t) }} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
