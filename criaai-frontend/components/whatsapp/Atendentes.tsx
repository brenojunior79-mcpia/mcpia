'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Pessoa = { id: string; nome: string; email: string }

// Admin escolhe quem da equipe pode atender (essas pessoas so veem o menu de atendimento)
export default function Atendentes() {
  const supabase = createClient()
  const [lista, setLista] = useState<Pessoa[]>([])
  const [carregou, setCarregou] = useState(false)
  const [resp, setResp] = useState<Record<string, number>>({})
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')

  async function carregar() {
    const r = await supabase.rpc('wa_support_list')
    if (!r.error && r.data) setLista(r.data as any)
    setCarregou(true)
    // respostas enviadas por cada pessoa nos ultimos 30 dias
    const desde = new Date(Date.now() - 30 * 86400000).toISOString()
    const m = await supabase.from('wa_messages').select('sent_by').eq('direction', 'out').gte('created_at', desde).limit(5000)
    if (!m.error && m.data) {
      const c: Record<string, number> = {}
      for (const x of m.data as any[]) { if (x.sent_by) c[x.sent_by] = (c[x.sent_by] || 0) + 1 }
      setResp(c)
    }
  }
  useEffect(function() { carregar() }, [])

  async function mudar(em: string, on: boolean) {
    setMsg(''); setOk('')
    const r = await supabase.rpc('wa_set_support', { p_email: em.trim(), p_on: on })
    if (r.error) setMsg(r.error.message)
    else { if (on) { setEmail(''); setOk('Atendente adicionado.') } else setOk('Atendente removido.'); carregar() }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>👥 Atendentes</div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 14 }}>
          Quem você adicionar aqui vê <b>só o menu de atendimento</b>, sem acesso ao resto do painel admin. A pessoa precisa já ter conta na plataforma com esse e-mail. Administradores sempre têm acesso.
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', marginBottom: 8 }}>Adicionar atendente</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="at-input" type="email" placeholder="E-mail da conta do atendente" value={email} onChange={function(e) { setEmail(e.target.value) }} onKeyDown={function(e) { if (e.key === 'Enter' && email.trim()) mudar(email, true) }} style={{ flex: '1 1 240px', width: 'auto' }} />
            <button onClick={function() { if (email.trim()) mudar(email, true) }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 800 }}>Adicionar</button>
          </div>
          {msg && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginTop: 8 }}>{msg}</div>}
          {ok && <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700, marginTop: 8 }}>{ok}</div>}
        </div>

        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', marginBottom: 8 }}>Equipe ({lista.length})</div>
        {!carregou && <div style={{ color: 'var(--muted2)', fontSize: 13.5 }}>Carregando…</div>}
        {carregou && lista.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--muted2)' }}>Nenhum atendente adicionado ainda.</div>}
        {lista.map(function(p) {
          const n = resp[p.id] || 0
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#4ade80)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{((p.nome || p.email || '?').trim()[0] || '?').toUpperCase()}</div>
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{p.nome || 'Sem nome'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted2)', wordBreak: 'break-all' }}>{p.email}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', textAlign: 'center' }}><b style={{ fontSize: 16, color: 'var(--text)' }}>{n}</b><br />resposta{n === 1 ? '' : 's'} em 30 dias</div>
              <button onClick={function() { if (window.confirm('Remover ' + (p.nome || p.email) + ' do atendimento?')) mudar(p.email, false) }} style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 8, padding: '6px 10px', fontWeight: 700, fontSize: 12 }}>Remover</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
