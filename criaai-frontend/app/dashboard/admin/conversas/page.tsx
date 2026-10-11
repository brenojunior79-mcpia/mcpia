'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

const AVATAR_COLORS = ['#7c5cfc', '#0ea5e9', '#16a34a', '#f97316', '#ec4899', '#14b8a6', '#c8891a', '#6366f1']

function colorFor(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function initials(name: string) {
  const parts = (name || '?').trim().split(/\s+/)
  const first = parts[0] ? parts[0][0] : '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(iso: string) {
  return isSameDay(new Date(iso), new Date())
}

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return 'há ' + min + ' min'
  const h = Math.floor(min / 60)
  if (h < 24) return 'há ' + h + ' h'
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  if (d < 7) return 'há ' + d + ' dias'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (isSameDay(d, now)) return 'Hoje'
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(d, yesterday)) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

// Mensagens de um mesmo par (aluno + Junior) sao salvas no mesmo instante: o aluno vem primeiro
function sortMessages(a: any, b: any) {
  const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  if (t !== 0) return t
  return (a.role === 'user' ? 0 : 1) - (b.role === 'user' ? 0 : 1)
}

function Linkified({ text }: { text: string }) {
  const parts = (text || '').split(/(https?:\/\/[^\s]+)/g)
  return (
    <>
      {parts.map(function(part, i) {
        if (/^https?:\/\//.test(part)) {
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colorFor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.38), fontWeight: 800, flexShrink: 0 }}>
      {initials(name)}
    </div>
  )
}

const css = `
.cv-root { height: calc(100vh - 56px); display: flex; flex-direction: column; background: var(--bg); color: var(--text); overflow: hidden; }
.cv-head { padding: 18px 24px 8px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.cv-title { font-family: Syne, sans-serif; font-size: 20px; font-weight: 800; margin: 0; }
.cv-sub { font-size: 12px; color: var(--muted2); margin: 3px 0 0; }
.cv-stats { display: flex; gap: 10px; flex-wrap: wrap; }
.cv-stat { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 8px 14px; min-width: 96px; }
.cv-stat b { display: block; font-family: Syne, sans-serif; font-size: 20px; line-height: 1.1; }
.cv-stat span { font-size: 11px; color: var(--muted2); }

.cv-carousel { padding: 10px 24px 6px; }
.cv-carousel-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.cv-carousel-label { font-size: 13px; font-weight: 700; }
.cv-arrows { display: flex; gap: 6px; }
.cv-arrow { width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.cv-arrow:hover { border-color: var(--accent); color: var(--accent); }
.cv-arrow:focus-visible, .cv-card:focus-visible, .cv-item:focus-visible, .cv-chip:focus-visible, .cv-back:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cv-track { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; scrollbar-width: thin; }
.cv-card { scroll-snap-align: start; flex: 0 0 248px; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px; cursor: pointer; color: var(--text); font-family: inherit; position: relative; }
.cv-card:hover { border-color: var(--accent); }
.cv-card.on { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
.cv-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.cv-card-name { font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cv-card-time { font-size: 11px; color: var(--muted2); }
.cv-card-msg { font-size: 12px; color: var(--muted); line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 35px; }
.cv-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
.cv-wait { display: inline-block; font-size: 10px; font-weight: 700; color: var(--amber); background: rgba(245,158,11,0.14); border-radius: 99px; padding: 2px 8px; margin-top: 8px; }

.cv-main { flex: 1; min-height: 0; display: flex; border-top: 1px solid var(--border); }
.cv-list { width: 340px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; min-height: 0; }
.cv-search { margin: 14px 16px 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; color: var(--text); font-size: 13px; outline: none; font-family: inherit; }
.cv-search:focus { border-color: var(--accent); }
.cv-chips { display: flex; gap: 6px; padding: 0 16px 10px; flex-wrap: wrap; }
.cv-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 99px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.cv-chip.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.cv-items { flex: 1; overflow-y: auto; }
.cv-item { display: flex; gap: 12px; width: 100%; text-align: left; padding: 12px 16px; border: 0; border-left: 3px solid transparent; background: transparent; color: var(--text); cursor: pointer; font-family: inherit; }
.cv-item:hover { background: var(--surface2); }
.cv-item.on { background: var(--accent-glow); border-left-color: var(--accent); }
.cv-item-body { min-width: 0; flex: 1; }
.cv-item-row { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.cv-item-name { font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cv-item-time { font-size: 11px; color: var(--muted2); flex-shrink: 0; }
.cv-item-msg { font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }

.cv-chat { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0; }
.cv-chat-head { padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
.cv-back { display: none; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 10px; width: 36px; height: 36px; cursor: pointer; font-size: 16px; }
.cv-chat-name { font-weight: 800; font-size: 15px; }
.cv-chat-email { font-size: 12px; color: var(--muted2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cv-chat-count { margin-left: auto; font-size: 12px; color: var(--muted2); flex-shrink: 0; }
.cv-msgs { flex: 1; overflow-y: auto; padding: 18px 24px 28px; display: flex; flex-direction: column; gap: 10px; }
.cv-day { align-self: center; font-size: 11px; font-weight: 700; color: var(--muted2); background: var(--surface2); border-radius: 99px; padding: 3px 12px; margin: 8px 0 2px; text-transform: capitalize; }
.cv-row { display: flex; gap: 8px; align-items: flex-end; }
.cv-row.user { justify-content: flex-end; }
.cv-bubble { max-width: min(640px, 78%); padding: 9px 13px; border-radius: 16px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-wrap: break-word; }
.cv-bubble.user { background: var(--accent); color: #fff; border-bottom-right-radius: 5px; }
.cv-bubble.bot { background: var(--surface); border: 1px solid var(--border); border-bottom-left-radius: 5px; }
.cv-bubble.human { background: rgba(22,163,74,0.12); border: 1px solid rgba(22,163,74,0.35); border-bottom-left-radius: 5px; }
.cv-human-label { display: block; font-size: 11px; font-weight: 700; color: var(--green); margin-bottom: 3px; }
.cv-human-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--green); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
.cv-pill { display: inline-block; font-size: 10px; font-weight: 700; color: var(--green); background: rgba(22,163,74,0.14); border-radius: 99px; padding: 2px 8px; margin-top: 8px; }
.cv-take { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 10px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; flex-shrink: 0; }
.cv-take:hover { border-color: var(--accent); color: var(--accent); }
.cv-take.on { background: var(--green); border-color: var(--green); color: #fff; }
.cv-banner { padding: 8px 20px; font-size: 12px; background: rgba(22,163,74,0.1); border-bottom: 1px solid rgba(22,163,74,0.25); }
.cv-composer { border-top: 1px solid var(--border); padding: 12px 16px; display: flex; gap: 10px; align-items: flex-end; background: var(--surface); }
.cv-textarea { flex: 1; resize: none; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; color: var(--text); font-size: 13.5px; line-height: 1.5; outline: none; font-family: inherit; max-height: 140px; }
.cv-textarea:focus { border-color: var(--accent); }
.cv-send { border: 0; background: var(--accent); color: #fff; border-radius: 12px; width: 44px; height: 44px; font-size: 18px; cursor: pointer; flex-shrink: 0; }
.cv-send:disabled { opacity: 0.45; cursor: not-allowed; }
.cv-send:focus-visible, .cv-take:focus-visible, .cv-textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cv-shot { display: block; max-width: 260px; width: 100%; border-radius: 10px; margin-bottom: 8px; cursor: zoom-in; border: 1px solid var(--border); background: var(--surface2); }
.cv-shot-missing { display: inline-block; font-size: 12px; opacity: 0.8; margin-bottom: 4px; }
.cv-zoom { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; padding: 20px; cursor: zoom-out; }
.cv-zoom img { max-width: 100%; max-height: 100%; border-radius: 12px; }
.cv-time { display: block; font-size: 10px; opacity: 0.6; margin-top: 4px; text-align: right; }
.cv-bot-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: var(--surface2); }
.cv-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--muted2); font-size: 14px; text-align: center; padding: 24px; }

@media (max-width: 820px) {
  .cv-head { padding: 14px 16px 6px; }
  .cv-carousel { padding: 8px 16px 4px; }
  .cv-list { width: 100%; border-right: 0; }
  .cv-chat { display: none; }
  .cv-main.has-chat .cv-list { display: none; }
  .cv-main.has-chat .cv-chat { display: flex; }
  .cv-root.has-chat .cv-carousel, .cv-root.has-chat .cv-head { display: none; }
  .cv-back { display: flex; align-items: center; justify-content: center; }
  .cv-msgs { padding: 14px 14px 24px; }
  .cv-bubble { max-width: 86%; }
}
@media (prefers-reduced-motion: reduce) { .cv-track { scroll-behavior: auto; } }
`

export default function ConversasAdminPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'hoje' | 'aguardando'>('todos')
  const [unread, setUnread] = useState<Set<string>>(new Set())
  const [messagesToday, setMessagesToday] = useState(0)
  const [shots, setShots] = useState<Record<string, string>>({})
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  const [takeovers, setTakeovers] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()
  const selectedUserIdRef = useRef<string | null>(null)
  const knownUserIdsRef = useRef<Set<string>>(new Set())
  const trackRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(function() { selectedUserIdRef.current = selectedUserId }, [selectedUserId])

  useEffect(function() {
    if (endRef.current) endRef.current.scrollIntoView({ block: 'end' })
  }, [messages, messagesLoading])

  useEffect(function() {
    loadStudents()

    const channel = supabase
      .channel('chat_messages_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        function(payload: any) {
          const newMsg = payload.new

          if (selectedUserIdRef.current === newMsg.user_id) {
            setMessages(function(prev) { return prev.some(function(m) { return m.id === newMsg.id }) ? prev : [...prev, newMsg].sort(sortMessages) })
            if (newMsg.image_path) loadShots([newMsg])
          } else if (newMsg.role === 'user') {
            setUnread(function(prev) { const n = new Set(prev); n.add(newMsg.user_id); return n })
          }
          if (isToday(newMsg.created_at)) setMessagesToday(function(n) { return n + 1 })

          setStudents(function(prev) {
            const existing = prev.find(function(s) { return s.userId === newMsg.user_id })
            const updatedEntry = {
              userId: newMsg.user_id,
              name: existing?.name || 'Novo aluno',
              email: existing?.email || '',
              lastMessage: newMsg.content,
              lastRole: newMsg.role,
              lastAt: newMsg.created_at,
              count: (existing?.count || 0) + 1,
            }
            const rest = prev.filter(function(s) { return s.userId !== newMsg.user_id })
            return [updatedEntry, ...rest]
          })

          if (!knownUserIdsRef.current.has(newMsg.user_id)) {
            knownUserIdsRef.current.add(newMsg.user_id)
            supabase.from('profiles').select('full_name, email').eq('id', newMsg.user_id).single().then(function(res) {
              if (res.data) {
                setStudents(function(prev) {
                  return prev.map(function(s) {
                    return s.userId === newMsg.user_id ? { ...s, name: res.data.full_name || 'Sem nome', email: res.data.email || '' } : s
                  })
                })
              }
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_takeovers' },
        function(payload: any) {
          const row = payload.new
          if (!row || !row.user_id) return
          setTakeovers(function(prev) {
            const n = new Set(prev)
            if (row.active) n.add(row.user_id); else n.delete(row.user_id)
            return n
          })
        }
      )
      .subscribe()

    return function() { supabase.removeChannel(channel) }
  }, [])

  // Gera links temporarios (1 hora) para os prints guardados na pasta privada
  async function loadShots(list: any[]) {
    const paths = list.map(function(m) { return m.image_path }).filter(function(p) { return !!p })
    if (paths.length === 0) return
    const res = await supabase.storage.from('chat-prints').createSignedUrls(paths, 3600)
    if (res.data) {
      setShots(function(prev) {
        const next = { ...prev }
        res.data!.forEach(function(item: any) { if (item.path && item.signedUrl) next[item.path] = item.signedUrl })
        return next
      })
    }
  }

  async function loadStudents() {
    setLoading(true)
    try {
      const result = await supabase
        .from('chat_messages')
        .select('user_id, content, role, created_at, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(1000)

      // Do mais novo para o mais antigo; no empate, a resposta do Junior vem antes do aluno
      const rows = (result.data || []).slice().sort(function(a: any, b: any) { return sortMessages(b, a) })
      const byUser = new Map<string, any>()
      let todayCount = 0
      for (const row of rows) {
        if (isToday(row.created_at)) todayCount++
        const existing = byUser.get(row.user_id)
        if (!existing) {
          byUser.set(row.user_id, {
            userId: row.user_id,
            name: (row as any).profiles?.full_name || 'Sem nome',
            email: (row as any).profiles?.email || '',
            lastMessage: row.content,
            lastRole: row.role,
            lastAt: row.created_at,
            count: 1,
          })
        } else {
          existing.count++
        }
      }
      const studentList = Array.from(byUser.values())
      setStudents(studentList)
      setMessagesToday(todayCount)
      const tk = await supabase.from('chat_takeovers').select('user_id').eq('active', true)
      setTakeovers(new Set((tk.data || []).map(function(r: any) { return r.user_id })))
      knownUserIdsRef.current = new Set(studentList.map(function(s) { return s.userId }))
    } finally {
      setLoading(false)
    }
  }

  async function openConversation(userId: string) {
    setSelectedUserId(userId)
    setUnread(function(prev) { const n = new Set(prev); n.delete(userId); return n })
    setMessagesLoading(true)
    try {
      const result = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at, image_path')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(300)
      const loaded = (result.data || []).slice().sort(sortMessages)
      setMessages(loaded)
      loadShots(loaded)
    } finally {
      setMessagesLoading(false)
    }
  }

  async function setTakeover(userId: string, active: boolean) {
    const me = await supabase.auth.getUser()
    const res = await supabase.from('chat_takeovers').upsert(
      { user_id: userId, active: active, taken_by: me.data.user ? me.data.user.id : null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    if (res.error) { alert('Não foi possível alterar o atendimento: ' + res.error.message); return false }
    setTakeovers(function(prev) { const n = new Set(prev); if (active) n.add(userId); else n.delete(userId); return n })
    return true
  }

  async function sendAdminMessage() {
    const text = draft.trim()
    if (!text || !selectedUserId || sending) return
    setSending(true)
    try {
      // Ao responder, o Junior pausa nessa conversa
      if (!takeovers.has(selectedUserId)) {
        const ok = await setTakeover(selectedUserId, true)
        if (!ok) return
      }
      const res = await supabase
        .from('chat_messages')
        .insert({ user_id: selectedUserId, role: 'admin', content: text })
        .select('id, role, content, created_at, image_path')
        .single()
      if (res.error) { alert('Não foi possível enviar: ' + res.error.message); return }
      const saved = res.data
      if (saved) setMessages(function(prev) { return prev.some(function(m) { return m.id === saved.id }) ? prev : [...prev, saved].sort(sortMessages) })
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  function scrollCarousel(dir: number) {
    const el = trackRef.current
    if (!el) return
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * 520, behavior: reduce ? 'auto' : 'smooth' })
  }

  const selectedStudent = students.find(function(s) { return s.userId === selectedUserId })
  const studentsToday = students.filter(function(s) { return isToday(s.lastAt) }).length
  const waiting = students.filter(function(s) { return s.lastRole === 'user' }).length

  const filtered = students.filter(function(s) {
    if (filter === 'hoje' && !isToday(s.lastAt)) return false
    if (filter === 'aguardando' && s.lastRole !== 'user') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.lastMessage || '').toLowerCase().includes(q)
    }
    return true
  })

  const recent = students.slice(0, 14)

  return (
    <div className={'cv-root' + (selectedUserId ? ' has-chat' : '')}>
      <style>{css}</style>

      <div className="cv-head">
        <div>
          <h1 className="cv-title">Conversas com o Junior</h1>
          <p className="cv-sub">Acompanhe o que os alunos perguntam e como o Junior responde. Atualiza sozinho.</p>
        </div>
        <div className="cv-stats">
          <div className="cv-stat"><b>{students.length}</b><span>alunos</span></div>
          <div className="cv-stat"><b>{studentsToday}</b><span>conversaram hoje</span></div>
          <div className="cv-stat"><b>{messagesToday}</b><span>mensagens hoje</span></div>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="cv-carousel">
          <div className="cv-carousel-top">
            <div className="cv-carousel-label">Conversas mais recentes</div>
            <div className="cv-arrows">
              <button className="cv-arrow" onClick={function() { scrollCarousel(-1) }} aria-label="Anterior"><i className="ti ti-chevron-left" /></button>
              <button className="cv-arrow" onClick={function() { scrollCarousel(1) }} aria-label="Próximo"><i className="ti ti-chevron-right" /></button>
            </div>
          </div>
          <div className="cv-track" ref={trackRef}>
            {recent.map(function(student) {
              return (
                <button
                  key={student.userId}
                  className={'cv-card' + (student.userId === selectedUserId ? ' on' : '')}
                  onClick={function() { openConversation(student.userId) }}
                >
                  <div className="cv-card-top">
                    <Avatar name={student.name} size={34} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="cv-card-name">{student.name}</div>
                      <div className="cv-card-time">{timeAgo(student.lastAt)}</div>
                    </div>
                    {unread.has(student.userId) && <span className="cv-dot" title="Mensagem nova" />}
                  </div>
                  <div className="cv-card-msg">{student.lastMessage}</div>
                  {student.lastRole === 'user' && <span className="cv-wait">Sem resposta</span>}
                  {takeovers.has(student.userId) && <span className="cv-pill" style={{ marginLeft: student.lastRole === 'user' ? 6 : 0 }}>Atendimento humano</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className={'cv-main' + (selectedUserId ? ' has-chat' : '')}>
        <aside className="cv-list">
          <input
            className="cv-search"
            type="search"
            placeholder="Buscar aluno ou mensagem"
            value={search}
            onChange={function(e) { setSearch(e.target.value) }}
          />
          <div className="cv-chips">
            <button className={'cv-chip' + (filter === 'todos' ? ' on' : '')} onClick={function() { setFilter('todos') }}>Todos</button>
            <button className={'cv-chip' + (filter === 'hoje' ? ' on' : '')} onClick={function() { setFilter('hoje') }}>Hoje</button>
            <button className={'cv-chip' + (filter === 'aguardando' ? ' on' : '')} onClick={function() { setFilter('aguardando') }}>Sem resposta{waiting > 0 ? ' (' + waiting + ')' : ''}</button>
          </div>
          <div className="cv-items">
            {loading ? (
              <p style={{ padding: '8px 16px', color: 'var(--muted2)', fontSize: 13 }}>Carregando conversas...</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: '8px 16px', color: 'var(--muted2)', fontSize: 13 }}>
                {students.length === 0 ? 'Nenhum aluno conversou com o Junior ainda.' : 'Nenhuma conversa encontrada com esse filtro.'}
              </p>
            ) : (
              filtered.map(function(student) {
                return (
                  <button
                    key={student.userId}
                    className={'cv-item' + (student.userId === selectedUserId ? ' on' : '')}
                    onClick={function() { openConversation(student.userId) }}
                  >
                    <Avatar name={student.name} size={38} />
                    <div className="cv-item-body">
                      <div className="cv-item-row">
                        <span className="cv-item-name">{student.name}</span>
                        <span className="cv-item-time">{unread.has(student.userId) ? <span className="cv-dot" style={{ display: 'inline-block' }} title="Mensagem nova" /> : timeAgo(student.lastAt)}</span>
                      </div>
                      <div className="cv-item-msg">{student.lastRole === 'assistant' ? 'Junior: ' : student.lastRole === 'admin' ? 'Você: ' : ''}{student.lastMessage}</div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className="cv-chat">
          {!selectedUserId ? (
            <div className="cv-empty">
              <img src="/avatar-junior/junior.svg" alt="" width={64} height={64} style={{ borderRadius: '50%' }} />
              <div>Escolha um aluno para ler a conversa</div>
            </div>
          ) : (
            <>
              <div className="cv-chat-head">
                <button className="cv-back" onClick={function() { setSelectedUserId(null) }} aria-label="Voltar para a lista"><i className="ti ti-arrow-left" /></button>
                <Avatar name={selectedStudent?.name || '?'} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div className="cv-chat-name">{selectedStudent?.name}</div>
                  <div className="cv-chat-email">{selectedStudent?.email}</div>
                </div>
                <div className="cv-chat-count">{messages.length} mensagens</div>
                {takeovers.has(selectedUserId) ? (
                  <button className="cv-take" onClick={function() { setTakeover(selectedUserId, false) }}>Devolver ao Junior</button>
                ) : (
                  <button className="cv-take on" onClick={function() { setTakeover(selectedUserId, true) }}>Assumir conversa</button>
                )}
              </div>
              {takeovers.has(selectedUserId) && (
                <div className="cv-banner">Você está no comando. O Junior está pausado para este aluno e as suas respostas aparecem no chat dele.</div>
              )}
              <div className="cv-msgs">
                {messagesLoading ? (
                  <p style={{ color: 'var(--muted2)', fontSize: 13 }}>Carregando mensagens...</p>
                ) : (
                  messages.map(function(msg, idx) {
                    const isUser = msg.role === 'user'
                    const prev = messages[idx - 1]
                    const newDay = !prev || !isSameDay(new Date(prev.created_at), new Date(msg.created_at))
                    return (
                      <div key={msg.id || idx} style={{ display: 'contents' }}>
                        {newDay && <div className="cv-day">{dayLabel(msg.created_at)}</div>}
                        <div className={'cv-row' + (isUser ? ' user' : '')}>
                          {msg.role === 'assistant' && <img className="cv-bot-avatar" src="/avatar-junior/junior.svg" alt="Junior" />}
                          {msg.role === 'admin' && <div className="cv-human-avatar"><i className="ti ti-user" /></div>}
                          <div className={'cv-bubble ' + (isUser ? 'user' : msg.role === 'admin' ? 'human' : 'bot')}>
                            {msg.role === 'admin' && <span className="cv-human-label">Você (atendimento)</span>}
                            {msg.image_path && shots[msg.image_path] && (
                              <img className="cv-shot" src={shots[msg.image_path]} alt="Print enviado pelo aluno" onClick={function() { setZoomSrc(shots[msg.image_path]) }} />
                            )}
                            {msg.image_path && !shots[msg.image_path] && <span className="cv-shot-missing">Carregando print...</span>}
                            {!msg.image_path && isUser && (msg.content || '').indexOf('[imagem anexada]') !== -1 && <span className="cv-shot-missing">Print enviado antes de os prints serem guardados</span>}
                            <Linkified text={isUser ? (msg.content || '').replace(' [imagem anexada]', '').replace('[imagem anexada]', '') : msg.content} />
                            <span className="cv-time">{timeOnly(msg.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={endRef} />
              </div>
              <div className="cv-composer">
                <textarea
                  className="cv-textarea"
                  rows={2}
                  value={draft}
                  placeholder="Escreva para o aluno. Ao enviar, o Junior pausa nesta conversa."
                  onChange={function(e) { setDraft(e.target.value) }}
                  onKeyDown={function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMessage() }
                  }}
                />
                <button className="cv-send" onClick={sendAdminMessage} disabled={sending || !draft.trim()} aria-label="Enviar mensagem"><i className="ti ti-send" /></button>
              </div>
            </>
          )}
        </section>
      </div>

      {zoomSrc && (
        <div className="cv-zoom" onClick={function() { setZoomSrc(null) }}>
          <img src={zoomSrc} alt="Print do aluno" />
        </div>
      )}
    </div>
  )
}
