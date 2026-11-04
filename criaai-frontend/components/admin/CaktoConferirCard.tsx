'use client'
import { useState } from 'react'

function brl(v: any): string {
  return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function dia(iso: any): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

// Botao que confere as assinaturas ativas na Cakto (API, so leitura) com o card "Pagando agora"
export default function CaktoConferirCard() {
  const [carregando, setCarregando] = useState(false)
  const [r, setR] = useState<any>(null)
  const [erro, setErro] = useState('')

  async function conferir() {
    setCarregando(true); setErro(''); setR(null)
    try {
      const resp = await fetch('/api/admin/cakto-assinaturas', { cache: 'no-store' })
      const j = await resp.json().catch(function() { return null })
      if (!j) setErro('Nao foi possivel ler a resposta.')
      else if (j.ok === false) setErro('Etapa "' + (j.etapa || '?') + '"' + (j.http ? ' (HTTP ' + j.http + ')' : '') + ': ' + (j.erro || 'erro') + (j.escopos ? ' | escopos da chave: ' + j.escopos : ''))
      else if (j.error) setErro(j.error)
      else setR(j)
    } catch (e) { setErro('Falha de conexao.') }
    setCarregando(false)
  }

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 28 }
  const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, color: 'var(--muted2)', fontWeight: 700, padding: '6px 8px', borderBottom: '1px solid var(--border)' }
  const td: React.CSSProperties = { fontSize: 12.5, padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 700 }}>Conferir com a Cakto</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>Busca as assinaturas direto na Cakto e compara com o card "Pagando agora". So leitura.</div>
        </div>
        <button onClick={conferir} disabled={carregando} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: carregando ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700 }}>{carregando ? 'Conferindo...' : 'Conferir agora'}</button>
      </div>

      {erro && <div style={{ marginTop: 14, fontSize: 13, color: 'var(--red)', lineHeight: 1.5 }}>{erro}</div>}

      {r && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: '1 1 200px', background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700 }}>NA CAKTO (ativas)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{r.cakto.ativas}</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{brl(r.cakto.valor_ativas)} por mes</div>
            </div>
            <div style={{ flex: '1 1 200px', background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700 }}>NO PAINEL (pagando agora)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{r.painel.pagantes}</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{r.painel.do_cakto} deles vieram da Cakto</div>
            </div>
            <div style={{ flex: '1 1 200px', background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700 }}>VALOR POR MES NO PAINEL</div>
              <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 4 }}>Card (preco do plano): <b>{brl(r.painel.receita_card)}</b></div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>Real (valor cobrado): <b>{brl(r.painel.receita_real)}</b></div>
            </div>
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 10 }}>
            Todas as assinaturas na Cakto: {r.cakto.total}. Por situacao: {Object.keys(r.cakto.por_status).map(function(k) { return k + ' ' + r.cakto.por_status[k].qtd }).join(' | ')}
            {r.truncado ? ' (lista cortada: ha mais paginas)' : ''}
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', margin: '14px 0 6px' }}>Ativas na Cakto e sem aluno ativo no painel ({r.so_cakto.length})</div>
          {r.so_cakto.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>Nenhuma.</div> : (
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={th}>Cliente (como a Cakto mostra)</th><th style={th}>Oferta</th><th style={th}>Valor</th><th style={th}>Proxima</th></tr></thead><tbody>
              {r.so_cakto.map(function(x: any, i: number) { return <tr key={i}><td style={td}>{x.cliente || '-'}</td><td style={td}>{x.oferta || x.produto || '-'}</td><td style={td}>{brl(x.valor)}</td><td style={td}>{dia(x.proxima)}</td></tr> })}
            </tbody></table></div>
          )}

          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', margin: '18px 0 6px' }}>Ativos no painel (Cakto) mas sem assinatura ativa na Cakto ({r.so_painel.length})</div>
          {r.so_painel.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>Nenhum.</div> : (
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={th}>Nome</th><th style={th}>E-mail</th><th style={th}>Plano</th><th style={th}>Valor</th><th style={th}>Proxima</th></tr></thead><tbody>
              {r.so_painel.map(function(x: any, i: number) { return <tr key={i}><td style={td}>{x.nome || '-'}</td><td style={td}>{x.email || '-'}</td><td style={td}>{x.plano || '-'}</td><td style={td}>{brl(x.valor)}</td><td style={td}>{dia(x.proxima)}</td></tr> })}
            </tbody></table></div>
          )}

          {r.amostra_cliente && r.amostra_cliente.length > 0 && <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 12 }}>Como a Cakto identifica o cliente (exemplos): {r.amostra_cliente.join(' | ')}</div>}
        </div>
      )}
    </div>
  )
}
