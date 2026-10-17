'use client'
import { useEffect, useState } from 'react'
import { DIAS, PADRAO, type Horario as H } from '@/lib/waHours'

const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4, display: 'block' }

// Admin define o horario de atendimento e a mensagem automatica de fora do horario
export default function Horario() {
  const [h, setH] = useState<H>(PADRAO)
  const [aberto, setAberto] = useState<boolean | null>(null)
  const [carregou, setCarregou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')

  useEffect(function() {
    fetch('/api/whatsapp/settings', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) {
      if (j.settings) { setH(j.settings); setAberto(!!j.openNow) }
      setCarregou(true)
    }).catch(function() { setCarregou(true); setMsg('Não foi possível carregar.') })
  }, [])

  function dia(k: keyof H['days'], p: Partial<H['days'][keyof H['days']]>) {
    setOk(''); setH({ ...h, days: { ...h.days, [k]: { ...h.days[k], ...p } } })
  }

  async function salvar() {
    setSalvando(true); setMsg(''); setOk('')
    try {
      const r = await fetch('/api/whatsapp/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(h) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setMsg(j.error || 'Não foi possível salvar.')
      else { setH(j.settings); setAberto(!!j.openNow); setOk('Salvo!') }
    } catch (e) { setMsg('Sem conexão. Tente de novo.') }
    setSalvando(false)
  }

  if (!carregou) return <div style={{ padding: 24, color: 'var(--muted2)' }}>Carregando…</div>

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>🕒 Horário de atendimento</div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 14 }}>
          Quando alguém escrever <b>fora do horário</b>, a plataforma responde sozinha com o aviso abaixo. O horário vale para Brasília.
          {aberto !== null && <> Agora o atendimento está <b style={{ color: aberto ? '#15803d' : '#b45309' }}>{aberto ? 'aberto' : 'fechado'}</b>.</>}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
            <input type="checkbox" checked={h.away_enabled} onChange={function(e) { setOk(''); setH({ ...h, away_enabled: e.target.checked }) }} style={{ width: 18, height: 18 }} />
            Responder automaticamente fora do horário
          </label>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', marginBottom: 8 }}>Dias e horários</div>
          {DIAS.map(function(d) {
            const x = h.days[d.k]
            return (
              <div key={d.k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 120, cursor: 'pointer', fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  <input type="checkbox" checked={x.on} onChange={function(e) { dia(d.k, { on: e.target.checked }) }} style={{ width: 17, height: 17 }} />{d.nome}
                </label>
                {x.on ? (
                  <>
                    <input className="at-input" type="time" value={x.start} onChange={function(e) { dia(d.k, { start: e.target.value }) }} style={{ width: 120 }} />
                    <span style={{ color: 'var(--muted2)', fontSize: 13 }}>até</span>
                    <input className="at-input" type="time" value={x.end} onChange={function(e) { dia(d.k, { end: e.target.value }) }} style={{ width: 120 }} />
                  </>
                ) : <span style={{ color: 'var(--muted2)', fontSize: 13 }}>Sem atendimento</span>}
              </div>
            )
          })}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <label style={lab}>Mensagem automática (fora do horário)</label>
          <textarea className="at-input" rows={5} maxLength={1000} value={h.away_message} onChange={function(e) { setOk(''); setH({ ...h, away_message: e.target.value }) }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Não repetir o aviso para a mesma pessoa por</span>
            <select className="at-input" value={h.cooldown_hours} onChange={function(e) { setOk(''); setH({ ...h, cooldown_hours: Number(e.target.value) }) }} style={{ width: 110 }}>
              {[1, 3, 6, 12, 24, 48].map(function(n) { return <option key={n} value={n}>{n} hora{n > 1 ? 's' : ''}</option> })}
            </select>
          </div>
        </div>

        {msg && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>{msg}</div>}
        {ok && <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700, marginBottom: 8 }}>{ok}</div>}
        <button onClick={salvar} disabled={salvando} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '11px 20px', fontWeight: 800, fontSize: 14, opacity: salvando ? 0.6 : 1 }}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </div>
  )
}
