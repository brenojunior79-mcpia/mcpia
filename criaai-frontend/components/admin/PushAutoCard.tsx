'use client'
import { useEffect, useRef, useState } from 'react'

// Horario do envio (Brasilia) de cada aviso. Precisa bater com o vercel.json.
const INFO: Record<string, { nome: string; icone: string; hora: number; quem: string; cor: string; cor2: string }> = {
  sentimos_falta: { nome: 'Sentimos sua falta', icone: '💛', hora: 9, quem: 'Quem está sem abrir a plataforma', cor: '#f59e0b', cor2: '#f97316' },
  oferta_express: { nome: 'Oferta Estrutura Express', icone: '🚀', hora: 18, quem: 'Quem ainda não tem a Estrutura Express', cor: '#8b5cf6', cor2: '#ec4899' },
  ranking_diario: { nome: 'Olha o ranking', icone: '🏆', hora: 19, quem: 'Todos que ativaram as notificações', cor: '#eab308', cor2: '#f97316' },
}

const CSS = `
@keyframes paUp { from { opacity: 0; transform: translateY(16px) scale(.98) } to { opacity: 1; transform: none } }
@keyframes paRing { 0%,60%,100% { transform: rotate(0) } 10% { transform: rotate(16deg) } 20% { transform: rotate(-14deg) } 30% { transform: rotate(10deg) } 40% { transform: rotate(-8deg) } 50% { transform: rotate(4deg) } }
@keyframes paPulse { 0% { box-shadow: 0 0 0 0 var(--pc) } 70% { box-shadow: 0 0 0 12px transparent } 100% { box-shadow: 0 0 0 0 transparent } }
@keyframes paShine { 0% { background-position: -150% 0 } 100% { background-position: 250% 0 } }
@keyframes paSlide { from { transform: translateX(-12px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes paGrow { from { width: 0 } }
@keyframes paBlink { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
.pa-up { animation: paUp .55s cubic-bezier(.2,.8,.2,1) both }
.pa-ring { display: inline-block; transform-origin: 50% 10%; animation: paRing 3.4s ease-in-out infinite }
.pa-dot { animation: paPulse 1.8s infinite }
.pa-notif { animation: paSlide .6s .25s cubic-bezier(.2,.8,.2,1) both; position: relative; overflow: hidden }
.pa-notif::after { content: ''; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.35) 50%, transparent 65%); background-size: 250% 100%; animation: paShine 3.8s ease-in-out infinite; pointer-events: none }
.pa-card { transition: transform .2s ease, box-shadow .2s ease }
.pa-card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(0,0,0,.16) }
.pa-btn { cursor: pointer; transition: transform .15s ease, filter .15s ease, background .15s ease }
.pa-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.07) }
.pa-btn:disabled { opacity: .6; cursor: default }
.pa-sw { position: relative; width: 42px; height: 24px; border-radius: 999px; border: 0; cursor: pointer; transition: background .25s ease; padding: 0; flex-shrink: 0 }
.pa-sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.3); transition: transform .25s cubic-bezier(.3,1.4,.5,1) }
.pa-sw.on::after { transform: translateX(18px) }
.pa-edit { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s ease }
.pa-edit.open { grid-template-rows: 1fr }
.pa-edit > div { overflow: hidden }
@media (prefers-reduced-motion: reduce) { .pa-up,.pa-ring,.pa-dot,.pa-notif,.pa-notif::after { animation: none !important } }
`

function quando(iso: string | null) {
  if (!iso) return 'ainda não enviou'
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch (e) { return iso }
}

