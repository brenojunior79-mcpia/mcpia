'use client'
import { useEffect, useRef, useState } from 'react'
import { input, label, dica, botao, botaoClaro, erro } from './ui'

export type Roteiro = { gancho: string; corpo: string; mecanismo: string; cta: string }
export const ROTEIRO_VAZIO: Roteiro = { gancho: '', corpo: '', mecanismo: '', cta: '' }

const BLOCOS: { k: keyof Roteiro; nome: string; ajuda: string }[] = [
  { k: 'gancho', nome: 'Gancho', ajuda: 'Prende a atenção nos primeiros segundos' },
  { k: 'corpo', nome: 'Corpo', ajuda: 'Desenvolve o problema e leva até a solução' },
  { k: 'mecanismo', nome: 'Mecanismo', ajuda: 'Explica como o produto resolve e por que é diferente' },
  { k: 'cta', nome: 'CTA', ajuda: 'Chamada final para a ação' },
]

export function roteiroEmTexto(r: Roteiro) {
  return [r.gancho, r.corpo, r.mecanismo, r.cta].map(function(t) { return t.trim() }).filter(Boolean).join('\n\n')
}

type Form = { produto: string; oQueFaz: string; publico: string; dor: string }
const FORM0: Form = { produto: '', oQueFaz: '', publico: '', dor: '' }

type Salvo = { id: string; produto: string; o_que_faz: string; publico: string; dor: string; gancho: string; corpo: string; mecanismo: string; cta: string; created_at: string }

