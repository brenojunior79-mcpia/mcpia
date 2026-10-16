'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Pedido = { id: string; nome: string; email: string; whatsapp?: string | null; pix: string; tipo: string; valor: number; quando: string; qtd: number }
type Pago = { id: string; nome: string; valor: number; pago_em: string }
type Chave = { id: string; nome: string; email: string; whatsapp: string | null; tipo: string | null; chave: string; cadastrado_em: string; compras: number; a_receber: number; pago: number }
type Dados = { pendentes: Pedido[]; pagos: Pago[]; a_pagar: number; pago_total: number; indicacoes: number; em_espera: number }

function brl(v: any): string {
  return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function quando(v: any): string {
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Admin: saques do "Indique e ganhe". Voce faz o Pix no seu banco e marca como pago aqui.
export default function ReferralPayoutsCard() {
  const supabase = createClient()
  const [d, setD] = useState<Dados | null>(null)
  const [busy, setBusy] = useState('')
  const [copiado, setCopiado] = useState('')
  const [chaves, setChaves] = useState<Chave[] | null>(null)
  const [verChaves, setVerChaves] = useState(false)

  async function carregar() {
    const r = await supabase.rpc('admin_referral_payouts')
    if (!r.error && r.data) setD(r.data as Dados)
    const k = await supabase.rpc('admin_referral_pix_report')
    if (!k.error && k.data) setChaves(k.data as Chave[])
  }

  function baixarCsv() {
    if (!chaves) return
    const esc = function(v: any) { return '"' + String(v ?? '').replace(/"/g, '""') + '"' }
    const linhas = [['Nome', 'E-mail', 'WhatsApp', 'Tipo da chave', 'Chave Pix', 'Cadastrada em', 'Compras indicadas', 'A receber', 'Já pago']].concat(
      chaves.map(function(c) { return [c.nome, c.email, c.whatsapp, c.tipo, c.chave, c.cadastrado_em ? new Date(c.cadastrado_em).toLocaleString('pt-BR') : '', c.compras, brl(c.a_receber), brl(c.pago)] as any })
    )
    const csv = '\ufeff' + linhas.map(function(l) { return l.map(esc).join(';') }).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'chaves-pix-indique-e-ganhe.csv'; a.click()
    setTimeout(function() { URL.revokeObjectURL(url) }, 1000)
  }
  useEffect(function() {
    carregar()
    const t = setInterval(carregar, 60000)
    return function() { clearInterval(t) }
  }, [])

  async function agir(p: Pedido, acao: 'pagar' | 'recusar') {
    const ok = window.confirm(acao === 'pagar'
      ? 'Confirma que você já enviou ' + brl(p.valor) + ' no Pix para ' + p.nome + '?'
      : 'Recusar o saque de ' + p.nome + '? O valor volta para o saldo dele.')
    if (!ok) return
    setBusy(p.id)
    await supabase.rpc(acao === 'pagar' ? 'admin_referral_mark_paid' : 'admin_referral_reject', { p_id: p.id })
    setBusy('')
    carregar()
  }

  async function copiar(p: Pedido) {
    try { await navigator.clipboard.writeText(p.pix); setCopiado(p.id); setTimeout(function() { setCopiado('') }, 1800) } catch (e) {}
  }

  if (!d) return null
  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }
  const pill = (txt: string, val: string, cor?: string) => (
    <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '8px 12px', minWidth: 120 }}>
      <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600 }}>{txt}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: cor || 'var(--text)' }}>{val}</div>
    </div>
  )

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>🎁 Indique e ganhe — saques</div>
        {d.pendentes.length > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '2px 8px' }}>{d.pendentes.length} para pagar</span>}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {pill('A pagar agora', brl(d.a_pagar), d.a_pagar > 0 ? '#dc2626' : undefined)}
        {pill('Aguardando 7 dias', brl(d.em_espera), '#b45309')}
        {pill('Já pago', brl(d.pago_total), '#15803d')}
        {pill('Indicações', String(d.indicacoes))}
      </div>

      {d.pendentes.length === 0 ? (
        <div style={{ fontSize: 13.5, color: 'var(--muted2)' }}>Nenhum saque pedido no momento.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.pendentes.map(function(p) {
            return (
              <div key={p.id} style={{ border: '1px solid var(--border2)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{p.nome || 'Sem nome'} · <span style={{ color: '#15803d' }}>{brl(p.valor)}</span> <span style={{ fontWeight: 500, fontSize: 12, color: 'var(--muted2)' }}>({p.qtd} {p.qtd === 1 ? 'indicação' : 'indicações'})</span></div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)', wordBreak: 'break-all' }}>{p.email} · pedido em {quando(p.quando)}</div>
                  <div style={{ fontSize: 13, marginTop: 4, wordBreak: 'break-all' }}>Pix ({p.tipo || 'chave'}): <b>{p.pix}</b></div>
                  {p.whatsapp && <div style={{ fontSize: 13, marginTop: 2 }}>WhatsApp: <a href={'https://wa.me/' + String(p.whatsapp).replace(/\D/g, '')} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: '#16a34a' }}>{p.whatsapp}</a></div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={function() { copiar(p) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '8px 12px', fontWeight: 700, fontSize: 12.5 }}>{copiado === p.id ? '✓ Copiada' : 'Copiar chave'}</button>
                  <button disabled={busy === p.id} onClick={function() { agir(p, 'pagar') }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '8px 12px', fontWeight: 800, fontSize: 12.5, opacity: busy === p.id ? .6 : 1 }}>Marcar como pago</button>
                  <button disabled={busy === p.id} onClick={function() { agir(p, 'recusar') }} style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 10, padding: '8px 12px', fontWeight: 700, fontSize: 12.5 }}>Recusar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {d.pagos.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted2)' }}>
          <b>Últimos pagos:</b> {d.pagos.slice(0, 5).map(function(x) { return (x.nome || 'Aluno') + ' ' + brl(x.valor) }).join(' · ')}
        </div>
      )}
      {/* Relatorio: todas as pessoas que cadastraram chave Pix */}
      <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={function() { setVerChaves(!verChaves) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '8px 12px', fontWeight: 800, fontSize: 13 }}>
            📋 Chaves Pix cadastradas ({chaves ? chaves.length : 0}) {verChaves ? '▲' : '▼'}
          </button>
          {verChaves && chaves && chaves.length > 0 && (
            <button onClick={baixarCsv} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '8px 12px', fontWeight: 800, fontSize: 12.5 }}>Baixar planilha (CSV)</button>
          )}
        </div>
        {verChaves && (
          chaves && chaves.length > 0 ? (
            <div style={{ overflowX: 'auto', marginTop: 10, border: '1px solid var(--border)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 760 }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', textAlign: 'left' }}>
                    {['Nome', 'WhatsApp', 'Tipo', 'Chave Pix', 'Cadastrada', 'Compras', 'A receber', 'Pago'].map(function(h) {
                      return <th key={h} style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--muted2)', whiteSpace: 'nowrap' }}>{h}</th>
                    })}
                  </tr>
                </thead>
                <tbody>
                  {chaves.map(function(c) {
                    return (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px' }}><div style={{ fontWeight: 700 }}>{c.nome || 'Sem nome'}</div><div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>{c.email}</div></td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{c.whatsapp ? <a href={'https://wa.me/' + String(c.whatsapp).replace(/\D/g, '')} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', fontWeight: 700 }}>{c.whatsapp}</a> : '—'}</td>
                        <td style={{ padding: '8px 10px' }}>{c.tipo || '—'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, wordBreak: 'break-all' }}>{c.chave}</td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{quando(c.cadastrado_em)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{c.compras}</td>
                        <td style={{ padding: '8px 10px', color: '#b45309', fontWeight: 700, whiteSpace: 'nowrap' }}>{brl(c.a_receber)}</td>
                        <td style={{ padding: '8px 10px', color: '#15803d', fontWeight: 700, whiteSpace: 'nowrap' }}>{brl(c.pago)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: 'var(--muted2)', marginTop: 10 }}>Ninguém cadastrou a chave Pix ainda.</div>
          )
        )}
      </div>
    </div>
  )
}
