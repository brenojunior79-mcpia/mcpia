'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './chat.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Olá! Sou seu assistente de criação de vídeos. Me conte sobre seu produto e o que você quer mostrar no vídeo — vou criar uma descrição perfeita para você usar no gerador!'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
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
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role !== 'assistant' || newMessages.indexOf(m) > 0)
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
    }
    setLoading(false)
  }

  function copyText(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Assistente de criativo</div>
          <div className={styles.sub}>Peça ajuda para criar a descrição do seu vídeo · Copie e cole no Gerar vídeo</div>
        </div>
      </div>

      <div className={styles.chatWrap}>
        <div className={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.msg} ${msg.role === 'user' ? styles.msgUser : styles.msgBot}`}>
              {msg.role === 'assistant' && (
                <div className={styles.avatar}><i className="ti ti-sparkles"/></div>
              )}
              <div className={styles.bubble}>
                <div className={styles.bubbleText}>{msg.content}</div>
                {msg.role === 'assistant' && i > 0 && (
                  <button className={styles.copyBtn} onClick={() => copyText(msg.content, i)}>
                    {copied === i ? <><i className="ti ti-check"/> Copiado!</> : <><i className="ti ti-copy"/> Copiar</>}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className={`${styles.msg} ${styles.msgBot}`}>
              <div className={styles.avatar}><i className="ti ti-sparkles"/></div>
              <div className={styles.bubble}>
                <div className={styles.typing}>
                  <span/><span/><span/>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div className={styles.inputWrap}>
          <div className={styles.suggestions}>
            {['Produto de emagrecimento', 'Ebook de autoajuda', 'Curso online', 'Suplemento'].map(s => (
              <button key={s} className={styles.chip} onClick={() => setInput(`Quero um vídeo para meu ${s.toLowerCase()}`)}>
                {s}
              </button>
            ))}
          </div>
          <div className={styles.inputRow}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
              placeholder="Descreva seu produto ou o que quer no vídeo..."
              className={styles.input}
              rows={2}
            />
            <button className={styles.sendBtn} onClick={send} disabled={loading || !input.trim()}>
              <i className="ti ti-send"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
