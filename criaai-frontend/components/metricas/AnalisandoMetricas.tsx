'use client'
import { useState } from 'react'
import styles from '@/app/dashboard/metricas/metricas.module.css'

type Metrica = { label: string; valor: string; status: string; benchmark: string }
type Resultado = {
  nota: number; resumo: string; onde_esta_a_perda: string; metricas: Metrica[]
  positivos: string[]; atencao: string[]; problemas: string[]
  recomendacoes: { titulo: string; descricao: string }[]; faltando: string[]
}

// Reduz o print antes de enviar (celular gera foto grande): no maximo 1600px, JPEG
function reduzirImagem(file: File): Promise<string> {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader()
    reader.onerror = function() { reject(new Error('Não consegui abrir essa imagem.')) }
    reader.onload = function() {
      const img = new Image()
      img.onerror = function() { reject(new Error('Esse arquivo não parece ser uma imagem. Use JPG ou PNG.')) }
      img.onload = function() {
        const max = 1600
        const esc = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc)
        const ctx = c.getContext('2d')
        if (!ctx) { reject(new Error('Não consegui processar a imagem.')); return }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.85))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export default function AnalisandoMetricas({ embutido = false }: { embutido?: boolean }) {
  const [mode, setMode] = useState<'manual' | 'print'>('manual')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [erro, setErro] = useState('')
  const [result, setResult] = useState<Resultado | null>(null)
  const [prints, setPrints] = useState<string[]>([])

  const [inv, setInv] = useState('')
  const [res, setRes] = useState('')
  const [imp, setImp] = useState('')
  const [cli, setCli] = useState('')
  const [cpm, setCpm] = useState('')
  const [ctr, setCtr] = useState('')
  const [cpc, setCpc] = useState('')
  const [viewPagina, setViewPagina] = useState('')
  const [iniciouCheckout, setIniciouCheckout] = useState('')
  const [ticket, setTicket] = useState('')
  const [obj, setObj] = useState('vendas')
  const [nicho, setNicho] = useState('')
  const [dias, setDias] = useState('')
  const [descricao, setDescricao] = useState('')

  async function addPrints(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setErro('')
    try {
      const novos: string[] = []
      for (const f of files.slice(0, 3 - prints.length)) novos.push(await reduzirImagem(f))
      setPrints(function(p) { return p.concat(novos).slice(0, 3) })
    } catch (err: any) { setErro(err?.message || 'Não consegui abrir a imagem.') }
  }

  function scoreColor(s: number) { return s >= 8 ? '#22c55e' : s >= 6 ? '#f59e0b' : '#ef4444' }
  const cor = function(st: string) { return st === 'bom' ? '#22c55e' : st === 'atencao' ? '#f59e0b' : st === 'ruim' ? '#ef4444' : 'var(--muted2)' }

  async function analisar() {
    setErro(''); setResult(null); setLoading(true)
    const msgs = ['Lendo os números...', 'Olhando o funil, etapa por etapa...', 'Procurando onde está a perda...', 'Montando as recomendações...']
    let mi = 0
    setLoadingMsg(msgs[0])
    const iv = setInterval(function() { mi++; setLoadingMsg(msgs[mi % msgs.length]) }, 2500)
    try {
      const body: any = {
        modo: mode,
        contexto: { objetivo: obj, nicho, dias, ticket, descricao },
      }
      if (mode === 'manual') body.dados = { investimento: inv, resultados: res, impressoes: imp, cliques: cli, cpm, ctr, cpc, visualizacoes: viewPagina, checkout: iniciouCheckout }
      else body.imagens = prints
      const r = await fetch('/api/metricas/analisar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não consegui analisar agora. Tente de novo.')
      else if (j.ok === false) setErro(j.erro || 'Não consegui ler os números desse print.')
      else setResult(j.resultado)
    } catch (e) {
      setErro('Sem conexão. Verifique a internet e tente de novo.')
    } finally {
      clearInterval(iv); setLoading(false)
    }
  }

  const campoContexto = (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Contexto do anúncio</div>
      <div className={`${styles.grid} ${styles.grid3}`} style={{ marginBottom: 14 }}>
        <div className={styles.field}><label>Nicho / produto</label><input type="text" value={nicho} onChange={e => setNicho(e.target.value)} placeholder="Ex: ebook de receitas" /></div>
        <div className={styles.field}><label>Dias rodando</label><input type="number" value={dias} onChange={e => setDias(e.target.value)} placeholder="Ex: 3" /></div>
        <div className={styles.field}><label>Objetivo</label>
          <select value={obj} onChange={e => setObj(e.target.value)}>
            <option value="vendas">Vendas / Conversão</option>
            <option value="leads">Geração de leads</option>
            <option value="trafego">Tráfego</option>
          </select>
        </div>
      </div>
      {mode === 'print' && (
        <div className={styles.field} style={{ marginBottom: 14 }}><label>Preço do produto (R$) — opcional</label><input type="number" value={ticket} onChange={e => setTicket(e.target.value)} placeholder="Ex: 47" /></div>
      )}
      <div className={styles.field}>
        <label>Quer contar algo mais? (opcional)</label>
        <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Ex: anúncio em vídeo, público mulheres 30-50 anos, orçamento de R$ 20 por dia..." style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', color: 'var(--text)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', resize: 'vertical' }} />
      </div>
    </div>
  )

  return (
    <div className={embutido ? undefined : styles.page}>
      {embutido ? (
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>🔎 Analisando Métricas</h2>
          <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Preencha os números do seu anúncio ou envie um print do Gerenciador de Anúncios e a IA mostra onde está o problema.</div>
        </div>
      ) : (
        <div className={styles.topbar}>
          <div className={styles.title}>Analisando Métricas</div>
          <div className={styles.sub}>Preencha os números do seu anúncio ou envie um print do Gerenciador de Anúncios e a IA mostra onde está o problema</div>
        </div>
      )}
      <div className={embutido ? undefined : styles.content} style={embutido ? { maxWidth: 860 } : undefined}>
        <div className={styles.modeTabs}>
          <div className={`${styles.mtab} ${mode === 'manual' ? styles.mtabOn : ''}`} onClick={() => { setMode('manual'); setErro('') }}><i className="ti ti-forms" /> Preencher os números</div>
          <div className={`${styles.mtab} ${mode === 'print' ? styles.mtabOn : ''}`} onClick={() => { setMode('print'); setErro('') }}><i className="ti ti-photo" /> Enviar print</div>
        </div>

        {mode === 'manual' && (<>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Números do anúncio</div>
            <div className={styles.dica}>Só o valor investido é obrigatório. Quanto mais números você colocar, melhor fica a análise. Copie do Gerenciador de Anúncios.</div>
            <div className={`${styles.grid} ${styles.grid2}`} style={{ marginBottom: 14 }}>
              <div className={styles.field}><label>Valor investido (R$)</label><input type="number" inputMode="decimal" value={inv} onChange={e => setInv(e.target.value)} placeholder="Ex: 150" /></div>
              <div className={styles.field}><label>Compras (resultados)</label><input type="number" inputMode="decimal" value={res} onChange={e => setRes(e.target.value)} placeholder="Ex: 3" /></div>
            </div>
            <div className={`${styles.grid} ${styles.grid3}`} style={{ marginBottom: 14 }}>
              <div className={styles.field}><label>Impressões</label><input type="number" inputMode="decimal" value={imp} onChange={e => setImp(e.target.value)} placeholder="Ex: 15000" /></div>
              <div className={styles.field}><label>Cliques no link</label><input type="number" inputMode="decimal" value={cli} onChange={e => setCli(e.target.value)} placeholder="Ex: 320" /></div>
              <div className={styles.field}><label>CPM (R$)</label><input type="number" inputMode="decimal" value={cpm} onChange={e => setCpm(e.target.value)} placeholder="Ex: 18" /></div>
            </div>
            <div className={`${styles.grid} ${styles.grid3}`} style={{ marginBottom: 14 }}>
              <div className={styles.field}><label>CTR do link (%)</label><input type="number" inputMode="decimal" value={ctr} onChange={e => setCtr(e.target.value)} placeholder="Ex: 2.1" step="0.1" /></div>
              <div className={styles.field}><label>CPC do link (R$)</label><input type="number" inputMode="decimal" value={cpc} onChange={e => setCpc(e.target.value)} placeholder="Ex: 0.47" step="0.01" /></div>
              <div className={styles.field}><label>Preço do produto (R$)</label><input type="number" inputMode="decimal" value={ticket} onChange={e => setTicket(e.target.value)} placeholder="Ex: 47" /></div>
            </div>
            <div className={`${styles.grid} ${styles.grid2}`}>
              <div className={styles.field}><label>Visualizações da página</label><input type="number" inputMode="decimal" value={viewPagina} onChange={e => setViewPagina(e.target.value)} placeholder="Ex: 180" /></div>
              <div className={styles.field}><label>Iniciou checkout</label><input type="number" inputMode="decimal" value={iniciouCheckout} onChange={e => setIniciouCheckout(e.target.value)} placeholder="Ex: 25" /></div>
            </div>
          </div>
          {campoContexto}
        </>)}

        {mode === 'print' && (<>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Prints do Gerenciador de Anúncios</div>
            <div className={styles.dica}>Envie até 3 prints da tabela de campanhas ou anúncios, com as colunas de gasto, impressões, CPM, CTR, cliques, resultados e checkout. Se os números não aparecerem todos em uma tela, mande mais de um print.</div>
            <div className={`${styles.uploadBox} ${prints.length ? styles.hasImg : ''}`} onClick={() => { if (prints.length < 3) document.getElementById('print-input')?.click() }}>
              <input id="print-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={addPrints} />
              <i className="ti ti-photo-up" style={{ fontSize: 36, color: 'var(--muted)', display: 'block', marginBottom: 12 }} />
              <div className={styles.uploadTitle}>{prints.length === 0 ? 'Toque para enviar o print' : prints.length < 3 ? 'Toque para adicionar outro print' : 'Máximo de 3 prints'}</div>
              <div className={styles.uploadSub}>JPG ou PNG. Não envie senhas nem dados de cartão.</div>
              {prints.length > 0 && (
                <div className={styles.thumbs} onClick={e => e.stopPropagation()}>
                  {prints.map(function(p, i) {
                    return <div key={i} className={styles.thumb}><img src={p} alt={'print ' + (i + 1)} /><button type="button" className={styles.thumbX} onClick={() => setPrints(prints.filter(function(_x, k) { return k !== i }))} aria-label="Remover print">×</button></div>
                  })}
                </div>
              )}
            </div>
          </div>
          {campoContexto}
        </>)}

        {erro && <div className={styles.erroBox}>{erro}</div>}

        <button className={styles.btnAnalyze} onClick={analisar} disabled={loading || (mode === 'manual' ? !inv : prints.length === 0)}>
          <i className="ti ti-sparkles" /> {loading ? loadingMsg : mode === 'manual' ? 'Analisar com IA' : 'Analisar prints com IA'}
        </button>

        {result && (
          <div className={styles.resultSection}>
            <div className={styles.scoreCard}>
              <div className={styles.scoreLabel}>Nota do anúncio</div>
              <div className={styles.scoreValue} style={{ color: scoreColor(result.nota) }}>{result.nota.toFixed(1)}</div>
              <div className={styles.scoreDesc}>{result.resumo}</div>
            </div>

            {result.onde_esta_a_perda && (
              <div className={styles.perdaBox}><b>Onde está a perda</b>{result.onde_esta_a_perda}</div>
            )}

            {result.metricas.length > 0 && (
              <div className={styles.metricsGrid}>
                {result.metricas.map(function(m, i) {
                  return (
                    <div key={i} className={styles.metricCard}>
                      <div className={styles.metricLabel}>{m.label}</div>
                      <div className={styles.metricValue} style={{ color: cor(m.status) }}>{m.valor}</div>
                      <div className={styles.metricStatus}>{m.benchmark}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {(result.positivos.length > 0 || result.atencao.length > 0 || result.problemas.length > 0) && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Diagnóstico</div>
                {result.positivos.length > 0 && <div className={styles.analysisBlock}><div className={`${styles.analysisTitle} ${styles.good}`}><i className="ti ti-circle-check" />Pontos positivos</div>{result.positivos.map(function(p, i) { return <div key={i} className={styles.analysisItem}><div className={styles.dotGood} /><span>{p}</span></div> })}</div>}
                {result.atencao.length > 0 && <div className={styles.analysisBlock}><div className={`${styles.analysisTitle} ${styles.warn}`}><i className="ti ti-alert-triangle" />Pontos de atenção</div>{result.atencao.map(function(p, i) { return <div key={i} className={styles.analysisItem}><div className={styles.dotWarn} /><span>{p}</span></div> })}</div>}
                {result.problemas.length > 0 && <div className={styles.analysisBlock}><div className={`${styles.analysisTitle} ${styles.bad}`}><i className="ti ti-circle-x" />Problemas identificados</div>{result.problemas.map(function(p, i) { return <div key={i} className={styles.analysisItem}><div className={styles.dotBad} /><span>{p}</span></div> })}</div>}
              </div>
            )}

            {result.recomendacoes.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>O que fazer agora</div>
                {result.recomendacoes.map(function(r, i) {
                  return (
                    <div key={i} className={styles.recCard}>
                      <div className={styles.recTitle}><i className="ti ti-bulb" />{i + 1}. {r.titulo}</div>
                      <div className={styles.recText}>{r.descricao}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {result.faltando.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Para uma análise melhor, informe também</div>
                {result.faltando.map(function(f, i) { return <div key={i} className={styles.analysisItem}><div className={styles.dotWarn} /><span>{f}</span></div> })}
              </div>
            )}

            <div className={styles.dica}>A análise é um apoio e não garante resultado. Com poucos dias ou pouco gasto, espere cerca de 48 horas de entrega antes de tomar decisões grandes.</div>
            <button className={styles.btnReset} onClick={() => setResult(null)}><i className="ti ti-refresh" /> Nova análise</button>
          </div>
        )}
      </div>
    </div>
  )
}
