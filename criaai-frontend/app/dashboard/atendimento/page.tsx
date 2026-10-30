'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Modelos, { type Tpl } from '@/components/whatsapp/Modelos'
import TemplatePicker, { type TplSend } from '@/components/whatsapp/TemplatePicker'
import Atendentes from '@/components/whatsapp/Atendentes'
import Fluxos from '@/components/whatsapp/Fluxos'
import Conexoes from '@/components/whatsapp/Conexoes'
import Eventos from '@/components/whatsapp/Eventos'
import Disparo from '@/components/whatsapp/Disparo'
import EditorImagem from '@/components/whatsapp/EditorImagem'
import GerenciarRapidas, { type Rapida } from '@/components/whatsapp/GerenciarRapidas'
import { paraMp3 } from '@/lib/audioMp3'
import { classificar } from '@/lib/waMedia'

type Pessoa = { id: string; nome: string; email: string; admin: boolean; escopo?: string }
// Quem atende aquele chat (admin e 'todos' atendem os dois)
function atendeCanal(p: Pessoa, rec: boolean): boolean { return p.admin || p.escopo === 'todos' || (p.escopo === 'recuperacao') === rec }
type Conv = { profile_id?: string | null; connection_id: string | null; id: string; assigned_to: string | null; wa_id: string; name: string | null; profile_label: string | null; status: string; unread: number; last_text: string | null; last_message_at: string; last_inbound_at: string | null; ia_ativa?: boolean; ia_humano?: boolean }
type Msg = { wa_message_id?: string | null; reply_to_wa_id?: string | null; id: string; conversation_id: string; direction: 'in' | 'out'; sent_by?: string | null; type: string; body: string | null; media_path: string | null; mime: string | null; status: string; error: string | null; created_at: string; template?: { name: string; language: string; params: string[] } | null }
type Status = { connected: boolean; missing?: string[]; webhookUrl?: string; number?: string; name?: string; quality?: string; error?: string }

// Mensagens prontas do chat de recuperacao: um clique e ja envia
// Mensagens salvas do chat de SUPORTE (um clique envia na hora)
const RAPIDAS_SUPORTE: { titulo: string; texto: string }[] = [
  { titulo: '01 · Acesso às aulas', texto: 'Link da Plataforma: https://www.mcpia.site/login\n\nO acesso às aulas é aqui através dessa plataforma Nova, Basta fazer o cadastro com o mesmo e-mail que você comprou a mentoria.' },
]

const RAPIDAS: { titulo: string; texto: string }[] = [
  { titulo: 'Link da plataforma', texto: 'Só acessar!\n\nhttps://www.mcpia.site/login' },
  { titulo: 'Acesso Hubla', texto: 'Agora você vai receber um e-mail da Hubla:\n\nAbre o e-mail e você vai conseguir acessar Área de membros pra começar.\n\nAssim que acessar me confirma aqui se deu certinho.\n\nAproveita e já entro no nosso grupo:' },
  { titulo: 'Grupo de avisos e suporte', texto: 'Grupo de avisos\n\nhttps://chat.whatsapp.com/EQOJkJWilLjES81OIl6UWg\n\nSuporte\n\nhttps://wa.me/553791348869' },
  { titulo: 'Pagamento', texto: 'Ele expira daqui a pouco\n\nAssim que você finalizar o pagamento me avisa aqui' },
]

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
const CORES_AVATAR = ['linear-gradient(135deg,#16a34a,#4ade80)', 'linear-gradient(135deg,#2563eb,#60a5fa)', 'linear-gradient(135deg,#7c3aed,#a78bfa)', 'linear-gradient(135deg,#db2777,#f472b6)', 'linear-gradient(135deg,#ea580c,#fb923c)', 'linear-gradient(135deg,#0d9488,#2dd4bf)', 'linear-gradient(135deg,#ca8a04,#facc15)', 'linear-gradient(135deg,#475569,#94a3b8)']
function corAvatar(c: Conv): string { let h = 0; const t = String(c.wa_id || c.id); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return CORES_AVATAR[h % CORES_AVATAR.length] }
// Emojis para as mensagens (escolhe e entra no texto, na posicao do cursor)
const EMOJIS: { nome: string; icone: string; lista: string[] }[] = [
  { nome: 'Carinhas', icone: '😀', lista: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤗', '🤔', '😮', '😢', '😭', '😇', '🥳', '😴'] },
  { nome: 'Mãos', icone: '🙏', lista: ['🙏', '👍', '👏', '🙌', '🤝', '💪', '👌', '✌️', '🤞', '👋', '🤙', '👇', '👉', '👆', '☝️', '🫶', '🤲'] },
  { nome: 'Fé e corações', icone: '❤️', lista: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💖', '💕', '✝️', '🕊️', '🙏', '✨', '🌟', '🌈', '🔥', '🌹', '📖', '😇', '🎉'] },
  { nome: 'Natureza e comida', icone: '🌿', lista: ['🌿', '🌱', '🌳', '🌴', '🌸', '🌻', '🌼', '🍀', '☀️', '🌙', '⭐', '☁️', '🌧️', '🐶', '🐱', '🐑', '🦋', '🐦', '🍎', '🍌', '🍇', '🍓', '🍞', '🥖', '🍰', '🍫', '☕', '🍕', '🍔', '🥗', '🍽️', '🥤'] },
  { nome: 'Pessoas e lugares', icone: '👨‍👩‍👧', lista: ['👨‍👩‍👧', '👪', '👶', '🧒', '👧', '👦', '👩', '👨', '👵', '👴', '🤰', '🙋‍♀️', '🙋‍♂️', '💁‍♀️', '🤷‍♀️', '🏠', '⛪', '🏫', '🏥', '🏢', '🚗', '✈️', '🚌', '🗺️', '🎉', '🎂', '🎈', '🎶', '📖', '📚', '✏️', '🏆'] },
  { nome: 'Outros', icone: '✅', lista: ['✅', '❌', '⚠️', '❗', '❓', '⏰', '📅', '📱', '💻', '🔗', '🔒', '🔑', '💰', '💵', '🎁', '🚀', '📌', '📞', '💬', '🎓', '📚', '🛒', '👉', '⭐'] },
]

function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [cat, setCat] = useState(0)
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {EMOJIS.map(function(g, i) {
          return <button key={g.nome} type="button" title={g.nome} onClick={function() { setCat(i) }} style={{ cursor: 'pointer', border: 0, borderRadius: 8, padding: '4px 9px', fontSize: 18, background: i === cat ? 'var(--accent-light)' : 'transparent' }}>{g.icone}</button>
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, maxHeight: 132, overflowY: 'auto' }}>
        {EMOJIS[cat].lista.map(function(e, i) {
          return <button key={e + i} type="button" onClick={function() { onPick(e) }} style={{ cursor: 'pointer', border: 0, background: 'transparent', borderRadius: 8, width: 38, height: 38, fontSize: 22, lineHeight: 1 }}>{e}</button>
        })}
      </div>
    </div>
  )
}

// Papel de parede do conversa (desenhos em linha, no estilo do WhatsApp): versao clara e escura
function papelDeParede(traco: string, opac: string): string {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260" fill="none" stroke="' + traco + '" stroke-opacity="' + opac + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<g transform="translate(18,20) scale(1.5)"><path d="M12 21s-7-4.4-9.3-9C1 8.5 3 5 6.3 5 8.4 5 10.5 6.2 12 8.3 13.5 6.2 15.6 5 17.7 5 21 5 23 8.5 21.3 12c-2.3 4.6-9.3 9-9.3 9z"/></g>'
    + '<g transform="translate(112,14) scale(1.4)"><path d="M12 3v18M6 9h12"/></g>'
    + '<g transform="translate(190,26) rotate(12) scale(1.4)"><polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9"/></g>'
    + '<g transform="translate(40,100) rotate(-8) scale(1.5)"><path d="M3 5h18v11H10l-5 4v-4H3z"/></g>'
    + '<g transform="translate(130,92) scale(1.5)"><path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14"/></g>'
    + '<g transform="translate(205,110) rotate(10) scale(1.4)"><circle cx="12" cy="12" r="9"/><path d="M8 14c1.2 2 6.8 2 8 0M9 9.5v.5M15 9.5v.5"/></g>'
    + '<g transform="translate(20,185) scale(1.5)"><path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19L14 10"/></g>'
    + '<g transform="translate(105,180) rotate(-10) scale(1.5)"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></g>'
    + '<g transform="translate(190,190) scale(1.5)"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></g>'
    + '</svg>'
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'
}
const PAPEL_CLARO = papelDeParede('#8a7b5f', '0.10')
const PAPEL_ESCURO = papelDeParede('#ffffff', '0.03')

function Avatar({ c, size }: { c: Conv; size: number }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: corAvatar(c), color: '#fff', fontWeight: 800, fontSize: Math.round(size * 0.42), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }}>{inicial(c)}</div>
}
function inicial(c: Conv): string { return (nomeDe(c).replace(/[^A-Za-zÀ-ú0-9]/g, '')[0] || '?').toUpperCase() }

function Tick({ s }: { s: string }) {
  if (s === 'failed') return <span title="Falhou" style={{ color: '#ef4444' }}>⚠</span>
  if (s === 'sending') return <span title="Enviando" style={{ opacity: 0.6 }}>🕓</span>
  if (s === 'read') return <span style={{ color: '#34b7f1' }}>✓✓</span>
  if (s === 'delivered') return <span style={{ opacity: 0.6 }}>✓✓</span>
  return <span style={{ opacity: 0.6 }}>✓</span>
}