// Numero que "sobe" ate o valor
function Contador({ valor }: { valor: number }) {
  const [v, setV] = useState(0)
  const ant = useRef(0)
  useEffect(function() {
    const de = ant.current, ate = valor, t0 = Date.now(), dur = 900
    let raf = 0
    function passo() {
      const k = Math.min(1, (Date.now() - t0) / dur)
      setV(Math.round(de + (ate - de) * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(passo); else ant.current = ate
    }
    raf = requestAnimationFrame(passo)
    return function() { cancelAnimationFrame(raf) }
  }, [valor])
  return <>{v.toLocaleString('pt-BR')}</>
}

// Segundos do dia em Brasilia (UTC-3)
function segBrasilia(agora: number) {
  const d = new Date(agora - 3 * 3600 * 1000)
  return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()
}
function falta(hora: number, agora: number) {
  let s = hora * 3600 - segBrasilia(agora)
  if (s <= 0) s += 86400
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? h + 'h ' + String(m).padStart(2, '0') + 'min' : m + 'min ' + String(s % 60).padStart(2, '0') + 's'
}

export default function PushAutoCard() {
  const [itens, setItens] = useState<any[] | null>(null)
  const [vendaOn, setVendaOn] = useState(true)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState<Record<string, { ok: boolean; t: string }>>({})
  const [busy, setBusy] = useState('')
  const [rodando, setRodando] = useState(false)
  const [aberto, setAberto] = useState('')
  const [agora, setAgora] = useState(Date.now())

  async function carregar() {
    try {
      const r = await fetch('/api/push/auto/config', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) { setErro(j.error || 'Não foi possível carregar.'); return }
      setErro('')
      setVendaOn(!(j.vendaAdmin && j.vendaAdmin.ativo === false))
      setItens((j.itens || []).map(function(i: any) { return { ...i, form: { ...(i.config || {}) } } }))
    } catch (e) { setErro('Sem conexão.') }
  }
  useEffect(function() { carregar() }, [])
  useEffect(function() { const t = setInterval(function() { setAgora(Date.now()) }, 1000); return function() { clearInterval(t) } }, [])

  function mudar(tipo: string, campo: string, valor: any) {
    setItens(function(ant) { return (ant || []).map(function(i) { return i.tipo === tipo ? { ...i, form: { ...i.form, [campo]: valor } } : i }) })
  }
  function aviso(tipo: string, ok: boolean, t: string) { setMsg(function(m) { return { ...m, [tipo]: { ok, t } } }) }

  async function salvar(i: any, ativoNovo?: boolean) {
    setBusy(i.tipo + 's')
    const f = { ...i.form, ...(ativoNovo === undefined ? {} : { ativo: ativoNovo }) }
    try {
      const r = await fetch('/api/push/auto/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: i.tipo, ativo: f.ativo, titulo: f.titulo, mensagem: f.mensagem, url: f.url, dias_sem_entrar: f.dias_sem_entrar, repetir_dias: f.repetir_dias }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) aviso(i.tipo, false, j.error || 'Não foi possível salvar.')
      else { aviso(i.tipo, true, ativoNovo === undefined ? '✓ Salvo.' : ativoNovo ? '✓ Ligada.' : '✓ Desligada.'); await carregar() }
    } catch (e) { aviso(i.tipo, false, 'Sem conexão.') }
    setBusy('')
  }

  async function testar(i: any) {
    setBusy(i.tipo + 't')
    try {
      const r = await fetch('/api/push/auto?teste=1&tipo=' + i.tipo, { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) aviso(i.tipo, false, j.error || 'Não foi possível enviar o teste.')
      else aviso(i.tipo, true, '✓ Teste enviado para o seu celular (salve antes se mudou o texto).')
    } catch (e) { aviso(i.tipo, false, 'Sem conexão.') }
    setBusy('')
  }

  async function ligarVenda(novo: boolean) {
    setBusy('vs')
    try {
      const r = await fetch('/api/push/auto/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'venda_admin', ativo: novo }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) aviso('venda', false, j.error || 'Não foi possível salvar.')
      else { setVendaOn(novo); aviso('venda', true, novo ? '✓ Ligado.' : '✓ Desligado.') }
    } catch (e) { aviso('venda', false, 'Sem conexão.') }
    setBusy('')
  }

  async function testarVenda() {
    setBusy('vt')
    try {
      const r = await fetch('/api/push/auto?teste=1&tipo=venda_admin', { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) aviso('venda', false, j.error || 'Não foi possível enviar o teste.')
      else aviso('venda', true, '✓ Exemplo enviado para o seu celular.')
    } catch (e) { aviso('venda', false, 'Sem conexão.') }
    setBusy('')
  }

  async function enviarUm(i: any) {
    if (!window.confirm('Enviar AGORA "' + INFO[i.tipo].nome + '" para as ' + i.entrariamAgora + ' pessoa(s) que entram na regra? Isso manda notificação de verdade para os alunos.')) return
    setBusy(i.tipo + 'e')
    try {
      const r = await fetch('/api/push/auto?executar=1&tipo=' + i.tipo, { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) aviso(i.tipo, false, j.error || 'Não foi possível enviar.')
      else { const x = j[i.tipo] || {}; aviso(i.tipo, !x.erro, x.erro ? 'Erro: ' + x.erro : x.desligado ? 'Este aviso está desligado.' : '✓ Enviado para ' + (x.pessoas || 0) + ' pessoa(s).'); await carregar() }
    } catch (e) { aviso(i.tipo, false, 'Sem conexão.') }
    setBusy('')
  }

  async function executarAgora() {
    if (!window.confirm('Enviar AGORA os dois avisos para todos que entram na regra? Isso manda notificação de verdade para os alunos.')) return
    setRodando(true)
    try {
      const r = await fetch('/api/push/auto?executar=1', { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível enviar.')
      else {
        setErro('')
        aviso('geral', true, '✓ Enviado. Sentimos sua falta: ' + ((j.sentimos_falta && j.sentimos_falta.pessoas) || 0) + ' pessoa(s). Oferta Express: ' + ((j.oferta_express && j.oferta_express.pessoas) || 0) + ' pessoa(s).')
        await carregar()
      }
    } catch (e) { setErro('Sem conexão.') }
    setRodando(false)
  }

  const input: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
  const rot: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }
  const botao: React.CSSProperties = { borderRadius: 9, padding: '7px 12px', fontWeight: 700, fontSize: 12.5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }

  const seg = segBrasilia(agora)
  const pctDia = (seg / 86400) * 100
  const horaTxt = String(Math.floor(seg / 3600)).padStart(2, '0') + ':' + String(Math.floor((seg % 3600) / 60)).padStart(2, '0')
  const ordem = ['sentimos_falta', 'oferta_express', 'ranking_diario']
  // Proximo envio entre os avisos ligados
  const ligados = (itens || []).filter(function(x: any) { return x.form && x.form.ativo })
  let prox: any = null
  ligados.forEach(function(x: any) {
    let s = INFO[x.tipo].hora * 3600 - seg; if (s <= 0) s += 86400
    if (!prox || s < prox.s) prox = { s, tipo: x.tipo }
  })

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{CSS}</style>

      {/* Cabecalho + linha do tempo do dia */}
      <div className="pa-up" style={{ background: 'linear-gradient(120deg,#1e1b4b,#312e81 45%,#6d28d9)', borderRadius: 18, padding: '16px 18px 18px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17 }}><span className="pa-ring">🔔</span> Notificações automáticas</div>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
              {prox ? <>Próximo envio: <b>{INFO[prox.tipo].nome}</b> em <b style={{ fontVariantNumeric: 'tabular-nums' }}>{falta(INFO[prox.tipo].hora, agora)}</b></> : (itens ? 'Nenhum aviso ligado no momento' : 'Carregando…')}
            </div>
          </div>
          <button className="pa-btn" onClick={executarAgora} disabled={rodando || !itens} style={{ border: '1px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.14)', color: '#fff', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 12.5 }}>{rodando ? 'Enviando…' : '⚡ Enviar agora'}</button>
        </div>

        <div style={{ position: 'relative', height: 62, marginTop: 14 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.18)' }} />
          <div style={{ position: 'absolute', left: 0, top: 30, height: 6, borderRadius: 999, width: pctDia + '%', background: 'linear-gradient(90deg,#fbbf24,#ec4899)', animation: 'paGrow 1.2s ease-out', transition: 'width 1s linear' }} />
          {ordem.map(function(tipo) {
            const inf = INFO[tipo]
            const it = (itens || []).filter(function(x: any) { return x.tipo === tipo })[0]
            const on = !it || (it.form && it.form.ativo)
            return (
              <div key={tipo} style={{ position: 'absolute', left: (inf.hora / 24 * 100) + '%', top: 0, transform: 'translateX(-50%)', textAlign: 'center', opacity: on ? 1 : 0.45 }}>
                <div style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', marginBottom: 2 }}>{inf.icone} {inf.hora}h</div>
                <div className={on ? 'pa-dot' : ''} style={{ ['--pc' as any]: inf.cor + '99', width: 16, height: 16, borderRadius: '50%', margin: '5px auto 0', background: 'linear-gradient(135deg,' + inf.cor + ',' + inf.cor2 + ')', border: '2px solid #fff' } as React.CSSProperties} />
              </div>
            )
          })}
          <div style={{ position: 'absolute', left: pctDia + '%', top: 22, transform: 'translateX(-50%)', transition: 'left 1s linear', textAlign: 'center' }}>
            <div style={{ width: 4, height: 22, borderRadius: 2, background: '#fff', margin: '0 auto', boxShadow: '0 0 10px #fff' }} />
            <div style={{ fontSize: 10.5, fontWeight: 800, marginTop: 2, background: 'rgba(255,255,255,.2)', borderRadius: 6, padding: '1px 6px', fontVariantNumeric: 'tabular-nums' }}>agora {horaTxt}</div>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 44, fontSize: 9.5, opacity: 0.6 }}>0h</div>
          <div style={{ position: 'absolute', right: 0, top: 44, fontSize: 9.5, opacity: 0.6 }}>24h</div>
        </div>
      </div>

      {msg.geral && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: msg.geral.ok ? 'var(--green)' : 'var(--red)' }}>{msg.geral.t}</div>}
      {erro && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: 'var(--red)' }}>⚠ {erro}</div>}

      {/* Um cartao por aviso */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, marginTop: 14 }}>
        {(itens || []).map(function(i: any, idx: number) {
          const f = i.form || {}
          const inf = INFO[i.tipo]
          const m = msg[i.tipo]
          const edit = aberto === i.tipo
          const on = !!f.ativo
          return (
            <div key={i.tipo} className="pa-card pa-up" style={{ animationDelay: (0.12 + idx * 0.12) + 's', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', opacity: on ? 1 : 0.8 }}>
              <div style={{ height: 5, background: on ? 'linear-gradient(90deg,' + inf.cor + ',' + inf.cor2 + ')' : 'var(--border2)' }} />
              <div style={{ padding: '14px 16px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,' + inf.cor + ',' + inf.cor2 + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{inf.icone}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5 }}>{inf.nome}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>Todo dia às {inf.hora}h · {inf.quem}</div>
                  </div>
                  <button className={'pa-sw' + (on ? ' on' : '')} title={on ? 'Desligar' : 'Ligar'} disabled={busy !== ''} onClick={function() { salvar(i, !on) }} style={{ background: on ? '#22c55e' : 'var(--border2)' }} />
                </div>

                {/* Previa de como chega no celular */}
                <div className="pa-notif" style={{ marginTop: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px', display: 'flex', gap: 10 }}>
                  <img src="/icon-192.png" alt="" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--muted2)' }}>Cristão Próspero · {inf.hora}h</div>
                    <div style={{ fontSize: 13, fontWeight: 800, wordBreak: 'break-word' }}>{f.titulo || ''}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.4, wordBreak: 'break-word' }}>{f.mensagem || ''}</div>
                  </div>
                </div>

                {/* Numeros */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {[
                    { n: i.entrariamAgora, t: 'receberiam agora', d: true },
                    { n: i.enviados24h, t: 'enviados em 24h' },
                    { n: i.enviados7d, t: 'enviados em 7 dias' },
                  ].map(function(x: any, k: number) {
                    return (
                      <div key={k} style={{ flex: 1, background: x.d ? 'linear-gradient(135deg,' + inf.cor + '22,' + inf.cor2 + '22)' : 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 11, padding: '8px 6px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}><Contador valor={x.n} /></div>
                        <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 2 }}>{x.t}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 8 }}>Último envio: <b style={{ color: 'var(--text)' }}>{quando(i.ultimoEnvio)}</b></div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button className="pa-btn" onClick={function() { testar(i) }} disabled={busy !== ''} style={botao}>{busy === i.tipo + 't' ? 'Enviando…' : '📲 Testar no meu celular'}</button>
                  <button className="pa-btn" onClick={function() { setAberto(edit ? '' : i.tipo) }} style={botao}>{edit ? '✕ Fechar' : '✎ Editar'}</button>
                  <button className="pa-btn" onClick={function() { enviarUm(i) }} disabled={busy !== '' || !on} title={on ? '' : 'Ligue o aviso para enviar'} style={{ ...botao, border: 0, color: '#fff', background: 'linear-gradient(135deg,' + inf.cor + ',' + inf.cor2 + ')' }}>{busy === i.tipo + 'e' ? 'Enviando…' : '⚡ Enviar agora'}</button>
                </div>
                {m && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: m.ok ? 'var(--green)' : 'var(--red)' }}>{m.t}</div>}

                <div className={'pa-edit' + (edit ? ' open' : '')}>
                  <div>
                    <div style={{ paddingTop: 12 }}>
                      <label style={rot}>Título ({(f.titulo || '').length}/65)</label>
                      <input style={input} maxLength={65} value={f.titulo || ''} onChange={function(e) { mudar(i.tipo, 'titulo', e.target.value) }} />
                      <label style={{ ...rot, marginTop: 8 }}>Mensagem ({(f.mensagem || '').length}/240)</label>
                      <textarea style={{ ...input, minHeight: 56, resize: 'vertical' }} maxLength={240} value={f.mensagem || ''} onChange={function(e) { mudar(i.tipo, 'mensagem', e.target.value) }} />
                      <label style={{ ...rot, marginTop: 8 }}>Ao tocar, abrir</label>
                      <input style={input} value={f.url || ''} onChange={function(e) { mudar(i.tipo, 'url', e.target.value) }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {i.tipo === 'sentimos_falta' && (
                          <div style={{ flex: 1 }}>
                            <label style={rot}>Dias sem entrar</label>
                            <input style={input} type="number" min={1} max={60} value={f.dias_sem_entrar || 2} onChange={function(e) { mudar(i.tipo, 'dias_sem_entrar', e.target.value) }} />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <label style={rot}>Repetir a cada (dias)</label>
                          <input style={input} type="number" min={1} max={60} value={f.repetir_dias || 1} onChange={function(e) { mudar(i.tipo, 'repetir_dias', e.target.value) }} />
                        </div>
                      </div>
                      <button className="pa-btn" onClick={function() { salvar(i) }} disabled={busy !== ''} style={{ marginTop: 10, border: 0, borderRadius: 9, padding: '8px 16px', fontWeight: 800, fontSize: 13, background: '#16a34a', color: '#fff' }}>{busy === i.tipo + 's' ? 'Salvando…' : '✓ Salvar'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aviso de venda: so para o admin */}
      {itens && (
        <div className="pa-card pa-up" style={{ animationDelay: '0.35s', marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', opacity: vendaOn ? 1 : 0.8 }}>
          <div style={{ height: 5, background: vendaOn ? 'linear-gradient(90deg,#16a34a,#22c55e)' : 'var(--border2)' }} />
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#16a34a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💰</div>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>Aviso de venda <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)' }}>· só para você</span></div>
              <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>Na hora que cair uma venda ou renovação (Hubla e Cakto), chega no seu celular: “💰 Venda aprovada! Plano Pro · R$ 39,90 · nome”.</div>
              {msg.venda && <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: msg.venda.ok ? 'var(--green)' : 'var(--red)' }}>{msg.venda.t}</div>}
            </div>
            <button className="pa-btn" onClick={testarVenda} disabled={busy !== ''} style={botao}>{busy === 'vt' ? 'Enviando…' : '📲 Ver exemplo'}</button>
            <button className={'pa-sw' + (vendaOn ? ' on' : '')} title={vendaOn ? 'Desligar' : 'Ligar'} disabled={busy !== ''} onClick={function() { ligarVenda(!vendaOn) }} style={{ background: vendaOn ? '#22c55e' : 'var(--border2)' }} />
          </div>
        </div>
      )}
    </div>
  )
}
