'use client'
import { useEffect, useState } from 'react'
import { EVENTOS, VARIAVEIS, type FluxoAuto, type Passo } from '@/lib/waAutoTipos'

export type ConexaoLeve = { id: string; name: string; display_phone: string | null; active: boolean }
type Modelo = { name: string; language: string; status: string; body: string; vars: number }

const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4, display: 'block' }
const box: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 14 }
const btnPeq: React.CSSProperties = { cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '4px 9px', fontWeight: 700, fontSize: 12.5 }

export const VAZIO_EVENTO: FluxoAuto = {
  name: '', connection_id: null, trigger_event: 'lead.abandoned_checkout', trigger_filter: {}, steps: [], cancel_on_purchase: true, enabled: false,
}

// "25 min", "2 h", "1 dia"
export function textoEspera(min: number): string {
  if (min % 1440 === 0) return min / 1440 + (min / 1440 === 1 ? ' dia' : ' dias')
  if (min % 60 === 0) return min / 60 + ' h'
  return min + ' min'
}

function unidadeDe(min: number): { n: number; u: number } {
  if (min % 1440 === 0) return { n: min / 1440, u: 1440 }
  if (min % 60 === 0) return { n: min / 60, u: 60 }
  return { n: min, u: 1 }
}

function Espera({ p, onChange }: { p: Extract<Passo, { tipo: 'esperar' }>; onChange: (p: Passo) => void }) {
  const [n, setN] = useState(String(unidadeDe(p.minutos).n))
  const [u, setU] = useState(unidadeDe(p.minutos).u)
  function aplica(nn: string, uu: number) {
    setN(nn); setU(uu)
    const v = Math.round(Number(nn))
    onChange({ tipo: 'esperar', minutos: v > 0 ? v * uu : 0 })
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>⏱ Esperar</span>
      <input className="at-input" type="number" min={1} value={n} onChange={function(e) { aplica(e.target.value, u) }} style={{ width: 90 }} />
      <select className="at-input" value={u} onChange={function(e) { aplica(n, Number(e.target.value)) }} style={{ width: 'auto' }}>
        <option value={1}>minutos</option>
        <option value={60}>horas</option>
        <option value={1440}>dias</option>
      </select>
    </div>
  )
}

function Envio({ p, modelos, carregando, onChange }: { p: Extract<Passo, { tipo: 'modelo' }>; modelos: Modelo[]; carregando: boolean; onChange: (p: Passo) => void }) {
  const m = modelos.find(function(x) { return x.name === p.template && x.language === p.language })
  function escolher(valor: string) {
    const [nome, lang] = valor.split('|')
    const t = modelos.find(function(x) { return x.name === nome && x.language === lang })
    const params: { mode: 'nome' | 'produto' | 'link' | 'texto'; value: string }[] = []
    for (let i = 0; i < (t ? t.vars : 0); i++) params.push({ mode: i === 0 ? 'nome' : 'texto', value: '' })
    onChange({ tipo: 'modelo', template: nome || '', language: lang || 'pt_BR', params })
  }
  function param(i: number, mode: any, value: string) {
    onChange({ ...p, params: p.params.map(function(x, j) { return j === i ? { mode, value } : x }) })
  }
  let prev = m ? m.body : ''
  if (m) {
    const ex: Record<string, string> = { nome: 'Maria', produto: 'Seu produto', link: 'https://…' }
    p.params.forEach(function(x, i) { prev = prev.split('{{' + (i + 1) + '}}').join(x.mode === 'texto' ? (x.value || '…') : ex[x.mode]) })
  }
  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>💬 Enviar modelo de mensagem</div>
      <select className="at-input" value={p.template ? p.template + '|' + p.language : ''} onChange={function(e) { escolher(e.target.value) }}>
        <option value="">{carregando ? 'Carregando modelos…' : modelos.length === 0 ? 'Nenhum modelo aprovado neste número' : 'Escolha o modelo…'}</option>
        {modelos.map(function(x) { return <option key={x.name + x.language} value={x.name + '|' + x.language}>{x.name} ({x.language})</option> })}
        {p.template && !m && !carregando && <option value={p.template + '|' + p.language}>{p.template} (não encontrado)</option>}
      </select>
      {m && p.params.map(function(x, i) {
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{'{{' + (i + 1) + '}}'} =</span>
            <select className="at-input" value={x.mode} onChange={function(e) { param(i, e.target.value, x.value) }} style={{ width: 'auto' }}>
              {VARIAVEIS.map(function(v) { return <option key={v.k} value={v.k}>{v.nome}</option> })}
            </select>
            {x.mode === 'texto' && <input className="at-input" value={x.value} placeholder="Texto" onChange={function(e) { param(i, 'texto', e.target.value) }} style={{ flex: '1 1 160px' }} />}
          </div>
        )
      })}
      {m && (
        <div style={{ background: '#d9fdd3', color: '#111b21', borderRadius: 10, padding: '8px 10px', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 2 }}>Prévia</div>
          {prev}
        </div>
      )}
    </div>
  )
}

