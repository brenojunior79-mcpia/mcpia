'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './chat.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
}

const STORAGE_KEY = 'mcpia_chat_history'

function buildWelcome(firstName: string): Message {
  const name = firstName ? ', ' + firstName : ''
  return {
    role: 'assistant',
    content: 'A paz do Senhor' + name + '!\n\nEu sou o Junior, assistente da Mentoria Cristao Prospero.\n\nVou te ajudar agora!',
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([buildWelcome('')])
  const [firstName, setFirstName] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(function() {
    async function init() {
      let name = ''
      try {
        const userResult = await supabase.auth.getUser()
        const user = userResult.data.user
        if (user) {
          const profileResult = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
          name = ((profileResult.data?.full_name || '').split(' ')[0]) || ''
        }
      } catch (e) {}
      setFirstName(name)

      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed)
            setHydrated(true)
            return
          }
        }
      } catch (e) {
        console.error('Erro ao carregar historico:', e)
      }
      setMessages([buildWelcome(name)])
      setHydrated(true)
    }
    init()
  }, [])

  useEffect(function() {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch (e) {
      console.error('Erro ao salvar historico:', e)
    }
  }, [messages, hydrated])

  useEffect(function() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if ((!input.trim() && !pendingImage) || loading) return
    const userMsg: Message = { role: 'user', content: input.trim(), imageUrl: pendingImage || undefined }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    const imageToSend = pendingImage
    setPendingImage(null)
    setLoading(true)

    try {
      const sessionResult = await supabase.auth.getSession()
      const session = sessionResult.data.session
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (session ? session.access_token : ''),
        },
        body: JSON.stringify({
          messages: newMessages.filter(function(m, idx) {
            return m.role !== 'assistant' || idx > 0
          }).map(function(m) { return { role: m.role, content: m.content } }),
          imageBase64: imageToSend,
        }),
      })
      const data = await res.json()
      setMessages(function(prev) {
        return [...prev, { role: 'assistant', content: data.reply || 'Erro ao gerar resposta.' }]
      })
    } catch {
      setMessages(function(prev) {
        return [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }]
      })
    }
    setLoading(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem (print da tela).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem precisa ter no maximo 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = function() { setPendingImage(reader.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function copyText(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(function() { setCopied(null) }, 2000)
  }

  function clearHistory() {
    setMessages([buildWelcome(firstName)])
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src="/avatar-junior/junior.svg"
              alt="Junior"
              style={{ width: 44, height: 44, borderRadius: '50%', display: 'block' }}
            />
            <span style={{
              position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%',
              background: '#22c55e', border: '2px solid var(--surface)',
            }} />
          </div>
          <div>
            <div className={styles.title}>Junior</div>
            <div className={styles.sub}>Sou o Junior e estou online para te ajudar</div>
          </div>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearHistory}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted2)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-trash" /> Limpar chat
          </button>
        )}
      </div>

      <div className={styles.chatWrap}>
        <div className={styles.messages}>
          {messages.map(function(msg, i) {
            return (
              <div key={i} className={styles.msg + ' ' + (msg.role === 'user' ? styles.msgUser : styles.msgBot)}>
                {msg.role === 'assistant' && (
                  <div className={styles.avatar}><img src="/avatar-junior/junior.svg" alt="Junior" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /></div>
                )}
                <div className={styles.bubble}>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Print enviado" style={{ maxWidth: '100%', borderRadius: 10, marginBottom: msg.content ? 8 : 0, display: 'block' }} />
                  )}
                  {msg.content && <div className={styles.bubbleText}>{msg.content}</div>}
                  {msg.role === 'assistant' && i > 0 && (
                    <button className={styles.copyBtn} onClick={function() { copyText(msg.content, i) }}>
                      {copied === i
                        ? <><i className="ti ti-check" /> Copiado!</>
                        : <><i className="ti ti-copy" /> Copiar</>
                      }
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {loading && (
            <div className={styles.msg + ' ' + styles.msgBot}>
              <div className={styles.avatar}><img src="/avatar-junior/junior.svg" alt="Junior" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /></div>
              <div className={styles.bubble}>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className={styles.inputWrap}>
          {pendingImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
              <img src={pendingImage} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
              <span style={{ fontSize: 12, color: 'var(--muted2)', flex: 1 }}>Print anexado</span>
              <button
                onClick={function() { setPendingImage(null) }}
                style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 16, padding: 4 }}
                aria-label="Remover imagem"
              >
                <i className="ti ti-x" />
              </button>
            </div>
          )}
          <div className={styles.inputRow}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={function() { fileInputRef.current?.click() }}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, width: 42, height: 42, flexShrink: 0, color: 'var(--muted2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}
              aria-label="Anexar print"
              title="Anexar um print da tela"
            >
              <i className="ti ti-paperclip" />
            </button>
            <textarea
              value={input}
              onChange={function(e) { setInput(e.target.value) }}
              onKeyDown={function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Conte o que esta acontecendo, ou anexe um print..."
              className={styles.input}
              rows={2}
            />
            <button className={styles.sendBtn} onClick={send} disabled={loading || (!input.trim() && !pendingImage)}>
              <i className="ti ti-send" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