// Links dentro das mensagens: clicaveis, com previa (titulo e descricao do site) logo abaixo
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi
function limpaUrl(u: string): { url: string; resto: string } {
  const m = /[.,;:!?)\]]+$/.exec(u)
  return m ? { url: u.slice(0, u.length - m[0].length), resto: m[0] } : { url: u, resto: '' }
}
function acharLinks(t: string | null): string[] {
  if (!t) return []
  const out: string[] = []
  const partes = t.split(URL_RE)
  for (let i = 1; i < partes.length; i += 2) {
    const u = limpaUrl(partes[i]).url
    if (u && out.indexOf(u) < 0) out.push(u)
  }
  return out.slice(0, 2)
}
function Texto({ t }: { t: string }) {
  const partes = t.split(URL_RE)
  return (
    <>
      {partes.map(function(p, i) {
        if (i % 2 === 1) {
          const l = limpaUrl(p)
          const href = /^www\./i.test(l.url) ? 'https://' + l.url : l.url
          return <span key={i}><a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#0b57d0', textDecoration: 'underline', wordBreak: 'break-all' }}>{l.url}</a>{l.resto}</span>
        }
        return <span key={i}>{p}</span>
      })}
    </>
  )
}
const prevCache: Record<string, { url: string; domain: string; title: string; description: string } | null> = {}
function LinkPrev({ url }: { url: string }) {
  const [p, setP] = useState<{ url: string; domain: string; title: string; description: string } | null | undefined>(prevCache[url])
  useEffect(function() {
    if (prevCache[url] !== undefined) { setP(prevCache[url]); return }
    let vivo = true
    fetch('/api/whatsapp/link-preview?u=' + encodeURIComponent(url))
      .then(function(r) { return r.json() })
      .then(function(j) { prevCache[url] = j && j.preview ? j.preview : null; if (vivo) setP(prevCache[url]) })
      .catch(function() {})
    return function() { vivo = false }
  }, [url])
  if (!p) return null
  const href = /^www\./i.test(url) ? 'https://' + url : url
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid #16a34a', background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: '6px 10px', marginTop: 6, maxWidth: 360 }}>
      <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 700 }}>🔗 {p.domain}</div>
      {p.title && <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.25, marginTop: 1 }}>{p.title}</div>}
      {p.description && <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.3, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{p.description}</div>}
    </a>
  )
}

function Midia({ m, onFoto }: { m: Msg; onFoto: (src: string) => void }) {
  if (!m.media_path) return null
  const src = '/api/whatsapp/media?m=' + m.id
  if (String(m.mime || '').toLowerCase().split(';')[0].trim() === 'application/pdf') {
    return (
      <div style={{ marginBottom: m.body ? 6 : 0 }}>
        <iframe src={src + '&inline=1#toolbar=0&navpanes=0&view=FitH'} loading="lazy" title="Prévia do PDF" style={{ display: 'block', width: 'min(380px, 68vw)', height: 250, border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, background: '#fff' }} />
        <a href={src} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 4, color: 'inherit', fontWeight: 700, fontSize: 13 }}>📎 Abrir PDF em outra aba</a>
      </div>
    )
  }
  if (m.type === 'image' || m.type === 'sticker') return <img src={src} alt="Imagem" loading="lazy" decoding="async" onClick={function() { onFoto(src) }} style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, display: 'block', marginBottom: m.body ? 6 : 0, cursor: 'zoom-in' }} />
  if (m.type === 'audio') return <audio controls preload="none" src={src} style={{ maxWidth: '100%', height: 36 }} />
  if (m.type === 'video') return <video controls preload="metadata" src={src} style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8 }} />
  return <a href={src} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>📎 Abrir arquivo</a>
}

