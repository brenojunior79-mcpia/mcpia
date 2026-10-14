'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import styles from './paginas.module.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site'

interface SalesPage {
  id: string
  slug: string
  product_name: string
  theme: string
  views: number
  created_at: string
  active: boolean
}

interface Testimonial { name: string; role: string; text: string }

interface FormState {
  productName: string
  description: string
  price: string
  oldPrice: string
  period: string
  audience: string
  pains: string[]
  benefits: string[]
  howto: string
  bonus: string
  testimonials: Testimonial[]
  mediaType: string
  mediaUrl: string
  guarantee: string
  checkoutUrl: string
  pixelId: string
  accent: string
  theme: string
  customPrompt: string
}

const ACCENTS = ['#7c5cfc', '#2563eb', '#16a34a', '#ea580c', '#e11d48', '#0f766e']

function VideoLesson({ videoId, title, color }: { videoId: string; title: string; color: string }) {
  const [playing, setPlaying] = useState(false)
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(function() {
    let active = true
    fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent('https://vimeo.com/' + videoId))
      .then(function(res) { return res.ok ? res.json() : null })
      .then(function(data) { if (active && data && data.thumbnail_url) setThumb(data.thumbnail_url) })
      .catch(function() {})
    return function() { active = false }
  }, [videoId])

  if (playing) {
    return (
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <iframe
          src={'https://player.vimeo.com/video/' + videoId + '?title=0&byline=0&portrait=0&dnt=1&autoplay=1'}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          allowFullScreen
          title={title}
        />
      </div>
    )
  }

  return (
    <div
      onClick={function() { setPlaying(true) }}
      role="button"
      aria-label={'Assistir: ' + title}
      style={{
        position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 12,
        overflow: 'hidden', cursor: 'pointer',
        background: thumb ? '#000' : 'linear-gradient(135deg,' + color + 'dd,' + color + '88)',
        backgroundImage: thumb ? 'url(' + thumb + ')' : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.35) 100%)' }} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ width: 0, height: 0, marginLeft: 4, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: '18px solid ' + color }} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-player-play" style={{ color: '#fff', fontSize: 13, opacity: 0.85 }} />
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{title}</span>
      </div>
    </div>
  )
}

