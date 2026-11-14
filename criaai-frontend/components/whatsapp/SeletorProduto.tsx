'use client'
// Lista para escolher o produto do fluxo (cadastrados na aba "Produtos"). Vazio = qualquer produto.
// Se o fluxo ja tinha um texto que nao esta cadastrado, ele continua aparecendo para nao se perder.
import { useEffect, useState } from 'react'

let cache: string[] | null = null

export default function SeletorProduto({ valor, onChange, onIrProdutos }: { valor: string; onChange: (v: string) => void; onIrProdutos?: () => void }) {
  const [nomes, setNomes] = useState<string[]>(cache || [])
  const [carregando, setCarregando] = useState(!cache)

  useEffect(function() {
    let vivo = true
    fetch('/api/whatsapp/produtos', { cache: 'no-store' })
      .then(function(r) { return r.ok ? r.json() : null })
      .then(function(j) { if (vivo && j) { cache = (j.produtos || []).map(function(p: any) { return String(p.nome) }); setNomes(cache!) } })
      .catch(function() {})
      .finally(function() { if (vivo) setCarregando(false) })
    return function() { vivo = false }
  }, [])

  const atual = String(valor || '').trim()
  const foraDaLista = atual && !nomes.some(function(n) { return n.toLowerCase() === atual.toLowerCase() })

  return (
    <div>
      <select className="at-input" value={atual} onChange={function(e) { onChange(e.target.value) }}>
        <option value="">Qualquer produto</option>
        {nomes.map(function(n) { return <option key={n} value={n}>{n}</option> })}
        {foraDaLista && <option value={atual}>{atual} (não cadastrado)</option>}
      </select>
      <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 5, lineHeight: 1.45 }}>
        {carregando ? 'Carregando produtos…' : nomes.length === 0 ? 'Nenhum produto cadastrado ainda. ' : 'O fluxo só dispara quando o nome do produto da compra tiver esse nome. '}
        {!carregando && (onIrProdutos
          ? <button type="button" onClick={onIrProdutos} style={{ border: 0, background: 'none', padding: 0, color: '#15803d', fontWeight: 700, cursor: 'pointer', font: 'inherit' }}>Cadastrar produtos</button>
          : <span>Cadastre na aba <b>Produtos</b>.</span>)}
      </div>
    </div>
  )
}
