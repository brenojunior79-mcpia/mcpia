'use client'
// Card "Comissoes de hoje" do Painel do Aluno (ordem do Breno): o valor das vendas que o Facebook registrou hoje
// nos anuncios do aluno. Atualiza sozinho a cada 5 minutos.
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Resp = { status: 'ok' | 'conectar' | 'sem_acesso' | 'erro'; valor?: number; pendente?: number; ontem?: number; fonte?: string }

function reais(v: number) {
  return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ComissoesHoje() {
  const [d, setD] = useState<Resp | null>(null)

  useEffect(function() {
    let vivo = true
    function carregar() {
      fetch('/api/facebook/comissao-hoje', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { if (vivo) setD(j) }).catch(function() { if (vivo) setD({ status: 'erro' }) })
    }
    carregar()
    const t = setInterval(carregar, 5 * 60 * 1000)
    return function() { vivo = false; clearInterval(t) }
  }, [])

  const valor = d && d.status === 'ok' ? reais(d.valor || 0) : d && d.status === 'erro' ? '—' : d ? reais(0) : '...'

  return (
    <div className="ch-card">
      <div className="ch-brilho" />
      <div className="ch-rotulo">Comissões de hoje</div>
      <div className="ch-valor">{valor}</div>
      {d && d.status === 'conectar' && (
        <Link href="/dashboard/anuncios" className="ch-dica">Conecte o seu Facebook em "Gerenciando seus anúncios" para ver as suas vendas aqui →</Link>
      )}
      {d && d.status === 'ok' && (
        <div className="ch-linha">
          {d.fonte === 'hubla' && <span>⏳ {reais(d.pendente || 0)} em vendas pendentes</span>}
          <span>📅 Ontem: {reais(d.ontem || 0)}</span>
        </div>
      )}
      {d && d.status === 'erro' && <div className="ch-dica">Não foi possível ler as vendas agora. Tente mais tarde.</div>}
      <style>{`
        .ch-card { position: relative; overflow: hidden; border-radius: 22px; padding: 20px 22px; margin-bottom: 20px; color: #fff;
          background: linear-gradient(135deg, #3f33d6 0%, #5b4ef8 55%, #7c6ffc 100%); box-shadow: 0 14px 36px rgba(91,78,248,.32); animation: fadeUp .5s ease both; }
        .ch-brilho { position: absolute; top: -60px; right: -40px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(165,155,255,.45), transparent 70%); pointer-events: none; }
        .ch-rotulo { position: relative; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #dcd8ff; margin-bottom: 6px; }
        .ch-valor { position: relative; font-family: Syne, sans-serif; font-size: 38px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
        .ch-dica { position: relative; display: block; margin-top: 8px; font-size: 13px; color: rgba(255,255,255,.75); text-decoration: none; line-height: 1.45; }
        .ch-linha { position: relative; display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 8px; font-size: 13px; color: rgba(255,255,255,.82); }
        a.ch-dica { color: #fff; text-decoration: underline; font-weight: 700; }
      `}</style>
    </div>
  )
}
