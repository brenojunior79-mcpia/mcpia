'use client'
import { useEffect, useState } from 'react'

type Conexao = { principal: boolean; phoneId: string; waba: string; nome: string; wabaNome: string; numero: string; limite: string; verificacao: string; status: 'ok' | 'analise' | 'atencao'; numStatus: string; qualidade: string; webhookLigado: boolean; apps: string[] }

const box: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 14 }
const linha: React.CSSProperties = { fontSize: 13.5, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }

function Selo({ cor, children }: { cor: 'verde' | 'amarelo' | 'vermelho' | 'cinza'; children: React.ReactNode }) {
  const c = cor === 'verde' ? ['#15803d', 'rgba(22,163,74,0.5)'] : cor === 'amarelo' ? ['#b45309', 'rgba(217,119,6,0.5)'] : cor === 'vermelho' ? ['#dc2626', 'rgba(220,38,38,0.5)'] : ['var(--muted2)', 'var(--border2)']
  return <span style={{ fontSize: 11.5, fontWeight: 800, color: c[0], border: '1px solid ' + c[1], borderRadius: 999, padding: '2px 9px', letterSpacing: 0.3 }}>{children}</span>
}

function fmtNumero(n: string): string {
  const d = n.replace(/\D/g, '')
  if (d.length === 13 && d.indexOf('55') === 0) return '+55 ' + d.slice(2, 4) + ' ' + d.slice(4, 9) + '-' + d.slice(9)
  return n
}

// Lista de conexoes do WhatsApp (numeros ligados na plataforma)
export default function Conexoes() {
  const [lista, setLista] = useState<Conexao[] | null>(null)
  const [erro, setErro] = useState('')
  const [faltam, setFaltam] = useState<string[]>([])
  const [carregando, setCarregando] = useState(false)
  const [msg, setMsg] = useState('')
  const [novo, setNovo] = useState(false)

  async function carregar() {
    setCarregando(true); setErro('')
    try {
      const r = await fetch('/api/whatsapp/connections', { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível carregar.')
      else { setLista(j.conexoes || []); setFaltam(j.faltam || []); if (j.erro) setErro(j.erro) }
    } catch (e) { setErro('Sem conexão.') }
    setCarregando(false)
  }
  useEffect(function() { carregar() }, [])

  async function ligarWebhook() {
    setMsg('')
    try {
      const r = await fetch('/api/whatsapp/subscribe', { method: 'POST' })
      const j = await r.json().catch(function() { return {} })
      setMsg(r.ok ? 'Webhook ligado. Apps ligados: ' + ((j.apps || []).join(', ') || '—') : (j.error || 'Não foi possível ligar.'))
      carregar()
    } catch (e) { setMsg('Sem conexão.') }
  }

  const total = lista ? lista.length : 0
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 19, color: 'var(--text)' }}>Lista de conexões</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{lista ? total + ' conexão' + (total === 1 ? '' : 'ões') + ' cadastrada' + (total === 1 ? '' : 's') : 'Carregando…'}</div>
          </div>
          <button onClick={carregar} disabled={carregando} style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 13.5 }}>{carregando ? '…' : '↻ Atualizar'}</button>
          <button onClick={function() { setNovo(!novo) }} style={{ cursor: 'pointer', border: 0, background: '#1f7a5a', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: 13.5 }}>+ Adicionar conexão</button>
        </div>
        <div style={{ height: 12 }} />

        {novo && (
          <div style={{ ...box, border: '1px solid rgba(31,122,90,0.5)' }}>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)', marginBottom: 6 }}>Adicionar outro WhatsApp oficial</div>
            <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>
              Para ligar mais um número, você precisa me passar:
              <ol style={{ margin: '6px 0 6px 18px', padding: 0 }}>
                <li><b>Phone Number ID</b> do número (Meta → WhatsApp → Configuração da API).</li>
                <li><b>ID da conta do WhatsApp (WABA)</b> dele.</li>
                <li>O nome que você quer dar à conexão (ex: Recuperação).</li>
              </ol>
              Se o número estiver em outro app da Meta, a chave de acesso dele é colocada direto na Vercel (nunca aqui no chat). Esses IDs não são secretos, pode mandar no chat.
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 8, lineHeight: 1.5 }}>Hoje a plataforma atende por um número só. Para receber e responder por dois números no mesmo Atendimento, eu preciso ajustar o sistema quando você trouxer o segundo. Esta lista já está pronta para mostrar todos eles.</div>
          </div>
        )}

        {erro && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 10 }}>{erro}</div>}
        {faltam.length > 0 && <div style={{ ...box, fontSize: 13.5, color: 'var(--text)' }}>Falta ligar o número. Chaves que faltam na Vercel: <b>{faltam.join(', ')}</b>.</div>}
        {msg && <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700, marginBottom: 10 }}>{msg}</div>}

        {(lista || []).map(function(c) {
          const q = c.qualidade === 'GREEN' ? ['ALTA', 'verde'] : c.qualidade === 'YELLOW' ? ['MÉDIA', 'amarelo'] : c.qualidade === 'RED' ? ['BAIXA', 'vermelho'] : ['—', 'cinza']
          return (
            <div key={c.phoneId} style={box}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(31,122,90,0.08)', border: '1px solid rgba(31,122,90,0.45)', borderRadius: 12, padding: 12 }}>
                <div style={{ position: 'relative', width: 46, height: 46, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  📱<span style={{ position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--surface)', background: c.numStatus === 'CONNECTED' || !c.numStatus ? '#22c55e' : '#f59e0b' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{c.nome || 'WhatsApp'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>WABA: {c.wabaNome || c.waba || '—'}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600, marginTop: 2 }}>{fmtNumero(c.numero)}</div>
                </div>
                {c.principal && <Selo cor="verde">PRINCIPAL</Selo>}
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={linha}><b>Limite de mensagens:</b> <span style={{ color: 'var(--muted2)' }}>{c.limite || '—'}</span></div>
                <div style={linha}><b>Verificação Empresarial:</b> {c.verificacao === 'verificada' ? <Selo cor="verde">VERIFICADA</Selo> : c.verificacao === 'rejeitada' ? <Selo cor="vermelho">REJEITADA</Selo> : c.verificacao === 'pendente' ? <span style={{ color: 'var(--muted2)' }}>Pendente</span> : <span style={{ color: 'var(--muted2)' }}>—</span>}</div>
                <div style={linha}><b>Status da Conta:</b> {c.status === 'ok' ? <Selo cor="verde">OK</Selo> : c.status === 'analise' ? <Selo cor="amarelo">EM ANÁLISE</Selo> : <Selo cor="vermelho">ATENÇÃO</Selo>}</div>
                <div style={linha}><b>Qualidade:</b> <Selo cor={q[1] as any}>{q[0]}</Selo></div>
                <div style={linha}><b>Recebimento (webhook):</b> {c.webhookLigado ? <Selo cor="verde">LIGADO</Selo> : <Selo cor="vermelho">DESLIGADO</Selo>}{c.apps.length > 0 && <span style={{ color: 'var(--muted2)', fontSize: 12.5 }}>apps: {c.apps.join(', ')}</span>}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button onClick={ligarWebhook} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 13 }}>🔗 Ligar webhook</button>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 10, wordBreak: 'break-all' }}>Phone Number ID: {c.phoneId} · WABA ID: {c.waba || '—'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
