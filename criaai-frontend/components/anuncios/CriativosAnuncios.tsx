'use client'
import { calcular, veredito } from '@/lib/anuncios'
import { moeda, inteiro, cartao, titulo, subtitulo, iconeTitulo, avisoErro, SELO_VEREDITO } from './estilo'

const dataCurta = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Selo({ texto, cor, fundo, borda }: { texto: string; cor: string; fundo: string; borda: string }) {
  return <span style={{ fontSize: 12.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, color: cor, background: fundo, border: '1px solid ' + borda, whiteSpace: 'nowrap' }}>{texto}</span>
}

function Caixa({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-md)', padding: '10px 12px', minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted2)' }}>{rotulo}</div>
      <div className="anu-num" style={{ fontSize: 16, fontWeight: 800, marginTop: 2, overflowWrap: 'anywhere' }}>{valor}</div>
    </div>
  )
}

const linkEstilo: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-md)', minHeight: 44, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', whiteSpace: 'nowrap' }

export default function CriativosAnuncios({ criativos, carregando, erro }: { criativos: any[] | null; carregando: boolean; erro: string | null }) {
  const lista = (criativos || []).map(function(c) {
    const m = calcular(c.insights)
    return { c, m, v: veredito(m) }
  })
  lista.sort(function(a, b) {
    return b.m.compras - a.m.compras || (b.m.roas || 0) - (a.m.roas || 0) || b.m.gasto - a.m.gasto
  })

  const visiveis = lista

  return (
    <div>
      <h2 style={titulo}><span aria-hidden="true" style={iconeTitulo}><i className="ti ti-photo" /></span>Criativos ativos</h2>
      <p style={subtitulo}>Só os anúncios ligados, do que mais vendeu para o que menos vendeu. Veja qual manter, qual observar e qual aumentar. As vendas são contadas pelo Facebook.</p>

      {carregando && <p role="status" style={{ color: 'var(--muted2)', fontSize: 15 }}>Carregando criativos…</p>}
      {erro && <div role="alert" style={avisoErro}>{erro}</div>}
      {!carregando && !erro && criativos && !visiveis.length && <p style={{ color: 'var(--muted2)', fontSize: 15 }}>Nenhum criativo ativo no momento.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visiveis.map(function(x) {
          const c = x.c
          const sub = [c.campanha, c.conjunto].filter(Boolean).join(' · ') + (c.criadoEm ? ' · criado em ' + dataCurta(c.criadoEm) : '')
          const pagCheckout = x.m.taxaCheckout === null ? '—' : x.m.taxaCheckout.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
          return (
            <div key={c.id} style={{ ...cartao, padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 120, height: 120, borderRadius: 'var(--radius-md)', background: 'var(--surface2)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {c.imagem ? <img src={c.imagem} alt={'Imagem do anúncio ' + c.nome} width={120} height={120} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="ti ti-photo" aria-hidden="true" style={{ fontSize: 32, color: 'var(--muted2)' }} />}
                {c.ehVideo && <span style={{ position: 'absolute', right: 6, bottom: 6, background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: '2px 7px' }}>▶ vídeo</span>}
              </div>

              <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, wordBreak: 'break-word' }}>{c.nome}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 2, wordBreak: 'break-word' }}>{sub}</div>
                  </div>
                  <span title={x.v.motivo} style={{ ...SELO_VEREDITO[x.v.rotulo], fontSize: 13, fontWeight: 800, padding: '6px 14px', borderRadius: 999, whiteSpace: 'nowrap' }}>{x.v.rotulo === 'Sem dados' ? 'Sem veredito' : x.v.rotulo}</span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.entregandoHoje
                    ? <Selo texto="🟢 Entregando hoje" cor="var(--green)" fundo="var(--green-light)" borda="color-mix(in srgb, var(--green) 35%, transparent)" />
                    : <Selo texto={c.status === 'ACTIVE' ? 'Sem entrega hoje' : 'Pausado'} cor="var(--muted2)" fundo="var(--surface2)" borda="var(--border)" />}
                  {c.temUtm
                    ? <Selo texto="Link rastreado" cor="var(--green)" fundo="var(--green-light)" borda="color-mix(in srgb, var(--green) 35%, transparent)" />
                    : <Selo texto="Link sem rastreio" cor="var(--amber)" fundo="var(--amber-light)" borda="color-mix(in srgb, var(--amber) 40%, transparent)" />}
                </div>

                <div style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.5 }}>{x.v.motivo}</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 8 }}>
                  <Caixa rotulo="Gasto" valor={moeda(x.m.gasto)} />
                  <Caixa rotulo="Vendas" valor={inteiro(x.m.compras)} />
                  <Caixa rotulo="Retorno" valor={x.m.roas === null ? '—' : x.m.roas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'x'} />
                  <Caixa rotulo="Custo por venda" valor={x.m.cpa === null ? '—' : moeda(x.m.cpa)} />
                  <Caixa rotulo="Foi ao pagamento" valor={pagCheckout} />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {c.linkAnuncio && <a href={c.linkAnuncio} target="_blank" rel="noopener noreferrer" className="anu-btn" style={linkEstilo}><i className="ti ti-external-link" aria-hidden="true" />Ver anúncio</a>}
                  {c.linkInstagram && <a href={c.linkInstagram} target="_blank" rel="noopener noreferrer" className="anu-btn" style={linkEstilo} translate="no">Instagram</a>}
                  {c.linkFacebook && <a href={c.linkFacebook} target="_blank" rel="noopener noreferrer" className="anu-btn" style={linkEstilo} translate="no">Facebook</a>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
