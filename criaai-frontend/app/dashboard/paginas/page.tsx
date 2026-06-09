'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './paginas.module.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site'

export default function PaginasPage() {
  const [tab, setTab] = useState('criar')
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [form, setForm] = useState({
    productName: '',
    price: '',
    audience: '',
    benefits: ['', '', ''],
    bonus: '',
    guarantee: '',
    checkoutUrl: '',
    theme: 'light',
    customPrompt: '',
  })
  const supabase = createClient()

  useEffect(function() {
    if (tab === 'minhas') loadPages()
  }, [tab])

  async function loadPages() {
    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) return
    const res = await supabase
      .from('sales_pages')
      .select('id, slug, product_name, theme, views, created_at, active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPages(res.data || [])
  }

  function setField(key, value) {
    setForm(function(f) { return Object.assign({}, f, { [key]: value }) })
  }

  function setBenefit(i, value) {
    const b = [...form.benefits]
    b[i] = value
    setForm(function(f) { return Object.assign({}, f, { benefits: b }) })
  }

  function addBenefit() {
    if (form.benefits.length < 7) {
      setForm(function(f) { return Object.assign({}, f, { benefits: [...f.benefits, ''] }) })
    }
  }

  async function gerar() {
    const benefits = form.benefits.filter(function(b) { return b.trim() })
    if (!form.productName || !form.price || !form.audience || benefits.length < 2) {
      alert('Preencha: nome, preco, publico-alvo e pelo menos 2 beneficios.')
      return
    }
    setLoading(true)
    setResult(null)
    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session
    const res = await fetch('/api/generate-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (session ? session.access_token : ''),
      },
      body: JSON.stringify(Object.assign({}, form, { benefits: benefits })),
    })
    const data = await res.json()
    setLoading(false)
    if (data.url) {
      setResult(data)
    } else {
      alert('Erro: ' + (data.error || 'Tente novamente'))
    }
  }

  async function toggleActive(id, active) {
    await supabase.from('sales_pages').update({ active: !active }).eq('id', id)
    loadPages()
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.title}>Paginas de vendas</div>
        <div className={styles.sub}>Crie paginas de alta conversao com IA em segundos</div>
      </div>

      <div className={styles.tabs}>
        <div
          className={styles.tab + (tab === 'criar' ? ' ' + styles.active : '')}
          onClick={function() { setTab('criar') }}
        >
          Criar pagina
        </div>
        <div
          className={styles.tab + (tab === 'minhas' ? ' ' + styles.active : '')}
          onClick={function() { setTab('minhas') }}
        >
          Minhas paginas
        </div>
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
                <button className={styles.btnCopy} onClick={function() { navigator.clipboard.writeText(result.url) }}>
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
                <div className={styles.sectionTitle}>Sobre o produto</div>
                <div className={styles.field}>
                  <label>Nome do produto *</label>
                  <input type="text" value={form.productName} onChange={function(e) { setField('productName', e.target.value) }} placeholder="Ex: Curso de Trafego Pago" />
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Preco (R$) *</label>
                    <input type="text" value={form.price} onChange={function(e) { setField('price', e.target.value) }} placeholder="297" />
                  </div>
                  <div className={styles.field}>
                    <label>Link do checkout</label>
                    <input type="url" value={form.checkoutUrl} onChange={function(e) { setField('checkoutUrl', e.target.value) }} placeholder="https://pay.hotmart.com/..." />
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Publico-alvo *</label>
                  <input type="text" value={form.audience} onChange={function(e) { setField('audience', e.target.value) }} placeholder="Ex: Empreendedores que querem vender mais no Instagram" />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Beneficios *</div>
                <div className={styles.sub2}>Minimo 2, maximo 7.</div>
                {form.benefits.map(function(b, i) {
                  return (
                    <div key={i} className={styles.benefitRow}>
                      <span className={styles.benefitNum}>{i + 1}</span>
                      <input
                        type="text"
                        value={b}
                        onChange={function(e) { setBenefit(i, e.target.value) }}
                        placeholder={'Beneficio ' + (i + 1)}
                      />
                    </div>
                  )
                })}
                {form.benefits.length < 7 && (
                  <button className={styles.btnAddBenefit} onClick={addBenefit}>
                    <i className="ti ti-plus" /> Adicionar beneficio
                  </button>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Extras (opcional)</div>
                <div className={styles.field}>
                  <label>Bonus</label>
                  <input type="text" value={form.bonus} onChange={function(e) { setField('bonus', e.target.value) }} placeholder="Ex: Planilha de controle de anuncios" />
                </div>
                <div className={styles.field}>
                  <label>Garantia</label>
                  <input type="text" value={form.guarantee} onChange={function(e) { setField('guarantee', e.target.value) }} placeholder="Ex: 7 dias de garantia incondicional" />
                </div>
                <div className={styles.field}>
                  <label>Instrucoes para a IA (opcional)</label>
                  <textarea
                    value={form.customPrompt}
                    onChange={function(e) { setField('customPrompt', e.target.value) }}
                    placeholder="Ex: Tom emocional, foco em maes solteiras..."
                    rows={4}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Tema visual</div>
                <div className={styles.themes}>
                  <div
                    className={styles.themeOpt + (form.theme === 'light' ? ' ' + styles.themeOn : '')}
                    onClick={function() { setField('theme', 'light') }}
                  >
                    Claro
                  </div>
                  <div
                    className={styles.themeOpt + (form.theme === 'dark' ? ' ' + styles.themeOn : '')}
                    onClick={function() { setField('theme', 'dark') }}
                  >
                    Escuro
                  </div>
                </div>
              </div>

              <button className={styles.btnGerar} onClick={gerar} disabled={loading}>
                <i className="ti ti-wand" /> {loading ? 'Gerando sua pagina...' : 'Gerar pagina com IA'}
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
              {pages.map(function(p) {
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
                      <button
                        className={styles.statusBtn + ' ' + (p.active ? styles.statusOn : styles.statusOff)}
                        onClick={function() { toggleActive(p.id, p.active) }}
                      >
                        {p.active ? 'Ativa' : 'Pausada'}
                      </button>
                      
                        href={'/dashboard/paginas/editor/' + p.id}
                        className={styles.copyBtn}
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✏️
                      </a>
                      <button
                        className={styles.copyBtn}
                        onClick={function() { navigator.clipboard.writeText(APP_URL + '/p/' + p.slug) }}
                      >
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
