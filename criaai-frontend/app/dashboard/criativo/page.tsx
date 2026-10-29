'use client'
import { useState, useEffect } from 'react'
import { botaoClaro } from '@/components/criativo/ui'
import styles from '../dashboard.module.css'
import CardRoteiro, { Roteiro, ROTEIRO_VAZIO, roteiroEmTexto } from '@/components/criativo/CardRoteiro'
import CardNarracao, { Narracao } from '@/components/criativo/CardNarracao'
import CardVideos, { Clipe } from '@/components/criativo/CardVideos'
import CardEdicao, { Gerado } from '@/components/criativo/CardEdicao'

type Aba = 'roteiro' | 'narracao' | 'videos' | 'edicao'

export default function CriativoPage() {
  const [aba, setAba] = useState<Aba>('roteiro')
  const [roteiro, setRoteiro] = useState<Roteiro>(ROTEIRO_VAZIO)
  const [roteiroId, setRoteiroId] = useState<string | null>(null)
  const [textoNarracao, setTextoNarracao] = useState('')
  const [narracao, setNarracao] = useState<Narracao | null>(null)
  const [clipes, setClipes] = useState<Clipe[]>([])
  const [gerados, setGerados] = useState<Gerado[]>([])
  const [saldo, setSaldo] = useState<any>(null)
  useEffect(function() {
    function ler() { fetch('/api/criativo/saldo', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { if (j && typeof j.restante === 'number') setSaldo(j) }).catch(function() {}) }
    ler()
    window.addEventListener('criativo-saldo', ler)
    return function() { window.removeEventListener('criativo-saldo', ler) }
  }, [])
  function remover(g: Gerado) { URL.revokeObjectURL(g.url); setGerados(function(l) { return l.filter(function(x) { return x.id !== g.id }) }) }
  const mmss = function(t: number) { const m = Math.floor(t / 60); const r = Math.round(t % 60); return m + ':' + String(r).padStart(2, '0') }
  const hora = function(ms: number) { try { return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) } catch (e) { return '' } }

  const cards: { id: Aba; n: number; icone: string; titulo: string; sub: string; pronto: boolean }[] = [
    { id: 'roteiro', n: 1, icone: '✍️', titulo: 'Roteiro', sub: 'Gancho, corpo, mecanismo e CTA', pronto: !!roteiroEmTexto(roteiro) },
    { id: 'narracao', n: 2, icone: '🎙️', titulo: 'Narração', sub: 'Voz e velocidade do áudio', pronto: !!narracao },
    { id: 'videos', n: 3, icone: '🎞️', titulo: 'Vídeos', sub: 'Escolha os vídeos do criativo', pronto: clipes.length > 0 },
    { id: 'edicao', n: 4, icone: '✂️', titulo: 'Edição', sub: 'Vídeos, áudio e música em um Reels UGC', pronto: false },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.pageTitle}>Gerador de Criativos</div>
          <div className={styles.pageSub}>Do roteiro ao vídeo pronto, em 4 passos</div>
        </div>
      </div>

      <div className={styles.content}>
        {saldo && !saldo.ilimitado && saldo.novo && (
          <div style={{ maxWidth: 860, marginBottom: 14, padding: '12px 16px', borderRadius: 14, background: saldo.restante > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(124,92,252,0.10)', border: '1px solid ' + (saldo.restante > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(124,92,252,0.3)'), display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{saldo.restante > 0 ? '🎁' : '🛠️'}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {saldo.restante > 0 ? 'Você pode gerar ' + saldo.restante + ' criativo' + (saldo.restante === 1 ? '' : 's') + ' de teste.' : 'Este recurso está em atualização no momento.'}
            </span>
          </div>
        )}
        {saldo && !saldo.ilimitado && !saldo.novo && (
          <div style={{ maxWidth: 860, marginBottom: 14, padding: '12px 16px', borderRadius: 14, background: saldo.restante > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)', border: '1px solid ' + (saldo.restante > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'), display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>{saldo.restante > 0 ? '🎟️' : '🔒'}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {saldo.restante > 0 ? 'Você ainda pode gerar ' + saldo.restante + ' criativo' + (saldo.restante === 1 ? '' : 's') + '. Cada criativo pronto usa 1 crédito.' : (saldo.temPlano || saldo.limite > 0 ? 'Seus créditos de criativo acabaram.' : 'Assine um plano para gerar criativos.')}
            </span>
            {saldo.restante <= 0 && <a href="/dashboard/planos" style={{ background: '#7c5cfc', color: '#fff', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>Ver planos</a>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          {cards.map(function(c) {
            const on = aba === c.id
            return (
              <button key={c.id} onClick={function() { setAba(c.id) }} style={{ cursor: 'pointer', textAlign: 'left', padding: '14px 16px', borderRadius: 16, color: 'var(--text)', background: on ? 'rgba(124,92,252,0.10)' : 'var(--surface)', border: on ? '2px solid #7c5cfc' : '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{c.icone}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, flex: 1 }}>{c.n}. {c.titulo}</span>
                  {c.pronto && <span style={{ color: '#15803d', fontWeight: 800, fontSize: 13 }}>✓ pronto</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 4 }}>{c.sub}</div>
              </button>
            )
          })}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, maxWidth: 860, boxShadow: 'var(--shadow-sm)' }}>
          {aba === 'roteiro' && (
            <CardRoteiro roteiro={roteiro} setRoteiro={setRoteiro} roteiroId={roteiroId} setRoteiroId={setRoteiroId} onUsar={function() { setTextoNarracao(roteiroEmTexto(roteiro)); setAba('narracao') }} onUsarTexto={function(t) { setTextoNarracao(t); setAba('narracao') }} />
          )}
          {aba === 'narracao' && (
            <CardNarracao texto={textoNarracao} setTexto={setTextoNarracao} narracao={narracao} setNarracao={setNarracao} />
          )}
          {aba === 'videos' && <CardVideos clipes={clipes} setClipes={setClipes} onSeguir={function() { setAba('edicao') }} />}
          {aba === 'edicao' && <CardEdicao clipes={clipes} narracao={narracao} onIrVideos={function() { setAba('videos') }} onIrNarracao={function() { setAba('narracao') }} onGerado={function(g) { setGerados(function(l) { return [g].concat(l) }) }} />}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, maxWidth: 860, boxShadow: 'var(--shadow-sm)', marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22 }}>🎬</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, flex: 1 }}>Criativos gerados{gerados.length ? ' (' + gerados.length + ')' : ''}</span>
          </div>
          {gerados.length === 0 ? (
            <div style={{ fontSize: 13.5, color: 'var(--muted2)', marginTop: 8 }}>Os criativos que você montar aparecem aqui, prontos para baixar.</div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 6 }}>Eles ficam aqui enquanto esta página estiver aberta. Baixe os que quiser guardar.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginTop: 14 }}>
                {gerados.map(function(g, i) {
                  return (
                    <div key={g.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: 10 }}>
                      <video src={g.url} controls playsInline preload="metadata" style={{ width: '100%', aspectRatio: '9 / 16', borderRadius: 10, background: '#000', display: 'block', objectFit: 'cover' }} />
                      <div style={{ fontWeight: 800, fontSize: 13.5, marginTop: 8 }}>Criativo {gerados.length - i}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{mmss(g.duracao)} · {g.mb.toFixed(1)} MB · {g.nVideos} vídeo(s) · {hora(g.criadoEm)}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <a href={g.url} download={'criativo-' + (gerados.length - i) + '.mp4'} style={{ ...botaoClaro, textDecoration: 'none', flex: 1, textAlign: 'center', padding: '8px 6px', fontSize: 12.5 }}>⬇ Baixar</a>
                        <button onClick={function() { remover(g) }} style={{ ...botaoClaro, padding: '8px 10px', fontSize: 12.5 }} title="Tirar da lista">✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
