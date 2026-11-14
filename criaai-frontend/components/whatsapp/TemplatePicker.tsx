'use client'
import { useState } from 'react'
import { renderTpl, type Tpl } from './Modelos'

export type TplSend = { name: string; language: string; params: string[]; preview: string }

// Escolhe um modelo aprovado, preenche as variaveis e envia
export default function TemplatePicker({ tpls, enviando, onSend }: { tpls: Tpl[] | null; enviando: boolean; onSend: (t: TplSend) => void }) {
  const aprovados = (tpls || []).filter(function(t) { return t.status === 'APPROVED' })
  const [key, setKey] = useState('')
  const [params, setParams] = useState<string[]>([])
  // fallback manual (quando nao deu para listar os modelos)
  const [nome, setNome] = useState('')
  const [lang, setLang] = useState('pt_BR')
  const [vars, setVars] = useState('')

  if (!tpls || aprovados.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--muted2)', lineHeight: 1.45, marginBottom: 8 }}><i className="ti ti-info-circle" style={{ fontSize: 15, marginTop: 1 }} /><span>
          {tpls ? 'Nenhum modelo aprovado ainda. Crie um na aba Modelos, ou digite o nome de um que já existe.' : 'Não foi possível listar os modelos. Digite o nome do modelo aprovado.'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="at-input" placeholder="Nome do modelo" value={nome} onChange={function(e) { setNome(e.target.value) }} style={{ flex: '1 1 150px', width: 'auto', minWidth: 0 }} />
          <input className="at-input" placeholder="Idioma" value={lang} onChange={function(e) { setLang(e.target.value) }} style={{ flex: '0 0 90px', width: 'auto' }} />
          <input className="at-input" placeholder="Variáveis separadas por | (se tiver)" value={vars} onChange={function(e) { setVars(e.target.value) }} style={{ flex: '2 1 200px', width: 'auto', minWidth: 0 }} />
          <button disabled={enviando || !nome.trim()} onClick={function() { onSend({ name: nome.trim(), language: lang.trim() || 'pt_BR', params: vars.split('|').map(function(x) { return x.trim() }).filter(Boolean), preview: '' }) }} className="at-b at-b-ok"><i className={'ti ' + (enviando ? 'ti-loader' : 'ti-send')} />{enviando ? 'Enviando…' : 'Enviar modelo'}</button>
        </div>
      </div>
    )
  }

  const t = aprovados.find(function(x) { return x.name + '|' + x.language === key }) || null
  const preenchido = !!t && Array.from({ length: t.vars }).every(function(_x, i) { return (params[i] || '').trim().length > 0 })

  function escolher(k: string) {
    setKey(k); setParams([])
  }

  return (
    <div>
      <select className="at-input" aria-label="Modelo aprovado" value={key} onChange={function(e) { escolher(e.target.value) }}>
        <option value="">Escolha um modelo aprovado…</option>
        {aprovados.map(function(x) { return <option key={x.name + x.language} value={x.name + '|' + x.language}>{x.name} ({x.language})</option> })}
      </select>
      {t && (
        <div style={{ marginTop: 8 }}>
          {t.vars > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {Array.from({ length: t.vars }).map(function(_x, i) {
                return <input key={i} className="at-input" placeholder={'Valor de {{' + (i + 1) + '}}' + (i === 0 ? ' (ex: nome)' : '')} value={params[i] || ''} onChange={function(e) { const c = params.slice(); c[i] = e.target.value; setParams(c) }} style={{ flex: '1 1 150px', width: 'auto', minWidth: 0 }} />
              })}
            </div>
          )}
          <div style={{ background: '#d9fdd3', color: '#111b21', borderRadius: 12, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflowY: 'auto' }}>
            {t.header && <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.header}</div>}
            {renderTpl(t.body, params)}
            {t.footer && <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 6 }}>{t.footer}</div>}
          </div>
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button disabled={enviando || !preenchido} onClick={function() { onSend({ name: t.name, language: t.language, params: params.slice(0, t.vars).map(function(x) { return x.trim() }), preview: renderTpl(t.body, params) }) }} className="at-b at-b-ok"><i className={'ti ' + (enviando ? 'ti-loader' : 'ti-send')} />{enviando ? 'Enviando…' : 'Enviar modelo'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