export default function PaginasPage() {
  const [tab, setTab] = useState<string>('criar')
  const [pages, setPages] = useState<SalesPage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [result, setResult] = useState<{ slug: string; url: string } | null>(null)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [form, setForm] = useState<FormState>({
    productName: '',
    description: '',
    price: '',
    oldPrice: '',
    period: 'pagamento único',
    audience: '',
    pains: ['', '', ''],
    benefits: ['', '', ''],
    howto: '',
    bonus: '',
    testimonials: [],
    mediaType: 'ai',
    mediaUrl: '',
    guarantee: '7 dias de garantia',
    checkoutUrl: '',
    pixelId: '',
    accent: '#7c5cfc',
    theme: 'light',
    customPrompt: '',
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(function() {
    checkSubscription()
    if (tab === 'minhas') loadPages()
  }, [tab])

  async function checkSubscription() {
    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) { router.push('/login'); return }
    const result = await supabase.from('profiles').select('subscription_status').eq('id', user.id).single()
    const status = result.data?.subscription_status
    const active = status === 'active' || status === 'trialing'
    setHasSubscription(active)
    if (!active) { router.push('/dashboard/planos') }
  }

  async function loadPages() {
    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) return
    const res = await supabase.from('sales_pages').select('id, slug, product_name, theme, views, created_at, active').eq('user_id', user.id).order('created_at', { ascending: false })
    setPages((res.data as SalesPage[]) || [])
  }

  function setField(key: string, value: string) {
    setForm(function(f) { return Object.assign({}, f, { [key]: value }) })
  }

  function setBenefit(i: number, value: string) {
    const b = [...form.benefits]
    b[i] = value
    setForm(function(f) { return Object.assign({}, f, { benefits: b }) })
  }

  function setPain(i: number, value: string) {
    const p = [...form.pains]
    p[i] = value
    setForm(function(f) { return Object.assign({}, f, { pains: p }) })
  }

  function addPain() {
    if (form.pains.length < 5) setForm(function(f) { return Object.assign({}, f, { pains: [...f.pains, ''] }) })
  }

  function setTestimonial(i: number, key: string, value: string) {
    const t = form.testimonials.map(function(x, idx) { return idx === i ? Object.assign({}, x, { [key]: value }) : x })
    setForm(function(f) { return Object.assign({}, f, { testimonials: t }) })
  }

  function addTestimonial() {
    if (form.testimonials.length < 4) setForm(function(f) { return Object.assign({}, f, { testimonials: [...f.testimonials, { name: '', role: '', text: '' }] }) })
  }

  function removeTestimonial(i: number) {
    setForm(function(f) { return Object.assign({}, f, { testimonials: f.testimonials.filter(function(_, idx) { return idx !== i }) }) })
  }

  function addBenefit() {
    if (form.benefits.length < 7) {
      setForm(function(f) { return Object.assign({}, f, { benefits: [...f.benefits, ''] }) })
    }
  }

  async function gerar() {
    if (!hasSubscription) {
      window.location.href = '/dashboard/planos'
      return
    }
    const benefits = form.benefits.filter(function(b) { return b.trim() })
    if (!form.productName || !form.price || !form.audience || benefits.length < 2) {
      alert('Preencha: nome, preco, publico-alvo e pelo menos 2 itens de conteudo.')
      return
    }
    if (form.mediaType === 'video' && !/^https?:\/\//i.test(form.mediaUrl.trim())) {
      alert('Cole o link do video (YouTube ou Vimeo).')
      return
    }
    if (form.pixelId.trim() && !/^\d{6,20}$/.test(form.pixelId.replace(/\s/g, ''))) {
      alert('O ID do pixel do Facebook tem so numeros (de 6 a 20 digitos).')
      return
    }
    setLoading(true)
    setResult(null)
    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session
    const res = await fetch('/api/generate-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session ? session.access_token : '') },
      body: JSON.stringify(Object.assign({}, form, {
        benefits: benefits,
        pains: form.pains.filter(function(p) { return p.trim() }),
        howto: form.howto.split('\n').filter(function(l) { return l.trim() }),
        testimonials: form.testimonials.filter(function(t) { return t.name.trim() && t.text.trim() }),
      })),
    })
    const data = await res.json()
    setLoading(false)
    if (data.requiresPlan) {
      window.location.href = '/dashboard/planos'
    } else if (data.url) {
      setResult(data)
    } else {
      alert('Erro: ' + (data.error || 'Tente novamente'))
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('sales_pages').update({ active: !active }).eq('id', id)
    loadPages()
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.title}>Criador de site</div>
        <div className={styles.sub}>Crie paginas de alta conversao com IA em segundos</div>
      </div>

      <div style={{ margin: '0 24px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 38, height: 38, background: 'var(--surface2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎬</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Aula: Gerando site</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Veja o passo a passo antes de criar a sua pagina</div>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <VideoLesson videoId="1201837708" title="Gerando site" color="#7c5cfc" />
        </div>
      </div>

      {hasSubscription === false && (
        <div style={{ margin: '0 24px 16px', display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.25)' }}>
          <span>🔒</span>
          <div>
            <p style={{ fontWeight: 600, color: '#a78bfa', margin: '0 0 4px 0', fontSize: 14 }}>Recurso exclusivo para assinantes</p>
            <p style={{ color: '#9ca3af', margin: '0 0 8px 0', fontSize: 13 }}>Assine um plano para criar paginas de vendas com IA.</p>
            <a href="/dashboard/planos" style={{ color: '#7c5cfc', fontSize: 13, fontWeight: 600 }}>Ver planos</a>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <div className={styles.tab + (tab === 'criar' ? ' ' + styles.active : '')} onClick={function() { setTab('criar') }}>Criar pagina</div>
        <div className={styles.tab + (tab === 'minhas' ? ' ' + styles.active : '')} onClick={function() { setTab('minhas') }}>Minhas paginas</div>
      </div>

      {tab === 'criar' && (
        <div className={styles.content}>
          {result ? (
            <div className={styles.successBox}>
              <div className={styles.successIcon}><i className="ti ti-check" /></div>
              <h2>Pagina criada!</h2>
              <p>Sua pagina esta publicada e pronta para receber visitas.</p>
              <a href={result.url} target="_blank" rel="noreferrer" className={styles.pageUrl}>
                <i className="ti ti-external-link" /> {result.url}
              </a>
              <div className={styles.successActions}>
                <button className={styles.btnCopy} onClick={function() { navigator.clipboard.writeText(result!.url) }}>
                  <i className="ti ti-copy" /> Copiar link
                </button>
                <button className={styles.btnNew} onClick={function() { setResult(null) }}>
                  <i className="ti ti-plus" /> Criar outra
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.form}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>1. Sobre o produto</div>
                <div className={styles.field}>
                  <label>Nome do produto *</label>
                  <input type="text" value={form.productName} onChange={function(e) { setField('productName', e.target.value) }} placeholder="Ex: Curso de Trafego Pago" />
                </div>
                <div className={styles.field}>
                  <label>O que e o produto e como funciona</label>
                  <textarea value={form.description} onChange={function(e) { setField('description', e.target.value) }} placeholder="Ex: Curso em video com 30 aulas, acesso pelo celular, suporte no WhatsApp..." rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div className={styles.field}>
                  <label>Publico-alvo *</label>
                  <input type="text" value={form.audience} onChange={function(e) { setField('audience', e.target.value) }} placeholder="Ex: Empreendedores que querem vender mais no Instagram" />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>2. Imagem ou video (logo abaixo do titulo)</div>
                <div className={styles.themes} style={{ marginBottom: 14, flexWrap: 'wrap' }}>
                  {[{ id: 'ai', nome: 'Imagem criada pela IA' }, { id: 'image', nome: 'Minha imagem (link)' }, { id: 'video', nome: 'Video (YouTube/Vimeo)' }, { id: 'none', nome: 'Sem midia' }].map(function(o) {
                    return <div key={o.id} className={styles.themeOpt + (form.mediaType === o.id ? ' ' + styles.themeOn : '')} style={{ minWidth: 150 }} onClick={function() { setField('mediaType', o.id) }}>{o.nome}</div>
                  })}
                </div>
                {(form.mediaType === 'image' || form.mediaType === 'video') && (
                  <div className={styles.field}>
                    <label>{form.mediaType === 'video' ? 'Link do video' : 'Link da imagem'}</label>
                    <input type="url" value={form.mediaUrl} onChange={function(e) { setField('mediaUrl', e.target.value) }} placeholder={form.mediaType === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://...'} />
                  </div>
                )}
                {form.mediaType === 'ai' && <div className={styles.sub2} style={{ marginTop: 0 }}>A IA cria uma imagem do produto. Voce troca depois no editor, se quiser.</div>}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>3. Dores do seu publico</div>
                <div className={styles.sub2}>O que incomoda seu cliente hoje? De 2 a 5. Se deixar vazio, a IA deduz.</div>
                {form.pains.map(function(b, i) {
                  return (
                    <div key={i} className={styles.benefitRow}>
                      <span className={styles.benefitNum}>{i + 1}</span>
                      <input type="text" value={b} onChange={function(e) { setPain(i, e.target.value) }} placeholder={i === 0 ? 'Ex: Posta todo dia e ninguem compra' : 'Dor ' + (i + 1)} />
                    </div>
                  )
                })}
                {form.pains.length < 5 && (
                  <button className={styles.btnAddBenefit} onClick={addPain}><i className="ti ti-plus" /> Adicionar dor</button>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>4. Conteudo / sumario *</div>
                <div className={styles.sub2}>O que a pessoa recebe? Modulos, aulas, arquivos. Minimo 2, maximo 7.</div>
                {form.benefits.map(function(b, i) {
                  return (
                    <div key={i} className={styles.benefitRow}>
                      <span className={styles.benefitNum}>{i + 1}</span>
                      <input type="text" value={b} onChange={function(e) { setBenefit(i, e.target.value) }} placeholder={'Item ' + (i + 1)} />
                    </div>
                  )
                })}
                {form.benefits.length < 7 && (
                  <button className={styles.btnAddBenefit} onClick={addBenefit}><i className="ti ti-plus" /> Adicionar item</button>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>5. Depoimentos reais (opcional)</div>
                <div className={styles.sub2}>Use so depoimentos de clientes de verdade. A IA nao inventa depoimentos; sem eles, a secao fica escondida.</div>
                {form.testimonials.map(function(t, i) {
                  return (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                      <div className={styles.row}>
                        <div className={styles.field}><label>Nome</label><input type="text" value={t.name} onChange={function(e) { setTestimonial(i, 'name', e.target.value) }} /></div>
                        <div className={styles.field}><label>Profissao / cidade</label><input type="text" value={t.role} onChange={function(e) { setTestimonial(i, 'role', e.target.value) }} /></div>
                      </div>
                      <div className={styles.field} style={{ marginBottom: 6 }}><label>Depoimento</label><textarea value={t.text} onChange={function(e) { setTestimonial(i, 'text', e.target.value) }} rows={2} style={{ resize: 'vertical' }} /></div>
                      <button onClick={function() { removeTestimonial(i) }} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>Remover</button>
                    </div>
                  )
                })}
                {form.testimonials.length < 4 && (
                  <button className={styles.btnAddBenefit} onClick={addTestimonial}><i className="ti ti-plus" /> Adicionar depoimento</button>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>6. Como usar o produto (opcional)</div>
                <div className={styles.field}>
                  <label>Um passo por linha. Se deixar vazio, a IA monta 3 ou 4 passos.</label>
                  <textarea value={form.howto} onChange={function(e) { setField('howto', e.target.value) }} placeholder={'Acesse a area de membros\nAssista a aula 1\nFaca o exercicio do dia'} rows={4} style={{ resize: 'vertical' }} />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>7. Bonus (opcional)</div>
                <div className={styles.field}>
                  <label>Um bonus por linha (ate 4)</label>
                  <textarea value={form.bonus} onChange={function(e) { setField('bonus', e.target.value) }} placeholder={'Planilha de controle de anuncios\nGrupo VIP no WhatsApp'} rows={3} style={{ resize: 'vertical' }} />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>8. Oferta *</div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Preco (R$) *</label>
                    <input type="text" value={form.price} onChange={function(e) { setField('price', e.target.value) }} placeholder="297" />
                  </div>
                  <div className={styles.field}>
                    <label>Preco "de" (riscado, opcional)</label>
                    <input type="text" value={form.oldPrice} onChange={function(e) { setField('oldPrice', e.target.value) }} placeholder="497" />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Tipo de cobranca</label>
                    <input type="text" value={form.period} onChange={function(e) { setField('period', e.target.value) }} placeholder="pagamento unico" />
                  </div>
                  <div className={styles.field}>
                    <label>Link do checkout</label>
                    <input type="url" value={form.checkoutUrl} onChange={function(e) { setField('checkoutUrl', e.target.value) }} placeholder="https://pay.hotmart.com/..." />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>9. Garantia</div>
                <div className={styles.field}>
                  <label>Prazo da garantia</label>
                  <input type="text" value={form.guarantee} onChange={function(e) { setField('guarantee', e.target.value) }} placeholder="Ex: 7 dias de garantia incondicional" />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Pixel do Facebook (opcional)</div>
                <div className={styles.field}>
                  <label>ID do pixel</label>
                  <input type="text" value={form.pixelId} onChange={function(e) { setField('pixelId', e.target.value) }} placeholder="Ex: 123456789012345" />
                </div>
                <div className={styles.sub2} style={{ marginTop: 0 }}>A pagina registra a visita e o clique no botao de compra (PageView, ViewContent e InitiateCheckout). Voce acha o ID no Gerenciador de Eventos do Facebook.</div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Visual</div>
                <div className={styles.themes} style={{ marginBottom: 14 }}>
                  <div className={styles.themeOpt + (form.theme === 'light' ? ' ' + styles.themeOn : '')} onClick={function() { setField('theme', 'light') }}>Claro</div>
                  <div className={styles.themeOpt + (form.theme === 'dark' ? ' ' + styles.themeOn : '')} onClick={function() { setField('theme', 'dark') }}>Escuro</div>
                </div>
                <div className={styles.field} style={{ marginBottom: 6 }}><label>Cor principal</label></div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
                  {ACCENTS.map(function(c) {
                    return <div key={c} onClick={function() { setField('accent', c) }} style={{ width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer', border: form.accent === c ? '3px solid var(--text)' : '3px solid transparent', boxSizing: 'border-box' }} />
                  })}
                  <input type="color" value={form.accent} onChange={function(e) { setField('accent', e.target.value) }} style={{ width: 40, height: 34, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                </div>
                <div className={styles.field}>
                  <label>Instrucoes extras para a IA (opcional)</label>
                  <textarea value={form.customPrompt} onChange={function(e) { setField('customPrompt', e.target.value) }} placeholder="Ex: Tom emocional, foco em maes solteiras..." rows={3} style={{ resize: 'vertical' }} />
                </div>
              </div>
              <button
                className={styles.btnGerar}
                onClick={gerar}
                disabled={loading}
                style={{ background: hasSubscription === false ? 'linear-gradient(135deg, #7c5cfc, #9b6dfc)' : undefined }}
              >
                <i className="ti ti-wand" />
                {hasSubscription === false ? 'Assinar para criar paginas' : loading ? 'Gerando sua pagina...' : 'Gerar pagina com IA'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'minhas' && (
        <div className={styles.content}>
          {pages.length === 0 ? (
            <div className={styles.empty}>
              <i className="ti ti-layout" style={{ fontSize: 40, color: 'var(--muted)' }} />
              <p>Nenhuma pagina criada ainda</p>
              <button className={styles.btnNew} onClick={function() { setTab('criar') }}>Criar primeira pagina</button>
            </div>
          ) : (
            <div className={styles.pageList}>
              {pages.map(function(p: SalesPage) {
                return (
                  <div key={p.id} className={styles.pageCard}>
                    <div className={styles.pageCardLeft}>
                      <div className={styles.pageName}>{p.product_name}</div>
                      <a href={APP_URL + '/p/' + p.slug} target="_blank" rel="noreferrer" className={styles.pageLink}>
                        <i className="ti ti-external-link" /> /p/{p.slug}
                      </a>
                    </div>
                    <div className={styles.pageCardRight}>
                      <div className={styles.pageViews}><i className="ti ti-eye" /> {p.views} views</div>
                      <button className={styles.statusBtn + ' ' + (p.active ? styles.statusOn : styles.statusOff)} onClick={function() { toggleActive(p.id, p.active) }}>
                        {p.active ? 'Ativa' : 'Pausada'}
                      </button>
                      <a href={'/dashboard/paginas/editor/' + p.id} className={styles.copyBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</a>
                      <button className={styles.copyBtn} onClick={function() { navigator.clipboard.writeText(APP_URL + '/p/' + p.slug) }}>
                        <i className="ti ti-copy" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
