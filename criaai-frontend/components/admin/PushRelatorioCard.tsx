'use client'
import { useEffect, useState } from 'react'

// Relatorio das notificacoes: quantas foram enviadas, quantas chegaram, quantas pessoas clicaram (entraram pela
// notificacao) e quantas ignoraram (sem clique depois de 24h). Os cliques so sao contados a partir do dia em que
// este relatorio entrou no ar.
const NOMES: Record<string, string> = { sentimos_falta: '💜 Sentimos sua falta (9h)', oferta_express: '⚡ Oferta da Estrutura Express (18h)' }

function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }
function dataBR(s: string) { try { return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) } catch (e) { return '' } }

function Num({ valor, rotulo, cor }: { valor: number | string; rotulo: string; cor?: string }) {
  return (
    <div style={{ flex: '1 1 90px', minWidth: 90, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: cor || 'var(--text)' }}>{valor}</div>
      <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 2 }}>{rotulo}</div>
    </div>
  )
}

export default function PushRelatorioCard() {
  const [dados, setDados] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [dias, setDias] = useState(30)

  useEffect(function() {
    setErro('')
    fetch('/api/push/relatorio?dias=' + dias, { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) {
      if (j && j.error) setErro(j.error); else setDados(j)
    }).catch(function() { setErro('Não foi possível carregar o relatório.') })
  }, [dias])

  const auto: any[] = dados && dados.auto ? dados.auto : []
  const bc: any[] = dados && dados.broadcasts ? dados.broadcasts : []
  const caixa: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, marginBottom: 18, boxShadow: 'var(--shadow-sm)' }

  return (
    <div style={caixa}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>📊</span>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, flex: 1 }}>Relatório das notificações</span>
        {[7, 30, 90].map(function(d) {
          return <button key={d} onClick={function() { setDias(d) }} style={{ cursor: 'pointer', border: dias === d ? '2px solid #7c5cfc' : '1px solid var(--border2)', background: dias === d ? 'rgba(124,92,252,0.10)' : 'var(--surface2)', color: 'var(--text)', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700 }}>{d} dias</button>
        })}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 14 }}>
        <b>Clicaram</b> = tocaram na notificação e entraram na plataforma (em até 24h). <b>Ignoraram</b> = receberam e não tocaram depois de 24h. Os cliques são contados a partir de hoje.
      </div>

      {erro && <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 13 }}>{erro}</div>}
      {!dados && !erro && <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Carregando…</div>}

      {dados && (
        <>
          <div style={{ fontWeight: 800, fontSize: 14.5, margin: '4px 0 8px' }}>Notificações automáticas</div>
          {['sentimos_falta', 'oferta_express'].map(function(tipo) {
            const a = auto.filter(function(x) { return x.tipo === tipo })[0]
            return (
              <div key={tipo} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 14.5, flex: 1 }}>{NOMES[tipo]}</span>
                  {a && a.ultimo_envio && <span style={{ fontSize: 12, color: 'var(--muted2)' }}>último envio: {dataBR(a.ultimo_envio)}</span>}
                </div>
                {!a ? (
                  <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Ainda não houve envio nesse período.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Num valor={a.enviados} rotulo="Enviadas" />
                      <Num valor={a.recebidas} rotulo="Chegaram no aparelho" />
                      <Num valor={a.clicaram} rotulo={'Clicaram e entraram (' + pct(a.clicaram, a.enviados) + '%)'} cor="#16a34a" />
                      <Num valor={a.ignoraram} rotulo={'Ignoraram (' + pct(a.ignoraram, a.enviados) + '%)'} cor="#dc2626" />
                      <Num valor={a.aguardando} rotulo="Aguardando (menos de 24h)" cor="#d97706" />
                    </div>
                    <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', marginTop: 12, background: 'var(--surface2)' }}>
                      <div style={{ width: pct(a.clicaram, a.enviados) + '%', background: '#16a34a' }} />
                      <div style={{ width: pct(a.aguardando, a.enviados) + '%', background: '#f59e0b' }} />
                      <div style={{ width: pct(a.ignoraram, a.enviados) + '%', background: '#ef4444' }} />
                    </div>
                  </>
                )}
              </div>
            )
          })}

          <div style={{ fontWeight: 800, fontSize: 14.5, margin: '14px 0 8px' }}>Notificações enviadas por você</div>
          {bc.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Nenhum envio nesse período.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted2)', fontSize: 12 }}>
                    <th style={{ padding: '6px 8px' }}>Notificação</th><th style={{ padding: '6px 8px' }}>Enviadas</th><th style={{ padding: '6px 8px' }}>Clicaram</th><th style={{ padding: '6px 8px' }}>Ignoraram</th>
                  </tr>
                </thead>
                <tbody>
                  {bc.map(function(b: any) {
                    const velho = Date.now() - new Date(b.created_at).getTime() > 24 * 3600 * 1000
                    return (
                      <tr key={b.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px' }}><div style={{ fontWeight: 700 }}>{b.title}</div><div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>{dataBR(b.created_at)}</div></td>
                        <td style={{ padding: '8px' }}>{b.sent_count}</td>
                        {b.tem_dados ? (
                          <>
                            <td style={{ padding: '8px', color: '#16a34a', fontWeight: 800 }}>{b.clicaram} ({pct(b.clicaram, b.sent_count)}%)</td>
                            <td style={{ padding: '8px', color: '#dc2626', fontWeight: 800 }}>{velho ? Math.max(0, b.sent_count - b.clicaram) + ' (' + pct(Math.max(0, b.sent_count - b.clicaram), b.sent_count) + '%)' : 'aguardando'}</td>
                          </>
                        ) : (
                          <td colSpan={2} style={{ padding: '8px', color: 'var(--muted2)', fontSize: 12 }}>sem dados de clique (enviada antes do relatório)</td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
