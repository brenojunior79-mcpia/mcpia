'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from '../admin.module.css'
import { buildEmail, firstNameOf } from '@/lib/email-template'

const LINKS = [
  { value: '', label: 'Sem botão' },
  { value: '/dashboard', label: 'Painel do Aluno' },
  { value: '/dashboard/aulas', label: 'Aulas ao Vivo' },
  { value: '/dashboard/produtos', label: 'Produtos em Alta' },
  { value: '/dashboard/vendas', label: 'Vendendo no Automático' },
  { value: '/dashboard/planos', label: 'Planos' },
  { value: 'outro', label: 'Outro link (digitar)' },
]

const AUDIENCES = [
  { value: 'teste', label: 'Só eu (teste)' },
  { value: 'todos', label: 'Todos os alunos' },
  { value: 'sem_plano', label: 'Quem não tem plano' },
  { value: 'com_plano', label: 'Quem tem plano' },
]

function hasPlan(status: any) { return status === 'active' || status === 'trialing' }

export default function EmailsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [adminName, setAdminName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [linkChoice, setLinkChoice] = useState('')
  const [customLink, setCustomLink] = useState('')
  const [buttonText, setButtonText] = useState('')
  const [audience, setAudience] = useState('teste')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePath, setImagePath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageLinkChoice, setImageLinkChoice] = useState('')
  const [customImageLink, setCustomImageLink] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean, text: string } | null>(null)

  async function loadAll() {
    let all: any[] = []
    let from = 0
    while (true) {
      const r = await supabase
        .from('profiles')
        .select('id, email, subscription_status, email_unsubscribed')
        .order('id', { ascending: true })
        .range(from, from + 999)
      if (r.error) break
      const rows = r.data || []
      all = all.concat(rows)
      if (rows.length < 1000) break
      from += 1000
    }
    setPeople(all)
    const h = await supabase.from('email_broadcasts').select('*').order('created_at', { ascending: false }).limit(20)
    setHistory(h.data || [])
  }

  useEffect(function() {
    async function load() {
      const u = await supabase.auth.getUser()
      const user = u.data.user
      if (!user) { router.push('/login'); return }
      const p = await supabase.from('profiles').select('is_admin, full_name').eq('id', user.id).single()
      if (!p.data?.is_admin) { router.push('/dashboard'); return }
      setAdminName(firstNameOf(p.data?.full_name))
      await loadAll()
      setLoading(false)
    }
    load()
  }, [])

  const buttonUrl = linkChoice === 'outro' ? customLink.trim() : linkChoice
  const imageLink = imageLinkChoice === 'botao' ? buttonUrl : imageLinkChoice === 'outro' ? customImageLink.trim() : imageLinkChoice

  async function uploadImage(file: File | null | undefined) {
    setImageError('')
    if (!file) return
    const okTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (okTypes.indexOf(file.type) === -1) { setImageError('Use uma imagem JPG, PNG, WEBP ou GIF.'); return }
    if (file.size > 2 * 1024 * 1024) { setImageError('A imagem tem mais de 2 MB. Diminua o tamanho e tente de novo.'); return }
    setUploading(true)
    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg'
      const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
      const up = await supabase.storage.from('email-images').upload(path, file, { contentType: file.type, cacheControl: '31536000' })
      if (up.error) {
        setImageError('Não foi possível enviar a imagem: ' + up.error.message + (/bucket/i.test(up.error.message) ? ' (rode o arquivo R1-imagens-email.sql no Supabase)' : ''))
      } else {
        const pub = supabase.storage.from('email-images').getPublicUrl(path)
        // se havia outra imagem, apaga a anterior
        if (imagePath) { try { await supabase.storage.from('email-images').remove([imagePath]) } catch (e) {} }
        setImagePath(path)
        setImageUrl(pub.data.publicUrl)
      }
    } catch (e) {
      setImageError('Erro ao enviar a imagem. Tente de novo.')
    }
    setUploading(false)
  }

  async function removeImage() {
    const old = imagePath
    setImageUrl(''); setImagePath(''); setImageError(''); setImageLinkChoice(''); setCustomImageLink('')
    if (old) { try { await supabase.storage.from('email-images').remove([old]) } catch (e) {} }
  }

  function countFor(aud: string) {
    if (aud === 'teste') return 1
    return people.filter(function(p: any) {
      if (p.email_unsubscribed || !p.email) return false
      if (aud === 'sem_plano') return !hasPlan(p.subscription_status)
      if (aud === 'com_plano') return hasPlan(p.subscription_status)
      return true
    }).length
  }

  const totalWithEmail = people.filter(function(p: any) { return !!p.email }).length
  const unsubscribed = people.filter(function(p: any) { return p.email_unsubscribed }).length
  const targetCount = countFor(audience)

  const preview = buildEmail({
    subject: subject || 'Assunto do e-mail',
    message: message || 'A mensagem do e-mail vai aparecer aqui.\n\nUse {{nome}} para colocar o primeiro nome do aluno.',
    buttonText: buttonText,
    buttonUrl: buttonUrl,
    imageUrl: imageUrl,
    imageLink: imageLink,
    name: adminName || 'Maria',
    unsubscribeUrl: 'https://mcpia.site/api/email/unsubscribe?u=exemplo',
  })

  async function send() {
    setResult(null)
    if (!subject.trim() || !message.trim()) { setResult({ ok: false, text: 'Preencha o assunto e a mensagem.' }); return }
    if (audience !== 'teste') {
      const okConfirm = window.confirm('Enviar este e-mail para ' + targetCount + ' aluno(s)? Isso não pode ser desfeito.')
      if (!okConfirm) return
    }
    setSending(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), buttonText: buttonText.trim(), buttonUrl: buttonUrl, imageUrl: imageUrl, imageLink: imageLink, audience }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, text: data.error || 'Não foi possível enviar.' })
      } else {
        let t = 'Enviado para ' + data.sent + ' aluno(s).'
        if (data.failed || data.notSent) t += ' ' + ((data.failed || 0) + (data.notSent || 0)) + ' não foram enviados' + (data.firstError ? ' (' + data.firstError + ')' : '') + '.'
        setResult({ ok: !(data.failed || data.notSent), text: t })
        if (audience !== 'teste') { setSubject(''); setMessage(''); setImageUrl(''); setImagePath(''); setImageLinkChoice(''); setCustomImageLink('') }
        await loadAll()
      }
    } catch (e) {
      setResult({ ok: false, text: 'Erro de conexão. Tente de novo.' })
    }
    setSending(false)
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div className={styles.loading}>
      <i className="ti ti-loader" style={{ fontSize: 32 }} />
    </div>
  )

  const input: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>E-mails</div>
          <div className={styles.sub}>Envie convites e lembretes para o e-mail dos alunos</div>
        </div>
      </div>
      <div className={styles.content}>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Alunos com e-mail</div>
            <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{totalWithEmail}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>{countFor('todos')} podem receber</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Saíram da lista</div>
            <div className={styles.statValue}>{unsubscribed}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>não recebem mais e-mails</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Envios feitos</div>
            <div className={styles.statValue}>{history.length >= 20 ? '20+' : history.length}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>veja o histórico abaixo</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 28 }}>
          <div className={styles.tableCard} style={{ padding: 20 }}>
            <div className={styles.tableTitle} style={{ marginBottom: 16 }}>Novo e-mail</div>

            <label style={label}>Assunto ({subject.length}/120)</label>
            <input style={input} maxLength={120} value={subject} onChange={function(e) { setSubject(e.target.value) }} placeholder="Ex: Hoje tem aula ao vivo às 20h 🔴" />

            <label style={{ ...label, marginTop: 14 }}>Mensagem</label>
            <textarea style={{ ...input, minHeight: 150, resize: 'vertical' }} value={message} onChange={function(e) { setMessage(e.target.value) }} placeholder={'Oi, {{nome}}!\n\nHoje às 20h tem aula ao vivo dentro da plataforma.\n\nTe espero lá!'} />
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6 }}>
              Use <b>{'{{nome}}'}</b> para o primeiro nome do aluno e <b>**texto**</b> para negrito. Linha em branco separa parágrafos.
            </div>

            <label style={{ ...label, marginTop: 14 }}>Imagem no topo (opcional)</label>
            {imageUrl ? (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--surface2)' }}>
                <img src={imageUrl} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={removeImage} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--red)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Remover imagem</button>
                  <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Ao clicar na imagem:</span>
                  <select style={{ ...input, width: 'auto', padding: '7px 10px', fontSize: 12 }} value={imageLinkChoice} onChange={function(e) { setImageLinkChoice(e.target.value) }}>
                    <option value="">Não abre nada</option>
                    <option value="botao">Mesmo link do botão</option>
                    {LINKS.filter(function(l) { return l.value !== '' && l.value !== 'outro' }).map(function(l) { return <option key={l.value} value={l.value}>{l.label}</option> })}
                    <option value="outro">Outro link (digitar)</option>
                  </select>
                </div>
                {imageLinkChoice === 'outro' && (
                  <input style={{ ...input, marginTop: 8 }} value={customImageLink} onChange={function(e) { setCustomImageLink(e.target.value) }} placeholder="https://..." />
                )}
                {imageLinkChoice === 'botao' && !buttonUrl && (
                  <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>Escolha um botão abaixo para a imagem usar o mesmo link.</div>
                )}
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 12px', borderRadius: 12, border: '2px dashed var(--border)', background: 'var(--surface2)', color: 'var(--muted2)', fontSize: 13, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer' }}>
                <i className="ti ti-photo-up" style={{ fontSize: 20 }} />
                {uploading ? 'Enviando imagem...' : 'Escolher imagem do computador'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} style={{ display: 'none' }} onChange={function(e) { uploadImage(e.target.files && e.target.files[0]); e.target.value = '' }} />
              </label>
            )}
            {imageError && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{imageError}</div>}
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6 }}>JPG, PNG, WEBP ou GIF, até 2 MB. Largura ideal: 1200 px (fica com 600 px no e-mail).</div>

            <label style={{ ...label, marginTop: 14 }}>Botão (opcional)</label>
            <select style={input} value={linkChoice} onChange={function(e) { setLinkChoice(e.target.value) }}>
              {LINKS.map(function(l) { return <option key={l.value} value={l.value}>{l.label}</option> })}
            </select>
            {linkChoice === 'outro' && (
              <input style={{ ...input, marginTop: 8 }} value={customLink} onChange={function(e) { setCustomLink(e.target.value) }} placeholder="https://..." />
            )}
            {linkChoice !== '' && (
              <input style={{ ...input, marginTop: 8 }} maxLength={40} value={buttonText} onChange={function(e) { setButtonText(e.target.value) }} placeholder="Texto do botão. Ex: Entrar na aula" />
            )}

            <label style={{ ...label, marginTop: 14 }}>Enviar para</label>
            <select style={input} value={audience} onChange={function(e) { setAudience(e.target.value) }}>
              {AUDIENCES.map(function(a) { return <option key={a.value} value={a.value}>{a.label} ({countFor(a.value)})</option> })}
            </select>

            <button
              onClick={send}
              disabled={sending}
              style={{ width: '100%', marginTop: 18, padding: '13px 16px', borderRadius: 12, border: audience === 'teste' ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: audience === 'teste' ? 'var(--surface2)' : 'linear-gradient(135deg, #5b4ef8, #ec4899)', color: audience === 'teste' ? 'var(--text)' : '#fff', fontWeight: 800, fontSize: 15, opacity: sending ? 0.7 : 1 }}
            >
              {sending ? 'Enviando... (pode levar alguns segundos)' : audience === 'teste' ? 'Enviar teste para mim' : 'Enviar para ' + targetCount + ' aluno(s)'}
            </button>

            {result && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, fontSize: 13, background: result.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: result.ok ? 'var(--green)' : 'var(--red)' }}>
                {result.text}
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>
              Dica: envie sempre um teste para você primeiro e confira se não caiu no spam. Todo e-mail leva o link "sair da lista".
            </div>
          </div>

          <div className={styles.tableCard} style={{ padding: 20 }}>
            <div className={styles.tableTitle} style={{ marginBottom: 16 }}>Como vai aparecer</div>
            <iframe
              title="Prévia do e-mail"
              srcDoc={preview.html}
              style={{ width: '100%', height: 560, border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}
            />
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Últimos envios</div>
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)', fontSize: 13 }}>Nenhum envio ainda.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted2)' }}>
                    <th style={{ padding: '10px 18px' }}>Quando</th>
                    <th style={{ padding: '10px 18px' }}>Assunto</th>
                    <th style={{ padding: '10px 18px' }}>Público</th>
                    <th style={{ padding: '10px 18px' }}>Enviados</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(function(h: any) {
                    const aud = AUDIENCES.filter(function(a) { return a.value === h.audience })[0]
                    return (
                      <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}>{fmt(h.created_at)}</td>
                        <td style={{ padding: '10px 18px' }}>{h.subject}</td>
                        <td style={{ padding: '10px 18px' }}>{aud ? aud.label : h.audience}</td>
                        <td style={{ padding: '10px 18px' }}>{h.sent_count} de {h.total}{h.failed_count ? ' (' + h.failed_count + ' não enviados)' : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