export default function AtendimentoPage() {
  const supabase = createClient()
  const [convs, setConvs] = useState<Conv[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [aba, setAba] = useState<'abertas' | 'naolidas' | 'resolvidas'>('abertas')
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [status, setStatus] = useState<Status | null>(null)
  const [staff, setStaff] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [iaGeral, setIaGeral] = useState(false)
  const [tab, setTab] = useState<'conversas' | 'atendentes' | 'modelos' | 'disparo' | 'fluxos' | 'eventos' | 'conexoes'>('conversas')
  const [tpls, setTpls] = useState<Tpl[] | null>(null)
  const [disparoAberto, setDisparoAberto] = useState(false)
  const [tplErro, setTplErro] = useState('')
  const [tplCarregando, setTplCarregando] = useState(false)
  const [mostrarTpl, setMostrarTpl] = useState(false)
  const [mostrarEmoji, setMostrarEmoji] = useState(false)
  const [anexo, setAnexo] = useState<File | null>(null)
  const [gravando, setGravando] = useState(false)
  const [segs, setSegs] = useState(0)
  const recRef = useRef<MediaRecorder | null>(null)
  const recCancel = useRef(false)
  const recTimer = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)
  const arrasteN = useRef(0)
  const [rapidasDb, setRapidasDb] = useState<{ suporte: Rapida[] | null; recuperacao: Rapida[] | null }>({ suporte: null, recuperacao: null })
  const [gerRapidas, setGerRapidas] = useState(false)
  const [editorImg, setEditorImg] = useState<Blob | null>(null)
  const [ferramentas, setFerramentas] = useState(false)
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [meuId, setMeuId] = useState('')
  const [canal, setCanal] = useState<'suporte' | 'recuperacao'>('suporte')
  const [escopo, setEscopo] = useState<string>('suporte')
  const [canais, setCanais] = useState<{ id: string; nome: string; numero: string | null }[]>([])
  const [tplsRec, setTplsRec] = useState<Tpl[] | null>(null)
  const [filtro, setFiltro] = useState<string>('todas')
  const [menuAberto, setMenuAberto] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const filaEnvio = useRef<Promise<void>>(Promise.resolve())
  const [modoSel, setModoSel] = useState(false)
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({})
  const [destino, setDestino] = useState('__')
  const [acaoRodando, setAcaoRodando] = useState(false)
  const [acaoMsg, setAcaoMsg] = useState('')
  useEffect(function() { setModoSel(false); setMarcadas({}) }, [canal, aba])
  const selRef = useRef<string | null>(null)
  selRef.current = sel
  const cacheMsgs = useRef<Record<string, Msg[]>>({})

  const carregarConvs = useCallback(async function() {
    // Suporte e recuperacao buscados separados, para um nao empurrar o outro para fora do limite
    const [a, b] = await Promise.all([
      supabase.from('wa_conversations').select('*').is('connection_id', null).order('last_message_at', { ascending: false }).limit(300),
      supabase.from('wa_conversations').select('*').not('connection_id', 'is', null).order('last_message_at', { ascending: false }).limit(300),
    ])
    if (!a.error && a.data) {
      const todas = (a.data as Conv[]).concat(!b.error && b.data ? (b.data as Conv[]) : [])
      // Chat aberto pela aba Eventos pode ser mais antigo que o limite da lista: nao deixa sumir
      const aberta = selRef.current
      if (aberta && !todas.some(function(x) { return x.id === aberta })) {
        const um = await supabase.from('wa_conversations').select('*').eq('id', aberta).maybeSingle()
        if (um.data) todas.push(um.data as Conv)
      }
      setConvs(todas)
    }
  }, [])

  const carregarMsgs = useCallback(async function(id: string, descartar?: string) {
    const r = await supabase.from('wa_messages').select('id, conversation_id, direction, sent_by, type, body, media_path, mime, status, error, created_at, wa_message_id, reply_to_wa_id, template').eq('conversation_id', id).order('created_at', { ascending: true }).limit(500)
    if (!r.error && r.data && selRef.current === id) {
      const reais = r.data as Msg[]
      // Mantem as mensagens ainda "enviando" (provisorias), sem duplicar as que ja chegaram do banco
      cacheMsgs.current[id] = reais
      setMsgs(function(old) {
        const usadas: Record<string, boolean> = {}
        const pend = old.filter(function(m) {
          if (m.id.indexOf('tmp-') !== 0 || m.conversation_id !== id || m.id === descartar) return false
          const t = new Date(m.created_at).getTime() - 10000
          const par = reais.find(function(x) { return !usadas[x.id] && x.direction === 'out' && x.type === 'text' && x.body === m.body && new Date(x.created_at).getTime() >= t && x.sent_by })
          if (par) { usadas[par.id] = true; return false }
          return true
        })
        return pend.length ? reais.concat(pend) : reais
      })
    }
  }, [])

  const carregarTpls = useCallback(async function(fresh?: boolean) {
    setTplCarregando(true)
    try {
      const r = await fetch('/api/whatsapp/templates' + (fresh === true ? '?fresh=1' : ''), { cache: 'no-store' })
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
      // getSession le o login guardado no aparelho (sem ida ao servidor); o acesso de verdade e checado pelo banco
      const { data: { session } } = await supabase.auth.getSession()
      const user = session ? session.user : null
      if (!user) { setStaff(false); return }
      setMeuId(user.id)
      // Tudo ao mesmo tempo (antes era um depois do outro). A lista de conversas ja sai junto: o banco so entrega o que a pessoa pode ver.
      carregarConvs()
      const [p, s, esc] = await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
        supabase.rpc('wa_is_staff'),
        supabase.rpc('wa_meu_escopo'),
      ])
      const admin = !!(p.data as any)?.is_admin
      setIsAdmin(admin)
      if (!admin) setFiltro('sem')
      if (admin) supabase.rpc('wa_assignable').then(function(pe) { if (!pe.error && pe.data) setPessoas(pe.data as any) })
      setStaff(s.data === true)
      if (s.data === true) {
        supabase.rpc('wa_staff_names').then(function(r) {
          if (!r.error && r.data) { const m: Record<string, string> = {}; for (const x of (r.data as any[])) m[x.id] = String(x.nome || '').trim().split(/\s+/).slice(0, 2).join(' '); setNomes(m) }
        })
        const meuEscopo = String(esc.data || 'suporte')
        setEscopo(meuEscopo)
        if (meuEscopo === 'recuperacao') setCanal('recuperacao')
        if (meuEscopo !== 'recuperacao') carregarTpls()
        supabase.rpc('wa_canais').then(function(r) { if (!r.error && r.data) setCanais(r.data as any) })
        fetch('/api/whatsapp/status').then(function(r) { return r.json() }).then(setStatus).catch(function() {})
      }
    })()
  }, [])

  // Tempo real. Mensagem nova so recarrega a conversa aberta; a lista so recarrega quando uma conversa muda.
  // Atualizacao de seguranca a cada 60s (so com a aba visivel) e ao voltar para a aba.
  useEffect(function() {
    if (!staff) return
    let tl: any = null
    let tm: any = null
    const lista = function() {
      if (tl) return
      tl = setTimeout(function() { tl = null; carregarConvs() }, 500)
    }
    const abertas = function() {
      if (tm) return
      tm = setTimeout(function() { tm = null; if (selRef.current) carregarMsgs(selRef.current) }, 300)
    }
    const ch = supabase.channel('wa-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_messages' }, function(p: any) {
        const cid = (p && (p.new?.conversation_id || p.old?.conversation_id)) || ''
        if (!cid || cid === selRef.current) abertas()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversations' }, function(p: any) {
        lista()
        const cid = (p && (p.new?.id || p.old?.id)) || ''
        if (cid && cid === selRef.current) abertas()
      })
      .subscribe()
    const tudo = function() { lista(); abertas() }
    const iv = setInterval(function() { if (document.visibilityState === 'visible') tudo() }, 60000)
    const vis = function() { if (document.visibilityState === 'visible') tudo() }
    document.addEventListener('visibilitychange', vis)
    return function() { clearInterval(iv); document.removeEventListener('visibilitychange', vis); if (tl) clearTimeout(tl); if (tm) clearTimeout(tm); supabase.removeChannel(ch) }
  }, [staff])

  useEffect(function() { if (fim.current) fim.current.scrollIntoView({ block: 'end' }) }, [msgs.length, sel])

  async function abrir(c: Conv) {
    setSel(c.id); setMsgs(cacheMsgs.current[c.id] || []); setErro(''); setTexto('')
    selRef.current = c.id
    await carregarMsgs(c.id)
    if (c.unread > 0 && c.assigned_to) {
      setConvs(function(l) { return l.map(function(x) { return x.id === c.id ? { ...x, unread: 0 } : x }) })
      fetch('/api/whatsapp/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: c.id }) }).catch(function() {})
    }
  }

  // Deixa a conversa como "nao lida" de novo (fica em destaque na lista ate alguem abrir)
  async function marcarNaoLida(id: string) {
    const r = await supabase.rpc('wa_mark_unread', { p_conv: id })
    if (r.error) { setErro('Não foi possível marcar como não lida.'); return }
    setConvs(function(l) { return l.map(function(x) { return x.id === id ? { ...x, unread: Math.max(1, x.unread || 0) } : x }) })
    if (selRef.current === id) { setSel(null); selRef.current = null }
  }

  // Vem da aba Eventos: abre o chat de recuperacao da pessoa
  async function abrirDeEvento(id: string) {
    let c = convs.find(function(x) { return x.id === id }) || null
    if (!c) {
      const r = await supabase.from('wa_conversations').select('*').eq('id', id).maybeSingle()
      if (r.error || !r.data) return
      c = r.data as Conv
      const nova = c
      setConvs(function(l) { return l.some(function(x) { return x.id === id }) ? l : l.concat([nova]) })
    }
    setCanal(c.connection_id ? 'recuperacao' : 'suporte')
    setAba(c.status === 'resolvida' ? 'resolvidas' : 'abertas')
    setFiltro('todas'); setBusca('')
    setTab('conversas')
    await abrir(c)
  }

  const atual = convs.find(function(c) { return c.id === sel }) || null
  const atualConexao = atual ? atual.connection_id : null
  // Dados do aluno (plano e dia da compra), buscados na hora para sempre estarem atualizados
  const [foto, setFoto] = useState<string | null>(null)
  const [respondendo, setRespondendo] = useState<Msg | null>(null)
  useEffect(function() {
    if (!foto) return
    const k = function(e: KeyboardEvent) { if (e.key === 'Escape') setFoto(null) }
    window.addEventListener('keydown', k)
    return function() { window.removeEventListener('keydown', k) }
  }, [foto])
  useEffect(function() { setRespondendo(null) }, [sel])
  const resumo = function(m: Msg): string { return m.body ? m.body : m.type === 'image' ? '📷 Foto' : m.type === 'audio' ? '🎤 Áudio' : m.type === 'video' ? '🎬 Vídeo' : m.type === 'document' ? '📎 Arquivo' : '[' + m.type + ']' }
  const [info, setInfo] = useState<{ plano: string | null; cadastro_em: string | null; reembolso_em: string | null } | null>(null)
  const [compra, setCompra] = useState<{ comprou_em: string | null; produto: string | null; cat: string | null; por: string | null } | null>(null)
  const perfilAtual = atual ? atual.profile_id || '' : ''
  const waAtual = atual ? atual.wa_id : ''
  const nomeAtual = atual ? (atual.name || '') : ''
  useEffect(function() {
    setInfo(null); setCompra(null)
    if (!waAtual) return
    let vivo = true
    if (perfilAtual) supabase.rpc('wa_aluno_info', { p_id: perfilAtual }).then(function(r) { if (vivo && !r.error && r.data) setInfo(r.data as any) })
    supabase.rpc('wa_compra', { p_wa: waAtual, p_profile: perfilAtual || null, p_name: nomeAtual || null }).then(function(r) { if (vivo && !r.error && r.data) setCompra(r.data as any) })
    return function() { vivo = false }
  }, [perfilAtual, waAtual, nomeAtual])
  const fmtDia = function(iso: string | null) { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) } catch (e) { return '' } }
  useEffect(function() {
    if (!atualConexao) return
    setTplsRec(null)
    fetch('/api/whatsapp/templates?connection=' + atualConexao, { cache: 'no-store' }).then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) }).then(function(x) { setTplsRec(x.ok ? (x.j.templates || []) : []) }).catch(function() { setTplsRec([]) })
  }, [atualConexao])
  const tplsDaConversa = atualConexao ? tplsRec : tpls
  const janelaAberta = !!(atual && atual.last_inbound_at && Date.now() - new Date(atual.last_inbound_at).getTime() < WIN)
  const canalConv: 'suporte' | 'recuperacao' = atual && atual.connection_id ? 'recuperacao' : 'suporte'
  const carregarRapidas = useCallback(async function(c: 'suporte' | 'recuperacao') {
    try {
      const r = await fetch('/api/whatsapp/rapidas?canal=' + c, { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (r.ok && Array.isArray(j.rapidas)) setRapidasDb(function(x) { return { ...x, [c]: j.rapidas } })
    } catch (e) {}
  }, [])
  useEffect(function() { if (atual) carregarRapidas(canalConv) }, [atual ? atual.id : '', canalConv])

  // Soltar um arquivo fora da conversa nao pode abrir o arquivo no navegador (perderia a tela)
  useEffect(function() {
    const bloqueia = function(e: DragEvent) {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0) e.preventDefault()
    }
    window.addEventListener('dragover', bloqueia)
    window.addEventListener('drop', bloqueia)
    return function() { window.removeEventListener('dragover', bloqueia); window.removeEventListener('drop', bloqueia) }
  }, [])

  // Ctrl+V com um print copiado: abre a tela de envio (so quando da para responder)
  useEffect(function() {
    const onPaste = function(e: ClipboardEvent) {
      if (!atual || !janelaAberta || editorImg || gerRapidas) return
      const t = e.target as HTMLElement | null
      const campoOutro = !!t && (t.tagName === 'INPUT' || (t.tagName === 'TEXTAREA' && !t.dataset.msg))
      if (campoOutro) return
      const itens = e.clipboardData ? Array.from(e.clipboardData.items) : []
      const it = itens.find(function(x) { return x.kind === 'file' && /^image\/(png|jpeg)$/.test(x.type) })
      const f = it ? it.getAsFile() : null
      if (!f) return
      e.preventDefault()
      setErro('')
      setEditorImg(f)
    }
    document.addEventListener('paste', onPaste)
    return function() { document.removeEventListener('paste', onPaste) }
  }, [atual ? atual.id : '', janelaAberta, editorImg, gerRapidas])

  // Botao "Colar print" (celular ou quando o Ctrl+V nao funciona)
  async function colarDaAreaDeTransferencia() {
    setErro('')
    try {
      const itens = await (navigator as any).clipboard.read()
      for (const it of itens) {
        const tipo = (it.types as string[]).find(function(t) { return t === 'image/png' || t === 'image/jpeg' })
        if (tipo) { setEditorImg(await it.getType(tipo)); return }
      }
      setErro('Não há nenhum print copiado. Tire o print (ou copie uma imagem) e tente de novo.')
    } catch (e) {
      setErro('Não consegui ler o que foi copiado. Clique no campo de mensagem e use Ctrl+V.')
    }
  }

  function usarRapida(r: { texto: string }) {
    const primeiro = (atual && atual.name ? atual.name : '').trim().split(/\s+/)[0] || ''
    const txt = r.texto.indexOf('{{nome}}') >= 0 ? r.texto.split('{{nome}}').join(primeiro).replace(/\s+([,.!?])/g, '$1') : r.texto
    enviar(undefined, txt)
  }
  const horasRestantes = atual && atual.last_inbound_at ? Math.max(0, Math.ceil((WIN - (Date.now() - new Date(atual.last_inbound_at).getTime())) / 3600000)) : 0

  // Texto e mensagens prontas: aparece na hora no chat e o envio acontece por tras (em fila, para manter a ordem)
  function enviar(modelo?: TplSend, pronto?: string) {
    if (!atual) return
    if (modelo) { enviarModelo(modelo); return }
    const conv = atual.id
    const corpo = pronto ? pronto : texto.trim()
    if (!corpo) return
    setErro('')
    const citar = !pronto && respondendo && respondendo.wa_message_id ? respondendo.wa_message_id : undefined
    const tmpId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
    const tmp: Msg = { id: tmpId, conversation_id: conv, direction: 'out', sent_by: meuId || null, type: 'text', body: corpo, media_path: null, mime: null, status: 'sending', error: null, created_at: new Date().toISOString(), reply_to_wa_id: citar || null }
    setMsgs(function(l) { return l.concat([tmp]) })
    if (!pronto) { setTexto(''); setRespondendo(null) }
    const body: any = { conversationId: conv, text: corpo }
    if (citar) body.replyTo = citar
    function falhou(msg: string) {
      setMsgs(function(l) { return l.filter(function(m) { return m.id !== tmpId }) })
      if (selRef.current === conv) {
        setErro(msg)
        if (!pronto) setTexto(function(t) { return t ? t : corpo })
      }
    }
    filaEnvio.current = filaEnvio.current.then(async function() {
      try {
        const r = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const j = await r.json().catch(function() { return {} })
        if (!r.ok) { falhou(j.error || 'Nao foi possivel enviar.'); return }
        fetch('/api/whatsapp/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: conv }) }).catch(function() {})
        await carregarMsgs(conv, tmpId)
        carregarConvs()
      } catch (e) { falhou('Sem conexao. Tente de novo.') }
    })
  }

  // Reenvia uma mensagem que falhou (texto ou modelo)
  function reenviar(m: Msg) {
    if (!atual || enviando) return
    setErro('')
    if (m.type === 'template') {
      if (m.template && m.template.name) {
        enviarModelo({ name: m.template.name, language: m.template.language || 'pt_BR', params: m.template.params || [], preview: String(m.body || '').replace(/^📄\s*/, '') })
      } else {
        setErro('Não guardei os dados deste modelo. Escolha o modelo de novo no botão de modelos, ao lado do campo de mensagem.')
        setMostrarTpl(true)
      }
      return
    }
    if (m.type === 'text' && m.body) { enviar(undefined, m.body); return }
    setErro('Este tipo de mensagem não dá para reenviar por aqui. Envie o arquivo de novo.')
  }

  async function enviarModelo(modelo: TplSend) {
    if (!atual || enviando) return
    setErro('')
    const body: any = { conversationId: atual.id }
    body.template = { name: modelo.name, language: modelo.language, params: modelo.params, preview: modelo.preview }
    setEnviando(true)
    try {
      const r = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Nao foi possivel enviar.')
      else { setTexto(''); setRespondendo(null); setMostrarTpl(false); fetch('/api/whatsapp/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: atual.id }) }).catch(function() {}); await carregarMsgs(atual.id); carregarConvs() }
    } catch (e) { setErro('Sem conexao. Tente de novo.') }
    setEnviando(false)
  }

  function mimeDe(f: File): string {
    if (f.type === 'application/json' || /\.json$/i.test(f.name)) return 'text/plain'
    if (f.type) return f.type
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    const m: Record<string, string> = { pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', doc: 'application/msword', xls: 'application/vnd.ms-excel', ppt: 'application/vnd.ms-powerpoint',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', amr: 'audio/amr', mp4: 'video/mp4', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }
    return m[ext] || ''
  }

  // Arrastar e soltar um arquivo na conversa (so quando da para responder)
  function temArquivo(e: React.DragEvent): boolean {
    return !!e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0
  }
  function soltarArquivo(e: React.DragEvent) {
    if (!temArquivo(e)) return
    e.preventDefault()
    arrasteN.current = 0
    setArrastando(false)
    if (!atual) return
    if (!janelaAberta) { setErro('Passaram 24 horas desde a última mensagem do aluno. Envie um modelo aprovado antes de mandar arquivo.'); return }
    if (editorImg || enviando) return
    const lista = e.dataTransfer.files
    if (!lista || lista.length === 0) return
    if (lista.length > 1) setErro('Solte um arquivo por vez. Peguei o primeiro.')
    escolherArquivo(lista[0])
  }

  function escolherArquivo(f: File | null | undefined) {
    if (!f) return
    setErro('')
    const c = classificar(mimeDe(f))
    if ('erro' in c) { setErro(c.erro); return }
    if (f.size > c.max) { setErro('Arquivo grande demais (máximo ' + Math.round(c.max / 1048576) + ' MB para este tipo).'); return }
    // Foto/print: abre a tela de envio onde da para rabiscar e escrever a legenda
    if (/^image\/(jpeg|png)$/.test(mimeDe(f))) { setEditorImg(f); return }
    setAnexo(f)
  }

  // Envia um arquivo (ou audio gravado): sobe direto ao armazenamento e depois manda pelo WhatsApp
  async function enviarArquivo(file: Blob, nome: string, mime: string, legenda: string): Promise<boolean> {
    if (!atual || enviando) return false
    setEnviando(true); setErro('')
    let ok = false
    try {
      const u = await fetch('/api/whatsapp/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: atual.id, filename: nome, mime, size: file.size }) })
      const uj = await u.json().catch(function() { return {} })
      if (!u.ok) { setErro(uj.error || 'Não foi possível preparar o envio.'); setEnviando(false); return false }
      const up = await supabase.storage.from('wa-media').uploadToSignedUrl(uj.path, uj.token, file, { contentType: mime })
      if (up.error) { setErro('Não foi possível enviar o arquivo. Tente de novo.'); setEnviando(false); return false }
      const r = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: atual.id, replyTo: respondendo && respondendo.wa_message_id ? respondendo.wa_message_id : undefined, media: { path: uj.path, mime, filename: nome, caption: legenda } }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível enviar.')
      else { ok = true; setTexto(''); setAnexo(null); setRespondendo(null); fetch('/api/whatsapp/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: atual.id }) }).catch(function() {}); await carregarMsgs(atual.id); carregarConvs() }
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
    setEnviando(false)
    return ok
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

  // Coloca o emoji no texto, onde esta o cursor (ou no fim)
  function inserirEmoji(e: string) {
    const t = document.querySelector('textarea.at-input[data-msg="1"]') as HTMLTextAreaElement | null
    const ini = t && typeof t.selectionStart === 'number' ? t.selectionStart : texto.length
    const fim2 = t && typeof t.selectionEnd === 'number' ? t.selectionEnd : texto.length
    setTexto(texto.slice(0, ini) + e + texto.slice(fim2))
    const pos = ini + e.length
    setTimeout(function() { const x = document.querySelector('textarea.at-input[data-msg="1"]') as HTMLTextAreaElement | null; if (x) { x.focus(); try { x.setSelectionRange(pos, pos) } catch (err) {} } }, 0)
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
  // O assistente responde nesta conversa se foi ligado nela, ou se esta ligado para todas e ela nao foi desligada
  function iaOn(c: Conv | null | undefined): boolean { return !!c && (c.ia_ativa === true || (iaGeral && c.ia_humano !== true)) }
  useEffect(function() {
    fetch('/api/whatsapp/ia', { cache: 'no-store' }).then(function(r) { return r.ok ? r.json() : null }).then(function(j) { if (j && typeof j.geral === 'boolean') setIaGeral(j.geral) }).catch(function() {})
  }, [])
  async function alternarIAGeral() {
    if (!isAdmin) return
    const novo = !iaGeral
    const aviso = novo
      ? 'Ligar o assistente de IA em TODAS as conversas (suporte e recuperação, inclusive as novas)? Ele passa a responder sozinho. Se alguém da equipe responder uma conversa, ele deixa a equipe seguir por 12 horas. Você pode desligar em uma conversa específica quando quiser.'
      : 'Desligar o assistente de IA geral? As conversas em que você ligou o assistente manualmente continuam com ele.'
    if (!window.confirm(aviso)) return
    setErro('')
    try {
      const r = await fetch('/api/whatsapp/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geral: novo }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível mudar o assistente geral.')
      else setIaGeral(novo)
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
  }
  // Assistente de IA: so o admin liga/desliga (o servidor tambem confere)
  async function alternarIA(ids: string[], ativo: boolean) {
    if (!isAdmin || ids.length === 0) return
    setErro('')
    setConvs(function(l) { return l.map(function(x) { return ids.indexOf(x.id) >= 0 ? { ...x, ia_ativa: ativo, ia_humano: !ativo } : x }) })
    try {
      const r = await fetch('/api/whatsapp/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, ativo }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) { setErro(j.error || 'Não foi possível mudar o assistente.'); await carregarConvs() }
    } catch (e) { setErro('Sem conexão. Tente de novo.'); await carregarConvs() }
  }
  // Acoes em massa: vale so para as conversas que estao na lista (e marcadas) neste momento
  async function acaoMassa(tipo: 'finalizar' | 'reabrir' | 'transferir') {
    const ids = lista.filter(function(c) { return marcadas[c.id] }).map(function(c) { return c.id })
    if (ids.length === 0 || acaoRodando) return
    const n = ids.length
    const plural = n === 1 ? 'conversa' : 'conversas'
    let pergunta = ''
    if (tipo === 'finalizar') pergunta = 'Finalizar ' + n + ' ' + plural + '?'
    else if (tipo === 'reabrir') pergunta = 'Reabrir ' + n + ' ' + plural + '?'
    else {
      if (destino === '__') return
      pergunta = 'Transferir ' + n + ' ' + plural + ' para ' + (destino ? primeiroNome(destino) : 'a fila de espera') + '?'
    }
    if (!window.confirm(pergunta)) return
    setAcaoRodando(true); setErro(''); setAcaoMsg('')
    try {
      if (tipo === 'transferir') {
        const r = await supabase.rpc('wa_assign_many', { p_convs: ids, p_user: destino || null })
        if (r.error) setAcaoMsg('⚠ ' + r.error.message)
        else {
          const d = (r.data || {}) as any
          setAcaoMsg('✓ ' + (d.ok || 0) + ' transferida(s)' + (d.falhou ? ' · ' + d.falhou + ' não foi possível' + (d.erro ? ' (' + d.erro + ')' : '') : ''))
        }
      } else {
        const novo = tipo === 'finalizar' ? 'resolvida' : 'aberta'
        const r = await supabase.rpc('wa_set_status_many', { p_convs: ids, p_status: novo })
        if (r.error) setAcaoMsg('⚠ ' + r.error.message)
        else {
          const d = (r.data || {}) as any
          setAcaoMsg('✓ ' + (d.ok || 0) + (tipo === 'finalizar' ? ' finalizada(s)' : ' reaberta(s)'))
          if (sel && ids.indexOf(sel) >= 0) setSel(null)
        }
      }
    } catch (e) { setAcaoMsg('⚠ Sem conexão. Tente de novo.') }
    await carregarConvs()
    setMarcadas({}); setModoSel(false); setDestino('__')
    setAcaoRodando(false)
  }

  function primeiroNome(id: string | null): string {
    if (!id) return 'Em espera'
    if (nomes[id]) return nomes[id]
    const p = pessoas.find(function(x) { return x.id === id })
    return p ? (p.nome.split(' ')[0] || p.email) : 'Atendente'
  }

  const lista = convs.filter(function(c) {
    if ((canal === 'recuperacao') !== !!c.connection_id) return false
    if (aba === 'naolidas') {
      // Nao lidas: todas as conversas abertas com mensagem nova, de qualquer atendente (que voce pode ver)
      if (c.status === 'resolvida' || !(c.unread > 0)) return false
    } else {
      if ((aba === 'abertas') !== (c.status !== 'resolvida')) return false
      if (filtro === 'sem' && c.assigned_to) return false
      if (filtro !== 'todas' && filtro !== 'sem' && c.assigned_to !== filtro) return false
    }
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return nomeDe(c).toLowerCase().indexOf(q) >= 0 || c.wa_id.indexOf(q.replace(/\D/g, '') || '§') >= 0 || (c.profile_label || '').toLowerCase().indexOf(q) >= 0
  })
  const naoLidasCanal = function(rec: boolean) { return convs.reduce(function(n, c) { return n + ((!!c.connection_id) === rec && c.status !== 'resolvida' ? c.unread : 0) }, 0) }
  const abertasCanal = function(rec: boolean) { return convs.filter(function(c) { return (!!c.connection_id) === rec && c.status !== 'resolvida' }).length }
  const totalNaoLidas = convs.reduce(function(n, c) { return n + (c.status !== 'resolvida' ? c.unread : 0) }, 0)

  if (staff === null) return <div style={{ padding: 24, color: 'var(--muted2)' }}>Carregando…</div>
  if (!staff) return <div style={{ padding: 24, color: 'var(--text)' }}>Este menu é só para a equipe de atendimento.</div>

  return (
    <div style={{ height: 'calc(100vh - 56px)', minHeight: 480, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {editorImg && atual && <EditorImagem blob={editorImg} enviando={enviando} erro={erro} onCancel={function() { setEditorImg(null); setErro('') }} onSend={async function(img, leg) { const ok = await enviarArquivo(img, 'print.jpg', 'image/jpeg', leg); if (ok) setEditorImg(null) }} />}
        {gerRapidas && isAdmin && <GerenciarRapidas canal={canalConv} lista={(rapidasDb[canalConv] || []) as Rapida[]} onClose={function() { setGerRapidas(false) }} onChanged={function() { carregarRapidas(canalConv) }} />}
        {foto && (
        <div onClick={function() { setFoto(null) }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <button onClick={function() { setFoto(null) }} title="Fechar" style={{ position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 28, lineHeight: 1, cursor: 'pointer' }}>×</button>
          <img src={foto} alt="Imagem" onClick={function(e) { e.stopPropagation() }} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
      <style>{`
        .at-wrap { flex: 1; min-height: 0; display: flex; }
        .at-list { width: 340px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; background: var(--surface); }
        .at-chat { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .at-back { display: none; }
        .at-head { padding: 10px 14px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .at-head-info { flex: 1 1 180px; min-width: 0; }
        .at-head-acoes { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .at-head-sub { font-size: 12px; color: var(--muted2); line-height: 1.45; }
        @media (max-width: 760px) { .at-head-acoes { flex: 1 1 100%; padding-left: 0; } .at-head-acoes > * { flex: 0 0 auto; } }
        .at-item:hover { background: var(--surface2); }
        .at-resp { opacity: 0; transition: opacity .12s; }
        .at-bolha:hover .at-resp, .at-resp:focus { opacity: 1; }
        @media (hover: none) { .at-resp { opacity: 0.55; } }
        .at-msgs { background-color: #efeae2; background-image: ${PAPEL_CLARO}; background-size: 260px 260px; }
        [data-theme='dark'] .at-msgs { background-color: #0b141a; background-image: ${PAPEL_ESCURO}; }
        .at-head { box-shadow: 0 1px 4px rgba(0,0,0,0.08); position: relative; z-index: 2; background: var(--surface2); }
        .at-b { cursor: pointer; border: 1px solid var(--border2); background: var(--surface); color: var(--text); border-radius: 999px; padding: 7px 14px; font-weight: 700; font-size: 12.5px; white-space: nowrap; transition: transform .12s, box-shadow .12s; }
        .at-b:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.12); }
        .at-b-ok { border: 0; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; font-weight: 800; box-shadow: 0 3px 8px rgba(22,163,74,0.35); }
        .at-m { position: relative; border-radius: 10px; box-shadow: 0 1px 1px rgba(11,20,26,0.16); }
        .at-m-in { background: #ffffff; color: #111b21; }
        .at-m-out { background: #d9fdd3; color: #111b21; }
        [data-theme='dark'] .at-m-in { background: #202c33; color: #e9edef; }
        [data-theme='dark'] .at-m-out { background: #005c4b; color: #e9edef; }
        .at-m-in.at-tail { border-top-left-radius: 0; }
        .at-m-out.at-tail { border-top-right-radius: 0; }
        .at-m-in.at-tail::before { content: ''; position: absolute; top: 0; left: -7px; border-style: solid; border-width: 0 8px 9px 0; border-color: transparent #ffffff transparent transparent; }
        .at-m-out.at-tail::before { content: ''; position: absolute; top: 0; right: -7px; border-style: solid; border-width: 0 0 9px 8px; border-color: transparent transparent transparent #d9fdd3; }
        [data-theme='dark'] .at-m-in.at-tail::before { border-right-color: #202c33; }
        [data-theme='dark'] .at-m-out.at-tail::before { border-left-color: #005c4b; }
        .at-dia { background: rgba(255,255,255,0.92); color: #54656f; box-shadow: 0 1px 1px rgba(11,20,26,0.13); border-radius: 8px; font-size: 11.5px; font-weight: 700; padding: 4px 12px; }
        [data-theme='dark'] .at-dia { background: #182229; color: #8696a0; }
        .at-sys { background: #fff5c4; color: #54656f; border-radius: 8px; padding: 6px 12px; box-shadow: 0 1px 1px rgba(11,20,26,0.13); }
        [data-theme='dark'] .at-sys { background: #1f2c34; color: #ffd279; }
        .at-item { transition: background .15s; }
        .at-item.at-on { background: var(--accent-light); box-shadow: inset 4px 0 0 #16a34a; }
        .at-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border2); background: var(--surface2); color: var(--text); font-size: 14px; outline: none; font-family: inherit; }
        @media (max-width: 760px) {
          .at-list { width: 100%; border-right: 0; ${sel ? 'display: none;' : ''} }
          .at-chat { ${sel ? '' : 'display: none;'} }
          .at-back { display: inline-flex; }
        }
      `}</style>

      {/* Topo: estado da conexao */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 4px 10px rgba(22,163,74,0.35)' }}>💬</span><span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>Atendimento WhatsApp</span></div>
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
        {([['conversas', '💬 Conversas'], ['atendentes', '👥 Atendentes'], ['modelos', '📄 Modelos'], ['disparo', '📣 Disparo'], ['fluxos', '⚡ Fluxos'], ['eventos', '🔔 Eventos'], ['conexoes', '🔌 Conexões']] as const).filter(function(t) { return (t[0] !== 'atendentes' && t[0] !== 'fluxos' && t[0] !== 'disparo' && t[0] !== 'eventos' && t[0] !== 'conexoes') || isAdmin }).map(function(t) {
          const on = tab === t[0]
          return <button key={t[0]} onClick={function() { setTab(t[0]); if (t[0] === 'modelos') carregarTpls(); if (t[0] === 'disparo') setDisparoAberto(true) }} style={{ cursor: 'pointer', border: 0, borderRadius: 999, padding: '7px 16px', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', transition: 'all .15s', background: on ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'var(--surface2)', color: on ? '#fff' : 'var(--muted2)', boxShadow: on ? '0 3px 8px rgba(22,163,74,0.35)' : 'none' }}>{t[1]}</button>
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

      {tab === 'modelos' && <Modelos isAdmin={isAdmin} tpls={tpls} erro={tplErro} carregando={tplCarregando} onReload={function() { carregarTpls(true) }} canais={canais} escopo={escopo} />}
      {tab === 'atendentes' && isAdmin && <Atendentes />}
      {disparoAberto && isAdmin && <div style={tab === 'disparo' ? { display: 'contents' } : { display: 'none' }}><Disparo tpls={tpls} onLoadTpls={carregarTpls} /></div>}
      {tab === 'fluxos' && isAdmin && <Fluxos />}
      {tab === 'eventos' && isAdmin && <Eventos onAbrir={abrirDeEvento} />}
      {tab === 'conexoes' && isAdmin && <Conexoes />}

      <div className="at-wrap" style={tab === 'conversas' ? undefined : { display: 'none' }}>
        {/* Lista */}
        <div className="at-list">
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {canais.length > 0 && escopo === 'todos' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {([['suporte', '🎧 Chat de suporte', false], ['recuperacao', '🛒 Chat de recuperação', true]] as const).map(function(t) {
                  const on = canal === t[0]
                  const nl = naoLidasCanal(t[2])
                  return (
                    <button key={t[0]} onClick={function() { if (canal !== t[0]) { setCanal(t[0]); setSel(null); setMsgs([]) } }} style={{ flex: 1, cursor: 'pointer', border: on ? '2px solid ' + (t[2] ? '#c2410c' : '#1f7a5a') : '2px solid transparent', borderRadius: 10, padding: '8px 6px', fontWeight: 800, fontSize: 12.5, lineHeight: 1.25, background: on ? (t[2] ? 'rgba(234,88,12,0.12)' : 'rgba(31,122,90,0.12)') : 'var(--surface2)', color: on ? 'var(--text)' : 'var(--muted2)' }}>
                      {t[1]}
                      <div style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.8, marginTop: 2 }}>{abertasCanal(t[2])} abertas{nl > 0 ? ' · ' : ''}{nl > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '0 6px', fontSize: 11 }}>{nl}</span>}</div>
                    </button>
                  )
                })}
              </div>
            )}
            {escopo === 'recuperacao' && <div style={{ fontWeight: 800, fontSize: 13.5, color: '#c2410c', background: 'rgba(234,88,12,0.12)', borderRadius: 10, padding: '8px 10px' }}>🛒 Chat de recuperação</div>}
            <input className="at-input" placeholder="Buscar nome ou número" value={busca} onChange={function(e) { setBusca(e.target.value) }} />
            {isAdmin && (
              <button onClick={alternarIAGeral} title="Liga ou desliga o assistente de IA em todas as conversas de uma vez (inclusive as novas)" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid ' + (iaGeral ? '#7c3aed' : 'var(--border2)'), background: iaGeral ? 'rgba(124,58,237,0.12)' : 'var(--surface2)', color: iaGeral ? '#7c3aed' : 'var(--text)', borderRadius: 10, padding: '8px 10px', fontWeight: 800, fontSize: 12.5 }}>
                <span>🤖 Assistente em todas as conversas</span>
                <span style={{ background: iaGeral ? '#7c3aed' : 'var(--border2)', color: iaGeral ? '#fff' : 'var(--muted2)', borderRadius: 999, padding: '2px 10px', fontSize: 11.5 }}>{iaGeral ? 'LIGADO' : 'desligado'}</span>
              </button>
            )}
            {(function() {
              // Estilo Unnichat: dois botoes fixos (Em espera / Minhas) + menu com as demais visoes (so admin)
              const cont = function(k: string) { return convs.filter(function(c) { return (!!c.connection_id) === (canal === 'recuperacao') && c.status !== 'resolvida' && (k === 'todas' ? true : k === 'sem' ? !c.assigned_to : c.assigned_to === k) }).length }
              const nomeFiltro = function(k: string) { return k === 'todas' ? 'Todas' : k === meuId ? 'Minhas' : primeiroNome(k) }
              const emEspera = filtro === 'sem'
              const botao = function(on: boolean): React.CSSProperties { return { cursor: 'pointer', border: 0, borderRadius: 10, padding: '10px 6px', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: on ? '#1f7a5a' : 'var(--surface2)', color: on ? '#fff' : 'var(--muted2)' } }
              const pessoasMenu = pessoas.filter(function(x) { return atendeCanal(x, canal === 'recuperacao') }).sort(function(x, y) { return (x.id === meuId ? -1 : 0) - (y.id === meuId ? -1 : 0) })
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
              {(['abertas', 'naolidas', 'resolvidas'] as const).map(function(a) {
                const on = aba === a
                const qtdNaoLidas = convs.filter(function(c) { return (!!c.connection_id) === (canal === 'recuperacao') && c.status !== 'resolvida' && c.unread > 0 }).length
                return <button key={a} onClick={function() { setAba(a) }} style={{ flex: 1, cursor: 'pointer', border: 0, borderRadius: 8, padding: '7px 4px', fontWeight: 700, fontSize: 13, background: on ? 'var(--accent-light)' : 'var(--surface2)', color: on ? 'var(--accent)' : 'var(--muted2)' }}>
                  {a === 'abertas' ? 'Abertas' : a === 'resolvidas' ? 'Finalizadas' : 'Não lidas'}
                  {a === 'naolidas' && qtdNaoLidas > 0 && <span style={{ marginLeft: 5, background: '#ef4444', color: '#fff', borderRadius: 999, padding: '0 6px', fontSize: 11 }}>{qtdNaoLidas}</span>}
                </button>
              })}
              {lista.length > 0 && (function() {
                const n = lista.filter(function(c) { return marcadas[c.id] }).length
                const todas = n === lista.length
                const algumas = n > 0 && !todas
                return (
                  <button title={modoSel && todas ? 'Desmarcar todas' : 'Selecionar todas as conversas da lista'} onClick={function() {
                    if (modoSel && todas) { setModoSel(false); setMarcadas({}); return }
                    const m: Record<string, boolean> = {}
                    lista.forEach(function(c) { m[c.id] = true })
                    setMarcadas(m); setModoSel(true); setAcaoMsg('')
                  }} style={{ cursor: 'pointer', flex: '0 0 26px', width: 26, height: 26, alignSelf: 'center', borderRadius: 6, border: '2px solid ' + (modoSel ? '#2563eb' : 'var(--border2)'), background: modoSel ? '#2563eb' : 'transparent', color: '#fff', fontSize: 15, fontWeight: 900, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{modoSel ? (algumas ? '−' : '✓') : ''}</button>
                )
              })()}
            </div>
            {acaoMsg && !modoSel && <div style={{ fontSize: 12.5, color: acaoMsg.indexOf('⚠') === 0 ? '#b91c1c' : '#15803d', fontWeight: 700 }}>{acaoMsg}</div>}
            {modoSel && (function() {
              const n = lista.filter(function(c) { return marcadas[c.id] }).length
              const pessoasDestino = pessoas.filter(function(x) { return atendeCanal(x, canal === 'recuperacao') })
              const off = acaoRodando || n === 0
              const btn = function(cor: string, desl: boolean): React.CSSProperties { return { cursor: desl ? 'default' : 'pointer', border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 800, fontSize: 12.5, background: cor, color: '#fff', opacity: desl ? 0.5 : 1 } }
              return (
                <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{n} selecionada(s)</span>
                    {aba === 'resolvidas'
                      ? <button disabled={off} onClick={function() { acaoMassa('reabrir') }} style={btn('#1f7a5a', off)}>↩ Reabrir</button>
                      : <button disabled={off} onClick={function() { acaoMassa('finalizar') }} style={btn('#16a34a', off)}>✓ Finalizar</button>}
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={destino} onChange={function(e) { setDestino(e.target.value) }} style={{ flex: 1, minWidth: 0, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', borderRadius: 8, padding: '6px 8px', fontSize: 12.5, fontWeight: 700 }}>
                        <option value="__">Transferir para…</option>
                        <option value="">⏳ Fila de espera</option>
                        {pessoasDestino.map(function(pp) { return <option key={pp.id} value={pp.id}>{pp.id === meuId ? 'Eu (' + (pp.nome || pp.email) + ')' : (pp.nome || pp.email)}</option> })}
                      </select>
                      <button disabled={off || destino === '__'} onClick={function() { acaoMassa('transferir') }} style={btn('#2563eb', off || destino === '__')}>Transferir</button>
                    </div>
                  )}
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button disabled={off} onClick={function() { const ids = lista.filter(function(c) { return marcadas[c.id] }).map(function(c) { return c.id }); if (window.confirm('Ligar o assistente de IA em ' + ids.length + ' conversa(s)? Ele passa a responder sozinho.')) { alternarIA(ids, true); setMarcadas({}); setModoSel(false) } }} style={btn('#7c3aed', off)}>🤖 Ligar assistente</button>
                      <button disabled={off} onClick={function() { const ids = lista.filter(function(c) { return marcadas[c.id] }).map(function(c) { return c.id }); alternarIA(ids, false); setMarcadas({}); setModoSel(false) }} style={btn('#6b7280', off)}>Desligar</button>
                    </div>
                  )}
                  {acaoRodando && <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>Aplicando…</div>}
                </div>
              )
            })()}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {lista.length === 0 && <div style={{ padding: 20, fontSize: 13.5, color: 'var(--muted2)', textAlign: 'center' }}>{aba === 'abertas' ? 'Nenhuma conversa aberta.' : aba === 'naolidas' ? 'Nenhuma mensagem não lida. 🎉' : 'Nenhuma conversa finalizada.'}</div>}
            {lista.map(function(c) {
              const on = c.id === sel
              return (
                <div key={c.id} className={'at-item' + (on ? ' at-on' : '')} onClick={function() { if (modoSel) setMarcadas(function(m) { const n = { ...m }; if (n[c.id]) delete n[c.id]; else n[c.id] = true; return n }); else abrir(c) }} style={{ display: 'flex', gap: 10, padding: '11px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: modoSel && marcadas[c.id] ? 'rgba(37,99,235,0.10)' : undefined, alignItems: modoSel ? 'center' : undefined }}>
                  {modoSel && <input type="checkbox" readOnly checked={!!marcadas[c.id]} style={{ width: 18, height: 18, flexShrink: 0, pointerEvents: 'none' }} />}
                  <Avatar c={c} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: c.unread > 0 ? 800 : 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDe(c)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {!(c.unread > 0) && !modoSel && <button title="Marcar como não lida" onClick={function(e) { e.stopPropagation(); marcarNaoLida(c.id) }} style={{ cursor: 'pointer', border: 0, background: 'transparent', color: 'var(--muted2)', fontSize: 13, padding: 0, lineHeight: 1 }}>✉</button>}
                        <div style={{ fontSize: 11.5, color: c.unread > 0 ? '#16a34a' : 'var(--muted2)' }}>{hora(c.last_message_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--muted2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_text}</div>
                      {c.unread > 0 && <span style={{ background: '#16a34a', color: '#fff', borderRadius: 999, minWidth: 20, height: 20, padding: '0 6px', fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{c.unread}</span>}
                    </div>
                    {(isAdmin || !c.assigned_to) && <div style={{ fontSize: 11, color: c.assigned_to ? 'var(--muted2)' : '#b45309', fontWeight: 700, marginTop: 2 }}>{c.assigned_to ? '👤 ' + primeiroNome(c.assigned_to) : '⏳ Em espera'}</div>}
                    {iaOn(c) && <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 800, marginTop: 2 }}>🤖 Assistente ligado</div>}
                    {c.profile_label && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎓 {c.profile_label}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversa */}
        <div className="at-chat" style={{ position: 'relative' }}
          onDragEnter={function(e) { if (!temArquivo(e)) return; e.preventDefault(); arrasteN.current++; setArrastando(true) }}
          onDragOver={function(e) { if (!temArquivo(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDragLeave={function(e) { if (!temArquivo(e)) return; arrasteN.current = Math.max(0, arrasteN.current - 1); if (arrasteN.current === 0) setArrastando(false) }}
          onDrop={soltarArquivo}>
          {arrastando && atual && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(22,163,74,0.14)', border: '3px dashed #16a34a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ background: 'var(--surface)', color: '#15803d', fontWeight: 800, fontSize: 16, padding: '14px 22px', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>{janelaAberta ? '📎 Solte o arquivo aqui para enviar' : '⏳ Passaram 24 horas: não dá para enviar arquivo agora'}</div>
            </div>
          )}
          {!atual ? (
            <div className="at-msgs" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '28px 30px', maxWidth: 380, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
                <div style={{ width: 64, height: 64, margin: '0 auto 14px', borderRadius: 20, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 8px 20px rgba(22,163,74,0.35)' }}>💬</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>Atendimento Cristão Próspero</div>
                <div style={{ fontSize: 13.5, color: 'var(--muted2)', lineHeight: 1.55 }}>{canal === 'recuperacao' ? 'Aqui ficam as mensagens enviadas pelos fluxos da Hubla e as respostas das pessoas.' : 'Escolha uma conversa à esquerda para responder.'}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="at-head">
                <button className="at-back" onClick={function() { setSel(null) }} style={{ border: 0, background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>←</button>
                <Avatar c={atual} size={42} />
                <div className="at-head-info">
                  <div style={{ fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDe(atual)}{atual.connection_id && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: '#c2410c', border: '1px solid rgba(194,65,12,0.45)', borderRadius: 999, padding: '1px 8px' }}>🛒 Recuperação</span>}</div>
                  <div className="at-head-sub">{fmtPhone(atual.wa_id)}{atual.profile_label ? ' · 🎓 ' + (info ? atual.profile_label.split(' · ')[0] + ' · ' + (info.plano || 'Sem plano') : atual.profile_label) : ''}
                    {compra && (compra.comprou_em
                      ? <span style={{ color: '#15803d', fontWeight: 700 }}> · 🛒 {compra.cat === 'm' || !compra.produto ? 'Comprou a Mentoria em ' : 'Comprou ' + compra.produto + ' em '}{fmtDia(compra.comprou_em)}{compra.por === 'nome' ? ' (pelo nome)' : ''}</span>
                      : info && info.plano
                        ? <span style={{ color: '#15803d', fontWeight: 700 }}> · 🛒 Conta criada em {fmtDia(info.cadastro_em)}</span>
                        : <span style={{ color: 'var(--muted2)' }}> · 🛒 Sem compra registrada</span>)}
                    {info && info.reembolso_em && <span style={{ color: '#b91c1c', fontWeight: 700 }}> · Reembolsado em {fmtDia(info.reembolso_em)}</span>}
                  </div>
                </div>
                <div className="at-head-acoes">
                {isAdmin
                  ? <button onClick={function() { alternarIA([atual.id], !iaOn(atual)) }} title={iaOn(atual) ? 'O assistente está respondendo sozinho nesta conversa. Clique para desligar.' : 'Clique para o assistente de IA passar a responder sozinho nesta conversa.'} style={{ cursor: 'pointer', border: '1px solid ' + (iaOn(atual) ? '#7c3aed' : 'var(--border2)'), background: iaOn(atual) ? '#7c3aed' : 'var(--surface2)', color: iaOn(atual) ? '#fff' : 'var(--text)', borderRadius: 999, padding: '7px 14px', fontWeight: 800, fontSize: 12.5, whiteSpace: 'nowrap' }}>🤖 {iaOn(atual) ? 'Assistente ligado' : 'Ligar assistente'}</button>
                  : iaOn(atual) ? <span title="O assistente de IA está respondendo esta conversa" style={{ border: '1px solid #7c3aed', color: '#7c3aed', borderRadius: 8, padding: '6px 9px', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>🤖 Assistente ativo</span> : null}
                {isAdmin && (
                  <select value={atual.assigned_to || ''} onChange={function(e) { atribuir(e.target.value) }} title="Atendente desta conversa" style={{ border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, maxWidth: 160 }}>
                    <option value="">Em espera</option>
                    {pessoas.filter(function(x) { return x.id === atual.assigned_to || atendeCanal(x, !!atual.connection_id) }).map(function(p) { return <option key={p.id} value={p.id}>{p.id === meuId ? 'Eu (' + (p.nome.split(' ')[0] || 'admin') + ')' : (p.nome.split(' ')[0] || p.email)}</option> })}
                  </select>
                )}
                <button onClick={function() { marcarNaoLida(atual.id) }} title="Marcar como não lida (volta para a lista em destaque)" className="at-b">✉ Não lida</button>
                {atual.status === 'resolvida'
                  ? <button onClick={function() { mudarStatus('aberta') }} className="at-b">Reabrir</button>
                  : <button onClick={function() { mudarStatus('resolvida') }} className="at-b at-b-ok">✓ Finalizar</button>}
                </div>
              </div>

              <div className="at-msgs" style={{ flex: 1, overflowY: 'auto', padding: '14px 4% 8px 4%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {msgs.map(function(m, i) {
                  const novoDia = i === 0 || new Date(msgs[i - 1].created_at).toDateString() !== new Date(m.created_at).toDateString()
                  const meu = m.direction === 'out'
                  const primeiroGrupo = novoDia || i === 0 || msgs[i - 1].direction !== m.direction || msgs[i - 1].type === 'system'
                  if (m.type === 'system') return <div key={m.id} className="at-sys" style={{ alignSelf: 'center', textAlign: 'center', fontSize: 12.5, margin: '8px 0', maxWidth: '85%' }}>{m.body}</div>
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', marginTop: primeiroGrupo && !novoDia ? 6 : 0 }}>
                      {novoDia && <div className="at-dia" style={{ alignSelf: 'center', margin: '10px 0' }}>{diaMsg(m.created_at)}</div>}
                      <div className="at-bolha" style={{ alignSelf: meu ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: meu ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
                      <div id={m.wa_message_id ? 'msg-' + m.wa_message_id : undefined} className={'at-m ' + (meu ? 'at-m-out' : 'at-m-in') + (primeiroGrupo ? ' at-tail' : '')} style={{ maxWidth: 'min(78%, 520px)', padding: '7px 10px 5px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {meu && !m.sent_by && m.type === 'text' && <div style={{ fontSize: 10.5, fontWeight: 800, opacity: 0.7, marginBottom: 2 }}>🤖 Resposta automática</div>}
                        {meu && m.sent_by && <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75, marginBottom: 3 }}>👤 {nomes[m.sent_by] || 'Atendente'}</div>}
                        {m.reply_to_wa_id && (function() {
                          const q = msgs.find(function(x) { return x.wa_message_id === m.reply_to_wa_id })
                          return (
                            <div onClick={function() { const el = document.getElementById('msg-' + m.reply_to_wa_id); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }} style={{ cursor: q ? 'pointer' : 'default', borderLeft: '3px solid #16a34a', background: 'rgba(0,0,0,0.06)', borderRadius: 6, padding: '4px 8px', marginBottom: 5, fontSize: 12.5, lineHeight: 1.3 }}>
                              <div style={{ fontWeight: 800, fontSize: 11.5, color: '#15803d' }}>{q ? (q.direction === 'out' ? (q.sent_by ? (nomes[q.sent_by] || 'Atendente') : 'Resposta automática') : nomeDe(atual)) : 'Mensagem'}</div>
                              <div style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{q ? resumo(q) : 'Mensagem anterior'}</div>
                            </div>
                          )
                        })()}
                        <Midia m={m} onFoto={setFoto} />
                        {m.type !== 'audio' && m.body && <div><Texto t={m.body} /></div>}
                        {m.type !== 'audio' && acharLinks(m.body).map(function(u) { return <LinkPrev key={u} url={u} /> })}
                        {!m.media_path && m.type !== 'text' && m.type !== 'template' && !m.body && <div style={{ opacity: 0.7 }}>[{m.type}]</div>}
                        <div style={{ fontSize: 10.5, opacity: 0.65, textAlign: 'right', marginTop: 2 }}>{horaMsg(m.created_at)} {meu && <Tick s={m.status} />}</div>
                        {m.status === 'failed' && m.error && <div style={{ fontSize: 11.5, color: '#b91c1c' }}>{m.error}</div>}
                        {m.status === 'failed' && /part of an experiment/i.test(m.error || '') && <div style={{ fontSize: 11.5, color: '#92400e', marginTop: 2 }}>A Meta bloqueou modelos de marketing para este número (experimento dela). Não há como contornar: fale com a pessoa por outro canal e peça para ela mandar uma mensagem primeiro.</div>}
                        {meu && m.status === 'failed' && (m.type === 'text' || m.type === 'template') && <button onClick={function() { reenviar(m) }} disabled={enviando} style={{ cursor: enviando ? 'not-allowed' : 'pointer', marginTop: 4, border: '1px solid #b91c1c', background: '#fff', color: '#b91c1c', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 800, opacity: enviando ? 0.6 : 1 }}>↻ Reenviar</button>}
                      </div>
                      {m.wa_message_id && janelaAberta && <button className="at-resp" title="Responder esta mensagem" onClick={function() { setRespondendo(m); const t = document.querySelector('textarea.at-input') as HTMLTextAreaElement | null; if (t) t.focus() }} style={{ cursor: 'pointer', border: 0, background: 'var(--surface2)', color: 'var(--muted2)', borderRadius: '50%', width: 28, height: 28, fontSize: 14, flexShrink: 0 }}>↩</button>}
                      </div>
                    </div>
                  )
                })}
                <div ref={fim} />
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
                {erro && <div style={{ marginBottom: 8, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>{erro}</div>}
                {!atual.assigned_to && <div style={{ marginBottom: 8, fontSize: 12.5, color: '#b45309', fontWeight: 700 }}>⏳ Esta conversa está em espera. Ao responder, ela fica com você.</div>}
                {janelaAberta ? (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginBottom: 6 }}>Você pode responder por mais ~{horasRestantes}h.</div>
                    {(function() {
                      const lista: { id?: string; titulo: string; texto: string }[] = rapidasDb[canalConv] || (atual.connection_id ? RAPIDAS : RAPIDAS_SUPORTE)
                      if (lista.length === 0 && !isAdmin) return null
                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {lista.map(function(r) {
                            return <button key={r.id || r.titulo} disabled={enviando} title={r.texto} onClick={function() { usarRapida(r) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 700, opacity: enviando ? 0.55 : 1 }}>⚡ {r.titulo}</button>
                          })}
                          {isAdmin && <button onClick={function() { setGerRapidas(true) }} title="Adicionar, editar ou apagar mensagens rápidas" style={{ cursor: 'pointer', border: '1px dashed var(--border2)', background: 'transparent', color: 'var(--muted2)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 700 }}>＋ Adicionar / editar</button>}
                        </div>
                      )
                    })()}
                    {mostrarTpl && <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 10, marginBottom: 8 }}><TemplatePicker tpls={tplsDaConversa} enviando={enviando} onSend={function(t) { enviar(t) }} /></div>}
                    {gravando ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: '10px 12px' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                        <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Gravando… {Math.floor(segs / 60)}:{String(segs % 60).padStart(2, '0')}</div>
                        <button onClick={function() { pararGravacao(true) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 11px', fontWeight: 700, fontSize: 13 }}>Cancelar</button>
                        <button onClick={function() { pararGravacao(false) }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '7px 13px', fontWeight: 800, fontSize: 13 }}>Enviar áudio</button>
                      </div>
                    ) : (
                      <>
                        {respondendo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderLeft: '3px solid #16a34a', borderRadius: 8, padding: '6px 10px', marginBottom: 8, fontSize: 13, color: 'var(--text)' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 11.5, color: '#15803d' }}>Respondendo a {respondendo.direction === 'out' ? (respondendo.sent_by ? (nomes[respondendo.sent_by] || 'Atendente') : 'Resposta automática') : nomeDe(atual)}</div>
                              <div style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resumo(respondendo)}</div>
                            </div>
                            <button title="Cancelar" onClick={function() { setRespondendo(null) }} style={{ border: 0, background: 'transparent', color: 'var(--muted2)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                          </div>
                        )}
                        {anexo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 10, padding: '7px 10px', marginBottom: 8, fontSize: 13, color: 'var(--text)' }}>
                            <span>📎</span>
                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{anexo.name}</span>
                            <span style={{ color: 'var(--muted2)', fontSize: 12 }}>{anexo.size > 1048576 ? (anexo.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(anexo.size / 1024)) + ' KB'}</span>
                            <button onClick={function() { setAnexo(null) }} style={{ border: 0, background: 'transparent', color: 'var(--muted2)', cursor: 'pointer', fontSize: 16 }}>×</button>
                          </div>
                        )}
                        {mostrarEmoji && <EmojiPicker onPick={inserirEmoji} />}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                          <button title="Emojis" aria-label="Abrir emojis" onClick={function() { setMostrarEmoji(!mostrarEmoji) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: mostrarEmoji ? 'var(--accent-light)' : 'var(--surface2)', borderRadius: '50%', width: 42, height: 42, fontSize: 22, lineHeight: 1, flexShrink: 0 }}>😊</button>
                        <textarea className="at-input" data-msg="1" rows={2} placeholder={anexo ? 'Legenda (opcional)…' : 'Digite a resposta…'} value={texto} onChange={function(e) { setTexto(e.target.value) }}
                          onKeyDown={function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (anexo) enviarArquivo(anexo, anexo.name, mimeDe(anexo), texto); else enviar() } }} style={{ resize: 'none', flex: 1, minWidth: 0, borderRadius: 22, padding: '10px 16px', background: 'var(--surface)' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <input ref={fileRef} type="file" accept="image/jpeg,image/png,video/mp4,video/3gpp,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,application/json" style={{ display: 'none' }} onChange={function(e) { escolherArquivo(e.target.files && e.target.files[0]); e.target.value = '' }} />
                          <button title="Enviar arquivo, foto ou vídeo" onClick={function() { if (fileRef.current) fileRef.current.click() }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 999, whiteSpace: 'nowrap', padding: '7px 13px', fontSize: 14, fontWeight: 700 }}>📎 Arquivo</button>
                          <button title="Gravar áudio" onClick={iniciarGravacao} disabled={enviando} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 999, whiteSpace: 'nowrap', padding: '7px 13px', fontSize: 14, fontWeight: 700 }}>🎤 Áudio</button>
                          <button title="Enviar modelo aprovado" onClick={function() { setMostrarTpl(!mostrarTpl) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: mostrarTpl ? 'var(--accent-light)' : 'var(--surface2)', color: 'var(--text)', borderRadius: 999, whiteSpace: 'nowrap', padding: '7px 13px', fontSize: 14, fontWeight: 700 }}>📄 Modelo</button>
                          <div style={{ flex: 1 }} />
                          <button disabled={enviando || (!texto.trim() && !anexo)} onClick={function() { if (anexo) enviarArquivo(anexo, anexo.name, mimeDe(anexo), texto); else enviar() }} style={{ cursor: 'pointer', border: 0, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', borderRadius: 999, whiteSpace: 'nowrap', padding: '10px 18px', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 12px rgba(22,163,74,0.35)', opacity: enviando || (!texto.trim() && !anexo) ? 0.55 : 1 }}>{enviando ? '…' : 'Enviar ➤'}</button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ background: 'rgba(217,119,6,0.1)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>⏳ Passaram 24 horas desde a última mensagem do aluno.</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 8 }}>Para voltar a falar, escolha um <b>modelo aprovado</b>. Quando o aluno responder, a conversa volta a ficar livre.</div>
                    <TemplatePicker tpls={tplsDaConversa} enviando={enviando} onSend={function(t) { enviar(t) }} />
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
