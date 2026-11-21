'use client'
// Card "Comissoes de hoje" do Painel do Aluno (ordem do Breno): o valor das vendas que o Facebook registrou hoje
// nos anuncios do aluno. Atualiza sozinho a cada 5 minutos.
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Resp = { status: 'ok' | 'conectar' | 'sem_acesso' | 'erro'; valor?: number }

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
      {d && d.status === 'ok' && <div className="ch-dica">Vendas que o Facebook registrou hoje nos seus anúncios</div>}
      {d && d.status === 'erro' && <div className="ch-dica">Não foi possível ler as vendas agora. Tente mais tarde.</div>}
      <style>{`
        .ch-card { position: relative; overflow: hidden; border-radius: 22px; padding: 20px 22px; margin-bottom: 20px; color: #fff;
          background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #4c1d95 100%); box-shadow: 0 14px 36px rgba(124,58,237,.30); animation: fadeUp .5s ease both; }
        .ch-brilho { position: absolute; top: -60px; right: -40px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(196,181,253,.45), transparent 70%); pointer-events: none; }
        .ch-rotulo { position: relative; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #ddd6fe; margin-bottom: 6px; }
        .ch-valor { position: relative; font-family: Syne, sans-serif; font-size: 38px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
        .ch-dica { position: relative; display: block; margin-top: 8px; font-size: 13px; color: rgba(255,255,255,.75); text-decoration: none; line-height: 1.45; }
        a.ch-dica { color: #fff; text-decoration: underline; font-weight: 700; }
      `}</style>
    </div>
  )
}
