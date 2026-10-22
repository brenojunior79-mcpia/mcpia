'use client'
import { calcular, veredito } from '@/lib/anuncios'
import { moeda, inteiro, cartao } from './estilo'

const SELO: Record<string, React.CSSProperties> = {
  Escalar: { background: '#15803d', color: '#fff', border: '1px solid #15803d' },
  Observar: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  Ajustar: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  'Sem dados': { background: 'var(--surface2)', color: 'var(--muted2)', border: '1px solid var(--border)' },
}

const dataCurta = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Selo({ texto, cor, fundo, borda }: { texto: string; cor: string; fundo: string; borda: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: cor, background: fundo, border: '1px solid ' + borda, whiteSpace: 'nowrap' }}>{texto}</span>
}

function Caixa({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '8px 10px', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{rotulo}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{valor}</div>
    </div>
  )
}

const linkEstilo: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }

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
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>🎬 Criativos ativos</h2>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 12 }}>Só os anúncios que estão ligados, do que mais vendeu para o que menos vendeu. Veja qual criativo manter, qual observar e qual escalar. Vendas e ROAS vêm do pixel do Facebook.</div>

      {carregando && <p style={{ color: 'var(--muted2)', fontSize: 13 }}>Carregando criativos...</p>}
      {erro && <div style={{ fontSize: 13, color: '#b91c1c', background: 'rgba(239,68,68,0.08)', borderRadius: 9, padding: '12px 16px' }}>{erro}</div>}
      {!carregando && !erro && criativos && !visiveis.length && <p style={{ color: 'var(--muted2)', fontSize: 13 }}>Nenhum criativo ativo no momento.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visiveis.map(function(x) {
          const c = x.c
          const sub = [c.campanha, c.conjunto].filter(Boolean).join(' · ') + (c.criadoEm ? ' · criado em ' + dataCurta(c.criadoEm) : '')
          const pagCheckout = x.m.taxaCheckout === null ? '—' : x.m.taxaCheckout.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
          return (
            <div key={c.id} style={{ ...cartao, padding: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 110, height: 110, borderRadius: 12, background: 'var(--surface2)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {c.imagem ? <img src={c.imagem} alt={c.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🎬</span>}
                {c.ehVideo && <span style={{ position: 'absolute', right: 6, bottom: 6, background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px' }}>▶ vídeo</span>}
              </div>

              <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, wordBreak: 'break-word' }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2, wordBreak: 'break-word' }}>{sub}</div>
                  </div>
                  <span title={x.v.motivo} style={{ ...SELO[x.v.rotulo], fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{x.v.rotulo === 'Sem dados' ? 'Sem veredito' : x.v.rotulo}</span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.entregandoHoje
                    ? <Selo texto="🟢 Entregando hoje" cor="#15803d" fundo="rgba(22,163,74,0.12)" borda="rgba(22,163,74,0.35)" />
                    : <Selo texto={c.status === 'ACTIVE' ? 'Sem entrega hoje' : 'Pausado'} cor="var(--muted2)" fundo="var(--surface2)" borda="var(--border)" />}
                  {c.temUtm
                    ? <Selo texto="UTM ok" cor="#15803d" fundo="rgba(22,163,74,0.12)" borda="rgba(22,163,74,0.35)" />
                    : <Selo texto="Sem UTM" cor="#b45309" fundo="rgba(245,158,11,0.14)" borda="rgba(245,158,11,0.4)" />}
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>{x.v.motivo}</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8 }}>
                  <Caixa rotulo="Gasto" valor={moeda(x.m.gasto)} />
                  <Caixa rotulo="Vendas (pixel)" valor={inteiro(x.m.compras)} />
                  <Caixa rotulo="ROAS" valor={x.m.roas === null ? '—' : x.m.roas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'x'} />
                  <Caixa rotulo="CPA" valor={x.m.cpa === null ? '—' : moeda(x.m.cpa)} />
                  <Caixa rotulo="Pág. → checkout" valor={pagCheckout} />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {c.linkAnuncio && <a href={c.linkAnuncio} target="_blank" rel="noopener noreferrer" style={linkEstilo}>Ver anúncio</a>}
                  {c.linkInstagram && <a href={c.linkInstagram} target="_blank" rel="noopener noreferrer" style={linkEstilo}>Instagram</a>}
                  {c.linkFacebook && <a href={c.linkFacebook} target="_blank" rel="noopener noreferrer" style={linkEstilo}>Facebook</a>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
