'use client'
// Biblioteca de produtos da Estrutura Express 2.0 (ordem do Breno): fica embaixo das aulas.
// Cada produto mostra a capa, o nicho e os materiais (produto, pagina de vendas, criativos) com o link do Drive.
// A lista vem de lib/expressProdutos.json (montada a partir da pasta do Drive com todos os produtos).
import { useMemo, useState } from 'react'
import produtos from '@/lib/expressProdutos.json'

type Item = { titulo: string; link: string; arquivos: number; tipo: string }
type Produto = { slug: string; nome: string; pasta: string; capa: string; nicho: string; itens: Item[]; totalArquivos: number; temVideo: boolean }

const ICONE: Record<string, string> = { produto: '📦', pagina: '🌐', criativos: '🎬', outro: '📁' }

export default function BibliotecaExpress() {
  const lista = produtos as Produto[]
  const [busca, setBusca] = useState('')
  const [nicho, setNicho] = useState('Todos')
  const [aberto, setAberto] = useState<Produto | null>(null)
  const nichos = useMemo(function() { return ['Todos'].concat(Array.from(new Set(lista.map(function(p) { return p.nicho }).filter(Boolean)))) }, [lista])
  const filtrados = lista.filter(function(p) {
    const b = busca.trim().toLowerCase()
    return (nicho === 'Todos' || p.nicho === nicho) && (!b || p.nome.toLowerCase().indexOf(b) >= 0 || p.nicho.toLowerCase().indexOf(b) >= 0)
  })

  return (
    <section className="bx">
      <div className="bx-topo">
        <div>
          <h2 className="bx-titulo">Biblioteca de produtos</h2>
          <p className="bx-sub">Todos os produtos prontos da Estrutura Express 2.0. Escolha um e abra os materiais.</p>
        </div>
        <span className="bx-conta">{lista.length} produtos</span>
      </div>
      <div className="bx-filtros">
        <div className="bx-busca"><i className="ti ti-search" /><input value={busca} onChange={function(e) { setBusca(e.target.value) }} placeholder="Buscar produto ou nicho..." /></div>
        <div className="bx-chips">
          {nichos.map(function(n) { return <button key={n} type="button" className={'bx-chip' + (n === nicho ? ' on' : '')} onClick={function() { setNicho(n) }}>{n}</button> })}
        </div>
      </div>
      <div className="bx-grade">
        {filtrados.map(function(p) {
          return (
            <button key={p.slug} type="button" className="bx-card" onClick={function() { setAberto(p) }}>
              <div className="bx-capa">
                {p.capa ? <img src={p.capa} alt={p.nome} loading="lazy" /> : <div className="bx-semcapa">📦</div>}
                <span className="bx-selo">Pronto</span>
              </div>
              <div className="bx-info">
                <div className="bx-nome">{p.nome}</div>
                <div className="bx-nicho">{p.nicho}</div>
                <div className="bx-meta">
                  {p.itens.slice(0, 3).map(function(it) { return <span key={it.titulo}>{ICONE[it.tipo] || '📁'} {it.titulo}</span> })}
                </div>
              </div>
            </button>
          )
        })}
        {filtrados.length === 0 && <div className="bx-vazio">Nenhum produto encontrado.</div>}
      </div>

      {aberto && (
        <div className="bx-fundo" onClick={function() { setAberto(null) }}>
          <div className="bx-modal" role="dialog" aria-modal="true" onClick={function(e) { e.stopPropagation() }}>
            <button type="button" className="bx-fechar" onClick={function() { setAberto(null) }} aria-label="Fechar"><i className="ti ti-x" /></button>
            {aberto.capa ? <img className="bx-mcapa" src={aberto.capa} alt={aberto.nome} /> : null}
            <div className="bx-mcorpo">
              <div className="bx-nicho">{aberto.nicho}</div>
              <h3 className="bx-mnome">{aberto.nome}</h3>
              <p className="bx-sub">Abra cada material no Drive e baixe o que precisar.</p>
              <div className="bx-mitens">
                {aberto.itens.map(function(it) {
                  return (
                    <a key={it.link} className="bx-mitem" href={it.link} target="_blank" rel="noopener noreferrer">
                      <span className="bx-micone">{ICONE[it.tipo] || '📁'}</span>
                      <span className="bx-mtxt"><b>{it.titulo}</b><small>{it.arquivos > 0 ? it.arquivos + ' arquivo' + (it.arquivos === 1 ? '' : 's') : 'Abrir no Drive'}</small></span>
                      <i className="ti ti-external-link" />
                    </a>
                  )
                })}
              </div>
              <a className="bx-tudo" href={aberto.pasta} target="_blank" rel="noopener noreferrer">Abrir a pasta completa do produto</a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bx { margin-top: 28px; background: radial-gradient(120% 60% at 0% 0%, rgba(249,115,22,.45), transparent 60%), radial-gradient(120% 60% at 100% 100%, rgba(234,88,12,.35), transparent 60%), linear-gradient(160deg,#050505 0%,#1f0e03 45%,#3b1906 70%,#050505 100%); background-size: 100% 100%, 100% 100%, 220% 220%; animation: bxFundo 12s ease-in-out infinite alternate; border: 1px solid rgba(249,115,22,.25); border-radius: 24px; padding: 24px; color: #fff; }
        .bx-topo { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .bx-titulo { color: #fff; font-family: Syne, sans-serif; font-size: 24px; font-weight: 800; margin: 0 0 4px; }
        .bx-sub { margin: 0; font-size: 13.5px; color: rgba(255,255,255,.62); line-height: 1.5; }
        .bx-conta { font-size: 12.5px; font-weight: 700; color: #fdba74; background: rgba(249,115,22,.15); border: 1px solid rgba(249,115,22,.4); padding: 6px 12px; border-radius: 99px; }
        .bx-filtros { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
        .bx-busca { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 0 12px; }
        .bx-busca i { color: rgba(255,255,255,.5); }
        .bx-busca input { flex: 1; background: transparent; border: 0; outline: 0; color: #fff; font-size: 14.5px; padding: 11px 0; font-family: inherit; }
        .bx-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .bx-chip { border: 1px solid rgba(255,255,255,.14); background: transparent; color: rgba(255,255,255,.8); border-radius: 99px; padding: 6px 13px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .bx-chip.on { background: linear-gradient(135deg,#f59e0b,#f97316); border-color: #f97316; color: #fff; }
        .bx-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; }
        .bx-card { text-align: left; background: rgba(10,6,3,.78); border: 1px solid rgba(249,115,22,.18); border-radius: 16px; overflow: hidden; padding: 0; cursor: pointer; color: #fff; font-family: inherit; transition: transform .15s, border-color .15s; }
        .bx-card:hover { transform: translateY(-3px); border-color: rgba(249,115,22,.7); }
        .bx-capa { position: relative; aspect-ratio: 1 / 1; background: #1d1209; }
        @keyframes bxFundo { 0% { background-position: 0 0, 0 0, 0% 50% } 100% { background-position: 0 0, 0 0, 100% 50% } }
        @media (prefers-reduced-motion: reduce) { .bx { animation: none !important } }
        .bx-capa img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bx-semcapa { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; }
        .bx-selo { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,.7); color: #86efac; font-size: 11.5px; font-weight: 800; padding: 4px 9px; border-radius: 8px; }
        .bx-info { padding: 12px 14px 14px; }
        .bx-nome { font-weight: 800; font-size: 15.5px; line-height: 1.3; margin-bottom: 3px; }
        .bx-nicho { font-size: 12.5px; color: #fdba74; font-weight: 700; margin-bottom: 8px; }
        .bx-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 11.5px; color: rgba(255,255,255,.6); }
        .bx-meta span { background: rgba(255,255,255,.06); border-radius: 6px; padding: 3px 7px; }
        .bx-vazio { color: rgba(255,255,255,.6); padding: 20px 0; }
        .bx-fundo { position: fixed; inset: 0; z-index: 1000; background: rgba(6,3,14,.75); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .bx-modal { position: relative; width: 100%; max-width: 460px; max-height: 92vh; overflow-y: auto; background: linear-gradient(170deg,#140a04,#0a0604); border: 1px solid rgba(249,115,22,.3); border-radius: 20px; color: #fff; }
        .bx-fechar { position: absolute; top: 10px; right: 10px; z-index: 2; width: 34px; height: 34px; border-radius: 50%; border: 0; background: rgba(0,0,0,.55); color: #fff; cursor: pointer; font-size: 17px; }
        .bx-mcapa { width: 100%; max-height: 280px; object-fit: cover; display: block; }
        .bx-mcorpo { padding: 18px 20px 20px; }
        .bx-mnome { font-family: Syne, sans-serif; font-size: 22px; font-weight: 800; margin: 0 0 4px; }
        .bx-mitens { display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
        .bx-mitem { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 12px 14px; color: #fff; text-decoration: none; }
        .bx-mitem:hover { border-color: rgba(249,115,22,.7); }
        .bx-micone { font-size: 22px; }
        .bx-mtxt { flex: 1; display: flex; flex-direction: column; }
        .bx-mtxt small { color: rgba(255,255,255,.55); font-size: 12px; }
        .bx-tudo { display: block; text-align: center; background: linear-gradient(135deg, #f59e0b, #ea580c); color: #fff; font-weight: 800; padding: 13px; border-radius: 12px; text-decoration: none; }
        @media (max-width: 520px) { .bx { padding: 18px 14px; } .bx-grade { grid-template-columns: repeat(2, 1fr); gap: 10px; } .bx-nome { font-size: 14px; } .bx-meta { display: none; } }
      `}</style>
    </section>
  )
}
