'use client'
import { useState } from 'react'
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

export default function CardRoteiro({ roteiro, setRoteiro, onUsar }: { roteiro: Roteiro; setRoteiro: (r: Roteiro) => void; onUsar: () => void }) {
  const [f, setF] = useState<Form>(FORM0)
  const [carregando, setCarregando] = useState<string>('') // '' | 'tudo' | bloco
  const [msg, setMsg] = useState('')
  const [copiado, setCopiado] = useState(false)
  const tem = !!roteiroEmTexto(roteiro)

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
      setRoteiro(bloco ? { ...roteiro, [bloco]: j[bloco] } : { gancho: j.gancho, corpo: j.corpo, mecanismo: j.mecanismo, cta: j.cta })
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
                <textarea style={{ ...input, resize: 'vertical', background: 'var(--surface)' }} rows={b.k === 'corpo' ? 5 : 3} value={roteiro[b.k]} onChange={function(e) { setRoteiro({ ...roteiro, [b.k]: e.target.value }) }} />
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onUsar} style={botao}>🎙️ Usar na narração →</button>
            <button onClick={copiar} style={botaoClaro}>{copiado ? '✓ Copiado' : 'Copiar roteiro'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