const dataBR = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function CardRoteiro({ roteiro, setRoteiro, roteiroId, setRoteiroId, onUsar, onUsarTexto }: { roteiro: Roteiro; setRoteiro: (r: Roteiro) => void; roteiroId: string | null; setRoteiroId: (id: string | null) => void; onUsar: () => void; onUsarTexto: (t: string) => void }) {
  const [f, setF] = useState<Form>(FORM0)
  const [carregando, setCarregando] = useState<string>('') // '' | 'tudo' | bloco
  const [msg, setMsg] = useState('')
  const [copiado, setCopiado] = useState(false)
  const tem = !!roteiroEmTexto(roteiro)
  const [salvos, setSalvos] = useState<Salvo[] | null>(null)
  const [verTodos, setVerTodos] = useState(false)
  const [copiadoId, setCopiadoId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const timer = useRef<any>(null)

  async function carregarSalvos() {
    try {
      const r = await fetch('/api/criativo/roteiros', { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (r.ok) setSalvos(j.roteiros || [])
    } catch (e) {}
  }
  useEffect(function() { carregarSalvos() }, []) // eslint-disable-line

  // Guarda as edicoes do roteiro aberto (espera a pessoa parar de digitar)
  function agendarSalvar(novo: Roteiro, id: string | null) {
    if (!id) return
    if (timer.current) clearTimeout(timer.current)
    setSalvando(true)
    timer.current = setTimeout(async function() {
      try {
        await fetch('/api/criativo/roteiros', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...novo }) })
        setSalvos(function(l) { return l ? l.map(function(x) { return x.id === id ? { ...x, ...novo } : x }) : l })
      } catch (e) {} finally { setSalvando(false) }
    }, 1200)
  }

  function abrir(x: Salvo) {
    setF({ produto: x.produto, oQueFaz: x.o_que_faz, publico: x.publico, dor: x.dor })
    setRoteiro({ gancho: x.gancho, corpo: x.corpo, mecanismo: x.mecanismo, cta: x.cta })
    setRoteiroId(x.id)
    setMsg('')
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (e) {}
  }

  async function excluir(x: Salvo) {
    if (!window.confirm('Excluir o roteiro de "' + (x.produto || 'sem nome') + '"?')) return
    try {
      const r = await fetch('/api/criativo/roteiros?id=' + encodeURIComponent(x.id), { method: 'DELETE' })
      if (r.ok) { setSalvos(function(l) { return l ? l.filter(function(y) { return y.id !== x.id }) : l }); if (roteiroId === x.id) setRoteiroId(null) }
    } catch (e) {}
  }

  async function copiarSalvo(x: Salvo) {
    try { await navigator.clipboard.writeText(roteiroEmTexto({ gancho: x.gancho, corpo: x.corpo, mecanismo: x.mecanismo, cta: x.cta })); setCopiadoId(x.id); setTimeout(function() { setCopiadoId('') }, 1800) } catch (e) {}
  }

  function campo(k: keyof Form) {
    return { value: f[k], onChange: function(e: any) { const v = e.target.value; setF(function(o) { return { ...o, [k]: v } }) } }
  }

  async function gerar(bloco?: keyof Roteiro) {
    setMsg('')
    if (!f.produto.trim() || !f.oQueFaz.trim() || !f.publico.trim() || !f.dor.trim()) { setMsg('Responda as 4 perguntas para gerar o roteiro.'); return }
    setCarregando(bloco || 'tudo')
    try {
      const r = await fetch('/api/criativo/roteiro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, bloco, atual: roteiro }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) { setMsg(j.error || 'Não foi possível gerar agora.'); return }
      if (bloco) {
        const novo = { ...roteiro, [bloco]: j[bloco] }
        setRoteiro(novo)
        agendarSalvar(novo, roteiroId)
      } else {
        const novo = { gancho: j.gancho, corpo: j.corpo, mecanismo: j.mecanismo, cta: j.cta }
        setRoteiro(novo)
        setRoteiroId(j.id || null)
        if (j.id) {
          const linha: Salvo = { id: j.id, produto: f.produto, o_que_faz: f.oQueFaz, publico: f.publico, dor: f.dor, ...novo, created_at: new Date().toISOString() }
          setSalvos(function(l) { return [linha].concat(l || []) })
        }
      }
    } catch (e) { setMsg('Sem conexão. Tente de novo.') } finally { setCarregando('') }
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(roteiroEmTexto(roteiro)); setCopiado(true); setTimeout(function() { setCopiado(false) }, 1800) } catch (e) {}
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 14 }}>Responda as 4 perguntas e a IA escreve o roteiro do seu criativo em 4 partes: gancho, corpo, mecanismo e CTA.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><label style={label}>Qual é o seu produto?</label><input style={input} {...campo('produto')} placeholder="Ex: Curso Emagrecer em Casa" /></div>
        <div><label style={label}>O que o seu produto faz?</label><textarea style={{ ...input, resize: 'vertical' }} rows={3} {...campo('oQueFaz')} placeholder="Explique com suas palavras o que ele entrega e como a pessoa usa." /></div>
        <div><label style={label}>Para quem é esse produto?</label><input style={input} {...campo('publico')} placeholder="Ex: mulheres de 30 a 50 anos que querem emagrecer" /></div>
        <div><label style={label}>Qual a maior dor que o seu produto resolve?</label><textarea style={{ ...input, resize: 'vertical' }} rows={2} {...campo('dor')} placeholder="Ex: já tentou várias dietas e sempre desiste" /></div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={function() { gerar() }} disabled={!!carregando} style={{ ...botao, opacity: carregando ? 0.6 : 1 }}>{carregando === 'tudo' ? 'Escrevendo...' : (tem ? '✨ Gerar outro roteiro' : '✨ Gerar roteiro')}</button>
      </div>
      {msg && <div style={erro}>{msg}</div>}

      {tem && (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BLOCOS.map(function(b) {
            return (
              <div key={b.k} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15 }}>{b.nome}</span>
                  <span style={{ ...dica, flex: 1, minWidth: 120 }}>{b.ajuda}</span>
                  <button onClick={function() { gerar(b.k) }} disabled={!!carregando} style={{ ...botaoClaro, padding: '5px 10px', fontSize: 12 }}>{carregando === b.k ? '...' : '🔄 Outra versão'}</button>
                </div>
                <textarea style={{ ...input, resize: 'vertical', background: 'var(--surface)' }} rows={b.k === 'corpo' ? 5 : 3} value={roteiro[b.k]} onChange={function(e) { const novo = { ...roteiro, [b.k]: e.target.value }; setRoteiro(novo); agendarSalvar(novo, roteiroId) }} />
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onUsar} style={botao}>🎙️ Usar na narração →</button>
            <button onClick={copiar} style={botaoClaro}>{copiado ? '✓ Copiado' : 'Copiar roteiro'}</button>
            {roteiroId && <span style={{ ...dica, alignSelf: 'center' }}>{salvando ? 'Salvando...' : '✓ Salvo no seu histórico'}</span>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>📚 Seus roteiros salvos</div>
        <div style={{ ...dica, marginBottom: 12 }}>Todo roteiro que você gera fica guardado aqui. Abra para continuar editando.</div>
        {salvos === null ? <div style={dica}>Carregando...</div> : !salvos.length ? <div style={dica}>Você ainda não gerou nenhum roteiro.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(verTodos ? salvos : salvos.slice(0, 3)).map(function(x) {
              const atual = roteiroId === x.id
              return (
                <div key={x.id} style={{ background: 'var(--surface2)', border: atual ? '2px solid #7c5cfc' : '1px solid var(--border)', borderRadius: 14, padding: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 14.5 }}>{x.produto || 'Sem nome'}</span>
                    <span style={dica}>{dataBR(x.created_at)}</span>
                    {atual && <span style={{ fontSize: 11.5, fontWeight: 800, color: '#7c5cfc' }}>aberto agora</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted2)', margin: '6px 0 10px', lineHeight: 1.5 }}>{(x.gancho || '').slice(0, 160)}{(x.gancho || '').length > 160 ? '…' : ''}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={function() { abrir(x) }} style={{ ...botaoClaro, padding: '5px 12px', fontSize: 12.5 }}>✏️ Abrir</button>
                    <button onClick={function() { onUsarTexto(roteiroEmTexto({ gancho: x.gancho, corpo: x.corpo, mecanismo: x.mecanismo, cta: x.cta })) }} style={{ ...botaoClaro, padding: '5px 12px', fontSize: 12.5 }}>🎙️ Usar na narração</button>
                    <button onClick={function() { copiarSalvo(x) }} style={{ ...botaoClaro, padding: '5px 12px', fontSize: 12.5 }}>{copiadoId === x.id ? '✓ Copiado' : 'Copiar'}</button>
                    <button onClick={function() { excluir(x) }} style={{ ...botaoClaro, padding: '5px 12px', fontSize: 12.5, color: '#b91c1c' }}>🗑 Excluir</button>
                  </div>
                </div>
              )
            })}
            {salvos.length > 3 && <div style={{ textAlign: 'center' }}><button onClick={function() { setVerTodos(!verTodos) }} style={{ ...botaoClaro, padding: '8px 18px', fontSize: 13 }}>{verTodos ? 'Ver menos' : 'Ver mais (' + (salvos.length - 3) + ')'}</button></div>}
          </div>
        )}
      </div>
    </div>
  )
}
