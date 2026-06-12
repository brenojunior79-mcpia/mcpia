'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './chat.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'mcpia_chat_history'

const welcomeMessage: Message = {
  role: 'assistant',
  content: 'Ola! Sou seu assistente de criacao de videos. Me conte sobre seu produto e o que voce quer mostrar no video — vou criar uma descricao perfeita para voce usar no gerador!'
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(function() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
        }
      }
    } catch (e) {
      console.error('Erro ao carregar historico:', e)
    }
    setHydrated(true)
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
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
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
          }),
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

  function copyText(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(function() { setCopied(null) }, 2000)
  }

  function clearHistory() {
    setMessages([welcomeMessage])
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Assistente de criativo</div>
          <div className={styles.sub}>Peca ajuda para criar a descricao do seu video · Copie e cole no Gerar video</div>
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
                  <div className={styles.avatar}><i className="ti ti-sparkles" /></div>
                )}
                <div className={styles.bubble}>
                  <div className={styles.bubbleText}>{msg.content}</div>
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
              <div className={styles.avatar}><i className="ti ti-sparkles" /></div>
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
          <div className={styles.suggestions}>
            {['Produto de emagrecimento', 'Ebook de autoajuda', 'Curso online', 'Suplemento'].map(function(s) {
              return (
                <button
                  key={s}
                  className={styles.chip}
                  onClick={function() { setInput('Quero um video para meu ' + s.toLowerCase()) }}
                >
                  {s}
                </button>
              )
            })}
          </div>
          <div className={styles.inputRow}>
            <textarea
              value={input}
              onChange={function(e) { setInput(e.target.value) }}
              onKeyDown={function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Descreva seu produto ou o que quer no video..."
              className={styles.input}
              rows={2}
            />
            <button className={styles.sendBtn} onClick={send} disabled={loading || !input.trim()}>
              <i className="ti ti-send" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
