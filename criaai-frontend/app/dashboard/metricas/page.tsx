'use client'
import { useState } from 'react'
import styles from './metricas.module.css'

export default function MetricasPage() {
  const [mode, setMode] = useState<'manual'|'print'>('manual')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [printPreview, setPrintPreview] = useState('')
  const [loadingMsg, setLoadingMsg] = useState('')
  const [inv, setInv] = useState('')
  const [res, setRes] = useState('')
  const [imp, setImp] = useState('')
  const [cli, setCli] = useState('')
  const [cpm, setCpm] = useState('')
  const [ctr, setCtr] = useState('')
  const [cpc, setCpc] = useState('')
  const [obj, setObj] = useState('vendas')
  const [nicho, setNicho] = useState('')
  const [ticket, setTicket] = useState('')
  const [dias, setDias] = useState('')
  const [nichoPrint, setNichoPrint] = useState('')
  const [objPrint, setObjPrint] = useState('vendas')

  function handlePrint(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPrintPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function scoreColor(s: number) {
    return s >= 8 ? '#22c55e' : s >= 6 ? '#f59e0b' : '#ef4444'
  }

  function gerarAnalise(d: any) {
    const { invN, resN, cpmN, ctrN, cpcN, objV, nichoV, ticketN, diasN } = d
    let score = 5
    const pos: string[] = [], atc: string[] = [], neg: string[] = [], met: any[] = [], rec: any[] = []
    const cpaN = resN > 0 ? invN / resN : 0
    const roasN = ticketN > 0 && resN > 0 ? (resN * ticketN) / invN : 0
    const cpcCalc = cpcN || (parseFloat(cli) > 0 ? invN / parseFloat(cli) : 0)
    const ctrCalc = ctrN || (parseFloat(imp) > 0 && parseFloat(cli) > 0 ? (parseFloat(cli) / parseFloat(imp)) * 100 : 0)

    if (ctrCalc >= 2) { score += 1; pos.push(`CTR de ${ctrCalc.toFixed(1)}% acima da média (benchmark: 1.5-2%)`) }
    else if (ctrCalc >= 1) atc.push(`CTR de ${ctrCalc.toFixed(1)}% na média — criativos mais impactantes podem melhorar`)
    else if (ctrCalc > 0) { score -= 1; neg.push(`CTR de ${ctrCalc.toFixed(1)}% abaixo do esperado`) }

    if (cpmN > 0 && cpmN <= 20) { score += 0.5; pos.push(`CPM de R$${cpmN} competitivo para o mercado brasileiro`) }
    else if (cpmN > 20 && cpmN <= 40) atc.push(`CPM de R$${cpmN} elevado — teste novos públicos`)
    else if (cpmN > 40) { score -= 0.5; neg.push(`CPM de R$${cpmN} muito alto — audiência saturada`) }

    if (objV === 'vendas' && roasN > 0) {
      if (roasN >= 3) { score += 1.5; pos.push(`ROAS de ${roasN.toFixed(1)}x excelente`) }
      else if (roasN >= 1.5) atc.push(`ROAS de ${roasN.toFixed(1)}x positivo — meta ideal é 3x+`)
      else { score -= 1; neg.push(`ROAS de ${roasN.toFixed(1)}x abaixo do equilíbrio`) }
    }

    if (invN > 0 && diasN > 0) {
      const dd = invN / diasN
      if (dd >= 30) pos.push(`Orçamento diário de R$${dd.toFixed(0)} adequado`)
      else atc.push(`Orçamento diário de R$${dd.toFixed(0)} pode ser insuficiente — considere R$30+`)
    }

    score = Math.min(10, Math.max(0, score))
    met.push({ label: 'CTR', valor: ctrCalc > 0 ? ctrCalc.toFixed(1) + '%' : 'N/A', status: ctrCalc >= 2 ? 'bom' : ctrCalc >= 1 ? 'atencao' : 'ruim', benchmark: 'Meta: 2%+' })
    met.push({ label: 'CPM', valor: cpmN > 0 ? 'R$' + cpmN : 'N/A', status: cpmN <= 20 ? 'bom' : cpmN <= 40 ? 'atencao' : 'ruim', benchmark: 'Meta: <R$20' })
    met.push({ label: 'CPC', valor: cpcCalc > 0 ? 'R$' + cpcCalc.toFixed(2) : 'N/A', status: cpcCalc > 0 && cpcCalc <= 1 ? 'bom' : cpcCalc <= 2 ? 'atencao' : 'ruim', benchmark: 'Meta: <R$1' })
    met.push({ label: 'CPA', valor: cpaN > 0 ? 'R$' + cpaN.toFixed(2) : 'N/A', status: ticketN > 0 && cpaN > 0 ? (cpaN < ticketN * 0.3 ? 'bom' : cpaN < ticketN * 0.5 ? 'atencao' : 'ruim') : 'atencao', benchmark: 'Meta: <30% ticket' })
    met.push({ label: 'ROAS', valor: roasN > 0 ? roasN.toFixed(1) + 'x' : 'N/A', status: roasN >= 3 ? 'bom' : roasN >= 1.5 ? 'atencao' : 'ruim', benchmark: 'Meta: 3x+' })
    met.push({ label: 'Investido', valor: invN > 0 ? 'R$' + invN : 'N/A', status: 'atencao', benchmark: diasN + ' dias' })

    rec.push({ titulo: 'Teste novos criativos', descricao: `Para ${nichoV || 'seu produto'}, experimente criativos com prova social, demonstração em uso e urgência. Use a geração de vídeo da plataforma para criar variações rapidamente.` })
    if (ctrCalc < 2) rec.push({ titulo: 'Melhore o hook do criativo', descricao: 'Os primeiros 3 segundos são decisivos. Teste iniciar com pergunta provocativa, resultado surpreendente ou cena de problema do público.' })
    if (cpmN > 25) rec.push({ titulo: 'Expanda os públicos', descricao: 'CPM alto indica audiência saturada. Teste Lookalike 2-5%, interesses mais amplos ou públicos frios.' })
    if (objV === 'vendas' && roasN < 3) rec.push({ titulo: 'Otimize a página de vendas', descricao: 'Com ROAS abaixo de 3x, o problema pode ser a conversão na página. Verifique velocidade, clareza da oferta e facilidade de compra.' })

    const resumo = score >= 8 ? 'Excelente performance — foque em escalar' : score >= 6 ? 'Bom desempenho com oportunidades de melhoria' : score >= 4 ? 'Performance mediana — ajustes necessários' : 'Abaixo do esperado — revisão completa recomendada'
    return { score, resumo, metricas: met, positivos: pos, atencao: atc, negativos: neg, recomendacoes: rec }
  }

  async function analisar(isManual: boolean) {
    setLoading(true); setResult(null)
    const msgs = ['Calculando métricas...', 'Comparando benchmarks...', 'Gerando diagnóstico...', 'Elaborando recomendações...']
    let mi = 0
    const iv = setInterval(() => setLoadingMsg(msgs[mi++ % msgs.length]), 1200)
    await new Promise(r => setTimeout(r, isManual ? 4000 : 5000))
    clearInterval(iv)
    const data = isManual
      ? gerarAnalise({ invN: +inv, resN: +res, cpmN: +cpm, ctrN: +ctr, cpcN: +cpc, objV: obj, nichoV: nicho, ticketN: +ticket, diasN: +dias || 1 })
      : gerarAnalise({ invN: 200, resN: 8, cpmN: 16.6, ctrN: 2.3, cpcN: 0.71, objV: objPrint, nichoV: nichoPrint, ticketN: 197, diasN: 5 })
    setResult(data)
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.title}>Análise de Métricas</div>
        <div className={styles.sub}>Insira os dados do seu anúncio e receba um diagnóstico completo com IA</div>
      </div>
      <div className={styles.content}>
        <div className={styles.modeTabs}>
          <div className={`${styles.mtab} ${mode==='manual'?styles.mtabOn:''}`} onClick={()=>setMode('manual')}><i className="ti ti-forms"/> Inserir manualmente</div>
          <div className={`${styles.mtab} ${mode==='print'?styles.mtabOn:''}`} onClick={()=>setMode('print')}><i className="ti ti-photo"/> Enviar print</div>
        </div>

        {mode === 'manual' && (<>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Dados do anúncio</div>
            <div className={`${styles.grid} ${styles.grid2}`} style={{marginBottom:14}}>
              <div className={styles.field}><label>Investimento (R$)</label><input type="number" value={inv} onChange={e=>setInv(e.target.value)} placeholder="Ex: 150"/></div>
              <div className={styles.field}><label>Resultado (conversões)</label><input type="number" value={res} onChange={e=>setRes(e.target.value)} placeholder="Ex: 12"/></div>
            </div>
            <div className={`${styles.grid} ${styles.grid3}`} style={{marginBottom:14}}>
              <div className={styles.field}><label>Impressões</label><input type="number" value={imp} onChange={e=>setImp(e.target.value)} placeholder="Ex: 15000"/></div>
              <div className={styles.field}><label>Cliques</label><input type="number" value={cli} onChange={e=>setCli(e.target.value)} placeholder="Ex: 320"/></div>
              <div className={styles.field}><label>CPM (R$)</label><input type="number" value={cpm} onChange={e=>setCpm(e.target.value)} placeholder="Ex: 18"/></div>
            </div>
            <div className={`${styles.grid} ${styles.grid3}`}>
              <div className={styles.field}><label>CTR (%)</label><input type="number" value={ctr} onChange={e=>setCtr(e.target.value)} placeholder="Ex: 2.1" step="0.1"/></div>
              <div className={styles.field}><label>CPC (R$)</label><input type="number" value={cpc} onChange={e=>setCpc(e.target.value)} placeholder="Ex: 0.47" step="0.01"/></div>
              <div className={styles.field}><label>Objetivo</label>
                <select value={obj} onChange={e=>setObj(e.target.value)}>
                  <option value="vendas">Vendas / Conversão</option>
                  <option value="leads">Geração de leads</option>
                  <option value="trafego">Tráfego</option>
                  <option value="alcance">Alcance / Branding</option>
                </select>
              </div>
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Contexto do anúncio</div>
            <div className={`${styles.grid} ${styles.grid2}`} style={{marginBottom:14}}>
              <div className={styles.field}><label>Nicho / produto</label><input type="text" value={nicho} onChange={e=>setNicho(e.target.value)} placeholder="Ex: suplemento, curso..."/></div>
              <div className={styles.field}><label>Ticket médio (R$)</label><input type="number" value={ticket} onChange={e=>setTicket(e.target.value)} placeholder="Ex: 197"/></div>
            </div>
            <div className={styles.field}><label>Dias rodando</label><input type="number" value={dias} onChange={e=>setDias(e.target.value)} placeholder="Ex: 7"/></div>
          </div>
          <button className={styles.btnAnalyze} onClick={()=>analisar(true)} disabled={loading || !inv}>
            <i className="ti ti-sparkles"/> {loading ? loadingMsg : 'Analisar com IA'}
          </button>
        </>)}

        {mode === 'print' && (<>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Print do gerenciador</div>
            <div className={`${styles.uploadBox} ${printPreview?styles.hasImg:''}`} onClick={()=>document.getElementById('print-input')?.click()}>
              <input id="print-input" type="file" accept="image/*" style={{display:'none'}} onChange={handlePrint}/>
              {printPreview ? (<><img src={printPreview} alt="print" className={styles.previewImg}/><div className={styles.uploadSub}>Clique para trocar</div></>) : (<><i className="ti ti-photo-up" style={{fontSize:36,color:'var(--muted)',display:'block',marginBottom:12}}/><div className={styles.uploadTitle}>Clique para enviar o print</div><div className={styles.uploadSub}>Facebook Ads Manager, Google Ads, etc.</div></>)}
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Contexto adicional</div>
            <div className={`${styles.grid} ${styles.grid2}`}>
              <div className={styles.field}><label>Nicho</label><input type="text" value={nichoPrint} onChange={e=>setNichoPrint(e.target.value)} placeholder="Ex: suplemento..."/></div>
              <div className={styles.field}><label>Objetivo</label>
                <select value={objPrint} onChange={e=>setObjPrint(e.target.value)}>
                  <option value="vendas">Vendas</option>
                  <option value="leads">Leads</option>
                  <option value="trafego">Tráfego</option>
                </select>
              </div>
            </div>
          </div>
          <button className={styles.btnAnalyze} onClick={()=>analisar(false)} disabled={loading || !printPreview}>
            <i className="ti ti-sparkles"/> {loading ? loadingMsg : 'Analisar print com IA'}
          </button>
        </>)}

        {result && (
          <div className={styles.resultSection}>
            <div className={styles.scoreCard}>
              <div className={styles.scoreLabel}>Nota do anúncio</div>
              <div className={styles.scoreValue} style={{color:scoreColor(result.score)}}>{result.score.toFixed(1)}</div>
              <div className={styles.scoreDesc}>{result.resumo}</div>
            </div>
            <div className={styles.metricsGrid}>
              {result.metricas.map((m:any,i:number)=>(
                <div key={i} className={styles.metricCard}>
                  <div className={styles.metricLabel}>{m.label}</div>
                  <div className={styles.metricValue} style={{color:m.status==='bom'?'#22c55e':m.status==='atencao'?'#f59e0b':'#ef4444'}}>{m.valor}</div>
                  <div className={`${styles.metricStatus} ${m.status==='bom'?styles.good:m.status==='atencao'?styles.warn:styles.bad}`}>{m.benchmark}</div>
                </div>
              ))}
            </div>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Diagnóstico</div>
              {result.positivos.length>0&&<div className={styles.analysisBlock}><div className={`${styles.analysisTitle} ${styles.good}`}><i className="ti ti-circle-check"/>Pontos positivos</div>{result.positivos.map((p:string,i:number)=><div key={i} className={styles.analysisItem}><div className={styles.dotGood}/><span>{p}</span></div>)}</div>}
              {result.atencao.length>0&&<div className={styles.analysisBlock}><div className={`${styles.analysisTitle} ${styles.warn}`}><i className="ti ti-alert-triangle"/>Pontos de atenção</div>{result.atencao.map((p:string,i:number)=><div key={i} className={styles.analysisItem}><div className={styles.dotWarn}/><span>{p}</span></div>)}</div>}
              {result.negativos.length>0&&<div className={styles.analysisBlock}><div className={`${styles.analysisTitle} ${styles.bad}`}><i className="ti ti-circle-x"/>Problemas identificados</div>{result.negativos.map((p:string,i:number)=><div key={i} className={styles.analysisItem}><div className={styles.dotBad}/><span>{p}</span></div>)}</div>}
            </div>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Recomendações</div>
              {result.recomendacoes.map((r:any,i:number)=>(
                <div key={i} className={styles.recCard}>
                  <div className={styles.recTitle}><i className="ti ti-bulb"/>{i+1}. {r.titulo}</div>
                  <div className={styles.recText}>{r.descricao}</div>
                </div>
              ))}
            </div>
            <button className={styles.btnReset} onClick={()=>setResult(null)}><i className="ti ti-refresh"/> Nova análise</button>
          </div>
        )}
      </div>
    </div>
  )
}