// Editor de um fluxo disparado por evento da Hubla
export default function EditorEvento({ inicial, conexoes, onVoltar }: { inicial: FluxoAuto; conexoes: ConexaoLeve[]; onVoltar: (recarregar: boolean) => void }) {
  const [f, setF] = useState<FluxoAuto>(inicial)
  const [id, setId] = useState<string | undefined>(inicial.id)
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const [tNum, setTNum] = useState('')
  const [tNome, setTNome] = useState('')
  const [tPular, setTPular] = useState(true)
  const [testando, setTestando] = useState(false)
  const novo = !id
  const ev = EVENTOS.find(function(x) { return x.k === f.trigger_event })

  useEffect(function() {
    if (!f.connection_id) { setModelos([]); return }
    setCarregando(true)
    fetch('/api/whatsapp/templates?connection=' + f.connection_id, { cache: 'no-store' })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) })
      .then(function(x) {
        if (x.ok) setModelos((x.j.templates || []).filter(function(t: Modelo) { return t.status === 'APPROVED' }))
        else { setModelos([]); setMsg(x.j.error || 'Não consegui carregar os modelos deste número.') }
      }).catch(function() { setModelos([]) }).finally(function() { setCarregando(false) })
  }, [f.connection_id])

  function setPasso(i: number, p: Passo) { setF(function(c) { return { ...c, steps: c.steps.map(function(s, j) { return j === i ? p : s }) } }) }
  function mover(i: number, d: number) {
    setF(function(c) {
      const s = c.steps.slice(); const j = i + d
      if (j < 0 || j >= s.length) return c
      const t = s[i]; s[i] = s[j]; s[j] = t
      return { ...c, steps: s }
    })
  }
  function tirar(i: number) { setF(function(c) { return { ...c, steps: c.steps.filter(function(_, j) { return j !== i }) } }) }

  async function salvar(): Promise<boolean> {
    setSalvando(true); setMsg(''); setOk('')
    let feito = false
    try {
      const r = await fetch('/api/whatsapp/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'salvar', ...f, id }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setMsg(j.error || 'Não foi possível salvar.')
      else { setId(j.id || id); setOk('Fluxo salvo.'); feito = true }
    } catch (e) { setMsg('Sem conexão. Tente de novo.') }
    setSalvando(false)
    return feito
  }
  async function apagar() {
    if (!window.confirm('Apagar o fluxo "' + (f.name || 'sem nome') + '"? Quem estava esperando nele deixa de receber.')) return
    setSalvando(true)
    try { await fetch('/api/whatsapp/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'apagar', id }) }) } catch (e) {}
    onVoltar(true)
  }
  async function testar() {
    setMsg(''); setOk('')
    if (!(await salvar())) return
    setTestando(true)
    try {
      const cur = id
      const r = await fetch('/api/whatsapp/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'teste', id: cur, numero: tNum, nome: tNome, pularEsperas: tPular }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setMsg(j.error || 'Não foi possível criar o teste.')
      else setOk('Teste agendado. A mensagem chega em até 1 minuto' + (tPular ? '.' : ', respeitando as esperas.'))
    } catch (e) { setMsg('Sem conexão. Tente de novo.') }
    setTestando(false)
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button onClick={function() { onVoltar(false) }} style={{ cursor: 'pointer', border: 0, background: 'transparent', color: 'var(--accent)', fontWeight: 800, fontSize: 13.5, padding: 0, marginBottom: 10 }}>← Voltar para fluxos</button>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 12 }}>{novo ? '➕ Novo fluxo por evento' : '✏️ Editar fluxo por evento'}</div>

        <div style={box}>
          <label style={lab}>Nome do fluxo</label>
          <input className="at-input" placeholder="Ex: Pix gerado — lembrete" maxLength={80} value={f.name} onChange={function(e) { setF({ ...f, name: e.target.value }) }} />
          <label style={{ ...lab, marginTop: 12 }}>Enviar pelo número</label>
          <select className="at-input" value={f.connection_id || ''} onChange={function(e) { setF({ ...f, connection_id: e.target.value || null, steps: f.steps.map(function(s) { return s.tipo === 'modelo' ? { ...s, template: '', params: [] } : s }) }) }}>
            <option value="">Escolha o número…</option>
            {conexoes.map(function(c) { return <option key={c.id} value={c.id}>{c.name}{c.display_phone ? ' · ' + c.display_phone : ''}</option> })}
          </select>
          {conexoes.length === 0 && <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 6 }}>Nenhum número cadastrado ainda. Vá em <b>Conexões → Adicionar conexão</b> e cadastre o número de Recuperação.</div>}
        </div>

        <div style={box}>
          <label style={lab}>Evento da Hubla que inicia o fluxo</label>
          <select className="at-input" value={f.trigger_event} onChange={function(e) { setF({ ...f, trigger_event: e.target.value, trigger_filter: {} }) }}>
            {EVENTOS.map(function(x) { return <option key={x.k} value={x.k}>{x.nome}</option> })}
          </select>
          {ev && <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 6 }}>{ev.desc}</div>}
          {ev && ev.filtroMetodo && (
            <div style={{ marginTop: 12 }}>
              <label style={lab}>Forma de pagamento</label>
              <select className="at-input" value={f.trigger_filter.metodo || ''} onChange={function(e) { setF({ ...f, trigger_filter: { ...f.trigger_filter, metodo: e.target.value as any } }) }}>
                <option value="">Qualquer forma</option>
                <option value="pix">Só Pix</option>
                <option value="boleto">Só boleto</option>
                <option value="cartao">Só cartão</option>
              </select>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>Se o filtro não pegar, veja o exemplo recebido na tela de fluxos (dá para ajustar).</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <label style={lab}>Só para o produto (opcional)</label>
            <input className="at-input" placeholder="Parte do nome do produto, ex: Starter" maxLength={80} value={f.trigger_filter.produto || ''} onChange={function(e) { setF({ ...f, trigger_filter: { ...f.trigger_filter, produto: e.target.value } }) }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: 'var(--text)', marginTop: 14 }}>
            <input type="checkbox" checked={f.cancel_on_purchase} onChange={function(e) { setF({ ...f, cancel_on_purchase: e.target.checked }) }} style={{ width: 18, height: 18 }} />
            Parar o fluxo se a pessoa comprar
          </label>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>Se a compra for aprovada enquanto o fluxo espera, as próximas mensagens não são enviadas.</div>
        </div>

        <div style={box}>
          <label style={lab}>Passos do fluxo</label>
          {f.steps.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 8 }}>Adicione esperas e envios na ordem em que devem acontecer.</div>}
          {f.steps.map(function(s, i) {
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 8, background: 'var(--surface2)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {s.tipo === 'esperar'
                      ? <Espera p={s} onChange={function(p) { setPasso(i, p) }} />
                      : <Envio p={s} modelos={modelos} carregando={carregando} onChange={function(p) { setPasso(i, p) }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button style={btnPeq} onClick={function() { mover(i, -1) }} title="Subir">↑</button>
                    <button style={btnPeq} onClick={function() { mover(i, 1) }} title="Descer">↓</button>
                    <button style={{ ...btnPeq, color: '#dc2626' }} onClick={function() { tirar(i) }} title="Remover">✕</button>
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={{ ...btnPeq, padding: '8px 12px' }} onClick={function() { setF({ ...f, steps: f.steps.concat([{ tipo: 'esperar', minutos: 25 }]) }) }}>+ Esperar</button>
            <button style={{ ...btnPeq, padding: '8px 12px' }} onClick={function() { setF({ ...f, steps: f.steps.concat([{ tipo: 'modelo', template: '', language: 'pt_BR', params: [] }]) }) }}>+ Enviar modelo</button>
          </div>
        </div>

        <div style={box}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
            <input type="checkbox" checked={f.enabled} onChange={function(e) { setF({ ...f, enabled: e.target.checked }) }} style={{ width: 18, height: 18 }} />
            Fluxo ligado
          </label>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6, lineHeight: 1.5 }}>
            Deixe desligado até testar. Fluxo desligado não envia nada para ninguém. Mensagens fora das 24 horas só saem por modelo aprovado e são cobradas pela Meta.
          </div>
        </div>

        {!novo && (
          <div style={box}>
            <label style={lab}>🧪 Testar no seu próprio número</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="at-input" placeholder="(DDD) número" value={tNum} onChange={function(e) { setTNum(e.target.value) }} style={{ flex: '1 1 160px' }} />
              <input className="at-input" placeholder="Nome (opcional)" value={tNome} onChange={function(e) { setTNome(e.target.value) }} style={{ flex: '1 1 140px' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)', marginTop: 8 }}>
              <input type="checkbox" checked={tPular} onChange={function(e) { setTPular(e.target.checked) }} style={{ width: 16, height: 16 }} />
              Pular as esperas (enviar na hora)
            </label>
            <button onClick={testar} disabled={testando || salvando || !tNum.trim()} style={{ cursor: 'pointer', border: 0, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: 13.5, marginTop: 10, opacity: testando || !tNum.trim() ? 0.6 : 1 }}>{testando ? 'Agendando…' : 'Salvar e enviar teste'}</button>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6 }}>O teste usa dados de exemplo (produto de teste). Não conta nos números do fluxo.</div>
          </div>
        )}

        {msg && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>{msg}</div>}
        {ok && <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700, marginBottom: 8 }}>{ok}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={function() { salvar() }} disabled={salvando} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '11px 20px', fontWeight: 800, fontSize: 14, opacity: salvando ? 0.6 : 1 }}>{salvando ? 'Salvando…' : 'Salvar fluxo'}</button>
          {!novo && <button onClick={apagar} disabled={salvando} style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 10, padding: '11px 16px', fontWeight: 700, fontSize: 14 }}>Apagar</button>}
        </div>
      </div>
    </div>
  )
}
