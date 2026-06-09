'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './paginas.module.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.brenojunio.com.br'

export default function PaginasPage() {
  const [tab, setTab] = useState<'criar'|'minhas'>('criar')
  const [pages, setPages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{slug:string,url:string}|null>(null)
  const [form, setForm] = useState({
    productName: '', price: '', audience: '',
    benefits: ['','',''], bonus: '', guarantee: '',
    checkoutUrl: '', theme: 'light', customPrompt: '',
  })
  const supabase = createClient()

  useEffect(() => {
    if (tab === 'minhas') loadPages()
  }, [tab])

  async function loadPages() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('sales_pages')
      .select('id, slug, product_name, theme, views, created_at, active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPages(data || [])
  }

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setBenefit(i: number, value: string) {
    const b = [...form.benefits]
    b[i] = value
    setForm(f => ({ ...f, benefits: b }))
  }

  function addBenefit() {
    if (form.benefits.length < 7) setForm(f => ({ ...f, benefits: [...f.benefits, ''] }))
  }

  async function gerar() {
    const benefits = form.benefits.filter(b => b.trim())
    if (!form.productName || !form.price || !form.audience || benefits.length < 2) {
      return alert('Preencha: nome do produto, preco, publico-alvo e pelo menos 2 beneficios.')
    }
    setLoading(true)
    setResult(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/generate-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session?.access_token },
      body: JSON.stringify({ ...form, benefits }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.url) setResult(data)
    else alert('Erro: ' + (data.error || 'Tente novamente'))
  }

  async function toggleActive(id: string, active: boolean) {
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
        <div className={styles.tab + (tab === 'criar' ? ' ' + styles.active : '')} onClick={() => setTab('criar')}>Criar pagina</div>
        <div className={styles.tab + (tab === 'minhas' ? ' ' + styles.active : '')} onClick={() => setTab('minhas')}>Minhas paginas</div>
      </div>

      {tab === 'criar' && (
        <div className={styles.content}>
          {result ? (
            <div className={styles.successBox}>
              <div className={styles.successIcon}><i className="ti ti-check"/></div>
              <h2>Pagina criada!</h2>
              <p>Sua pagina esta publicada e pronta para receber visitas.</p>
              <a href={result.url} target="_blank" rel="noreferrer" className={styles.pageUrl}>
                <i className="ti ti-external-link"/> {result.url}
              </a>
              <div className={styles.successActions}>
                <button className={styles.btnCopy} onClick={() => navigator.clipboard.writeText(result.url)}>
                  <i className="ti ti-copy"/> Copiar link
                </button>
                <button className={styles.btnNew} onClick={() => setResult(null)}>
                  <i className="ti ti-plus"/> Criar outra
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.form}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Sobre o produto</div>
                <div className={styles.field}>
                  <label>Nome do produto *</label>
                  <input type="text" value={form.productName} onChange={e => setField('productName', e.target.value)} placeholder="Ex: Curso de Trafego Pago"/>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Preco (R$) *</label>
                    <input type="text" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="297"/>
                  </div>
                  <div className={styles.field}>
                    <label>Link do checkout</label>
                    <input type="url" value={form.checkoutUrl} onChange={e => setField('checkoutUrl', e.target.value)} placeholder="https://pay.hotmart.com/..."/>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Publico-alvo *</label>
                  <input type="text" value={form.audience} onChange={e => setField('audience', e.target.value)} placeholder="Ex: Empreendedores que querem vender mais no Instagram"/>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Beneficios *</div>
                <div className={styles.sub2}>Minimo 2, maximo 7. A IA vai reescrever de forma persuasiva.</div>
                {form.benefits.map((b, i) => (
                  <div key={i} className={styles.benefitRow}>
                    <span className={styles.benefitNum}>{i + 1}</span>
                    <input type="text" value={b} onChange={e => setBenefit(i, e.target.value)} placeholder={'Beneficio ' + (i + 1)}/>
                  </div>
                ))}
                {form.benefits.length < 7 && (
                  <button className={styles.btnAddBenefit} onClick={addBenefit}>
                    <i className="ti ti-plus"/> Adicionar beneficio
                  </button>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Extras (opcional)</div>
                <div className={styles.field}>
                  <label>Bonus</label>
                  <input type="text" value={form.bonus} onChange={e => setField('bonus', e.target.value)} placeholder="Ex: Planilha de controle de anuncios"/>
                </div>
                <div className={styles.field}>
                  <label>Garantia</label>
                  <input type="text" value={form.guarantee} onChange={e => setField('guarantee', e.target.value)} placeholder="Ex: 7 dias de garantia incondicional"/>
                </div>
                <div className={styles.field}>
                  <label>Instrucoes para a IA (opcional)</label>
                  <textarea
                    value={form.customPrompt}
                    onChange={e => setField('customPrompt', e.target.value)}
                    placeholder="Ex: Quero um tom emocional e inspirador, foco em maes solteiras..."
                    rows={4}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', color: 'var(--text)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Tema visual</div>
                <div className={styles.themes}>
                  {[['light', 'Claro'], ['dark', 'Escuro']].map(function(item) {
                    return (
                      <div
                        key={item[0]}
                        className={styles.themeOpt + (form.theme === item[0] ? ' ' + styles.themeOn : '')}
                        onClick={() => setField('theme', item[0])}
                      >
                        {item[1]}
                      </div>
                    )
                  })}
                </div>
              </div>

              <button className={styles.btnGerar} onClick={gerar} disabled={loading}>
                <i className="ti ti-wand"/> {loading ? 'Gerando sua pagina...' : 'Gerar pagina com IA · 1 credito'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'minhas' && (
        <div className={styles.content}>
          {pages.length === 0 ? (
            <div className={styles.empty}>
              <i className="ti ti-layout" style={{ fontSize: 40, color: 'var(--muted)' }}/>
              <p>Nenhuma pagina criada ainda</p>
              <button className={styles.btnNew} onClick={() => setTab('criar')}>Criar primeira pagina</button>
            </div>
          ) : (
            <div className={styles.pageList}>
              {pages.map(function(p) {
                return (
                  <div key={p.id} className={styles.pageCard}>
                    <div className={styles.pageCardLeft}>
                      <div className={styles.pageName}>{p.product_name}</div>
                      <a href={APP_URL + '/p/' + p.slug} target="_blank" rel="noreferrer" className={styles.pageLink}>
                        <i className="ti ti-external-link"/> /p/{p.slug}
                      </a>
                    </div>
                    <div className={styles.pageCardRight}>
                      <div className={styles.pageViews}><i className="ti ti-eye"/> {p.views} views</div>
                      <button
                        className={styles.statusBtn + ' ' + (p.active ? styles.statusOn : styles.statusOff)}
                        onClick={() => toggleActive(p.id, p.active)}
                      >
                        {p.active ? 'Ativa' : 'Pausada'}
                      </button>
                      
                        href={'/dashboard/paginas/editor/' + p.id}
                        className={styles.copyBtn}
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✏️
                      </a>
                      <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(APP_URL + '/p/' + p.slug)}>
                        <i className="ti ti-copy"/>
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
