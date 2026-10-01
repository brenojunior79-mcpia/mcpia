'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function ConversasAdminPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const supabase = createClient()
  const selectedUserIdRef = useRef<string | null>(null)
  const knownUserIdsRef = useRef<Set<string>>(new Set())

  useEffect(function() { selectedUserIdRef.current = selectedUserId }, [selectedUserId])

  useEffect(function() {
    loadStudents()

    const channel = supabase
      .channel('chat_messages_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        function(payload: any) {
          const newMsg = payload.new

          // Se a conversa aberta agora e a desse aluno, acrescenta a mensagem na hora
          if (selectedUserIdRef.current === newMsg.user_id) {
            setMessages(function(prev) { return [...prev, newMsg] })
          }

          // Atualiza (ou cria) a linha desse aluno na lista da esquerda, trazendo pro topo
          setStudents(function(prev) {
            const existing = prev.find(function(s) { return s.userId === newMsg.user_id })
            const updatedEntry = {
              userId: newMsg.user_id,
              name: existing?.name || 'Novo aluno',
              email: existing?.email || '',
              lastMessage: newMsg.content,
              lastAt: newMsg.created_at,
            }
            const rest = prev.filter(function(s) { return s.userId !== newMsg.user_id })
            return [updatedEntry, ...rest]
          })

          // Se for um aluno novo (nunca visto nessa sessao), busca o nome/email dele uma vez
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
      .subscribe()

    return function() { supabase.removeChannel(channel) }
  }, [])

  async function loadStudents() {
    setLoading(true)
    try {
      // Pega as mensagens mais recentes, depois agrupa por aluno aqui no front
      const result = await supabase
        .from('chat_messages')
        .select('user_id, content, role, created_at, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(500)

      const rows = result.data || []
      const byUser = new Map<string, any>()
      for (const row of rows) {
        if (!byUser.has(row.user_id)) {
          byUser.set(row.user_id, {
            userId: row.user_id,
            name: (row as any).profiles?.full_name || 'Sem nome',
            email: (row as any).profiles?.email || '',
            lastMessage: row.content,
            lastAt: row.created_at,
          })
        }
      }
      const studentList = Array.from(byUser.values())
      setStudents(studentList)
      knownUserIdsRef.current = new Set(studentList.map(function(s) { return s.userId }))
    } finally {
      setLoading(false)
    }
  }

  async function openConversation(userId: string) {
    setSelectedUserId(userId)
    setMessagesLoading(true)
    try {
      const result = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(200)
      setMessages(result.data || [])
    } finally {
      setMessagesLoading(false)
    }
  }

  const selectedStudent = students.find(function(s) { return s.userId === selectedUserId })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex' }}>
      <div style={{ width: 320, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '20px 20px 14px' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>💬 Conversas com o Junior</h1>
          <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>{students.length} aluno(s) com conversas</p>
        </div>

        {loading ? (
          <p style={{ padding: '0 20px', color: 'var(--muted2)', fontSize: 13 }}>Carregando...</p>
        ) : students.length === 0 ? (
          <p style={{ padding: '0 20px', color: 'var(--muted2)', fontSize: 13 }}>Nenhuma conversa ainda.</p>
        ) : (
          students.map(function(student) {
            const isSelected = student.userId === selectedUserId
            return (
              <div
                key={student.userId}
                onClick={function() { openConversation(student.userId) }}
                style={{
                  padding: '14px 20px', cursor: 'pointer',
                  background: isSelected ? 'var(--accent-glow)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 4 }}>{student.email}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.lastMessage}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{formatDate(student.lastAt)}</div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!selectedUserId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)', fontSize: 14 }}>
            Selecione um aluno pra ver a conversa
          </div>
        ) : (
          <>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedStudent?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{selectedStudent?.email}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messagesLoading ? (
                <p style={{ color: 'var(--muted2)', fontSize: 13 }}>Carregando mensagens...</p>
              ) : (
                messages.map(function(msg) {
                  const isUser = msg.role === 'user'
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%', padding: '10px 14px', borderRadius: 14,
                        background: isUser ? 'var(--accent)' : 'var(--surface2)',
                        color: isUser ? '#fff' : 'var(--text)',
                        fontSize: 13, lineHeight: 1.5,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 3 }}>{isUser ? 'Aluno' : 'Junior'}</div>
                        {msg.content}
                        <div style={{ fontSize: 9, opacity: 0.6, marginTop: 4 }}>{formatDate(msg.created_at)}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
