'use client'
import { useState } from 'react'
import { PLANOS, HUBLA_LINKS, NIVEL_PLANO, precoBR } from '@/lib/planos'

// Aviso do Gerenciador de Anuncios para quem ainda nao tem acesso (sem plano ou plano Starter).
// planoAtual: nome do plano que a pessoa ja tem (ex.: 'Starter'), ou null se nao tem plano.
export default function PaywallPlanos({ planoAtual }: { planoAtual: string | null }) {
  const [indo, setIndo] = useState('')
  const itens = [
    { i: 'ti-sparkles', t: 'A IA analisa os seus criativos por você' },
    { i: 'ti-chart-line', t: 'A IA analisa as suas métricas e mostra onde o funil está perdendo' },
    { i: 'ti-pointer', t: 'Você só dá um clique para pausar, ativar ou ajustar as campanhas' },
    { i: 'ti-layout-dashboard', t: 'Tudo em um só lugar, sem se perder nas telas complicadas' },
  ]
  const opcoes = PLANOS.filter(function(p) { return p.gerenciador && (!planoAtual || (NIVEL_PLANO[p.name] || 0) > (NIVEL_PLANO[planoAtual] || 0)) })
  function ir(nome: string) { setIndo(nome); window.location.href = HUBLA_LINKS[nome] }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '40px 20px 60px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: '34px 26px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: 68, height: 68, borderRadius: 20, margin: '0 auto 14px', background: 'linear-gradient(135deg,#4b3fe8,#5b4ef8,#8b6dfa)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, boxShadow: '0 10px 26px rgba(91,78,248,0.35)' }}><i className="ti ti-robot" /></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124,92,252,0.10)', border: '1px solid rgba(124,92,252,0.3)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: '4px 12px', marginBottom: 12 }}><i className="ti ti-lock" /> EXCLUSIVO PARA ASSINANTES PRO E PREMIUM</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, margin: '0 0 10px', lineHeight: 1.2 }}>Automatize as suas campanhas</h1>
        <p style={{ fontSize: 15, color: 'var(--muted2)', lineHeight: 1.6, margin: '0 0 20px' }}>Não fique perdido no Gerenciador de Anúncios. <b style={{ color: 'var(--text)' }}>Aqui, a IA faz tudo por você.</b></p>

        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, margin: '0 auto 26px', maxWidth: 450 }}>
          {itens.map(function(it) { return (
            <div key={it.t} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(124,92,252,0.12)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}><i className={'ti ' + it.i} /></span>
              <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{it.t}</span>
            </div>
          ) })}
        </div>

        {planoAtual && (
          <div style={{ display: 'inline-block', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '9px 14px', fontSize: 13, marginBottom: 16 }}>
            Seu plano atual: <b>{planoAtual}</b>. Ele não inclui o Gerenciador de Anúncios. Faça upgrade para liberar.
          </div>
        )}

        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, marginBottom: 12 }}>{planoAtual ? 'Escolha o upgrade' : 'Escolha o seu plano'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, textAlign: 'left' }}>
          {opcoes.map(function(p) {
            return (
              <div key={p.name} style={{ position: 'relative', background: 'var(--surface)', border: '2px solid ' + (p.featured ? 'var(--accent)' : 'var(--border)'), borderRadius: 16, padding: '20px 18px 18px', display: 'flex', flexDirection: 'column' }}>
                {p.featured && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: '3px 12px', whiteSpace: 'nowrap' }}>Mais popular</div>}
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17 }}>{p.name}</div>
                <div style={{ margin: '4px 0 12px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>R$ </span><span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 30 }}>{precoBR(p.price)}</span><span style={{ fontSize: 12, color: 'var(--muted2)' }}> /mês</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 800 }}><i className="ti ti-check" style={{ color: 'var(--accent)', marginTop: 2 }} />Gerenciador de Anúncios com IA</div>
                  {p.features.map(function(f) { return <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--muted2)' }}><i className="ti ti-check" style={{ color: 'var(--green)', marginTop: 2 }} />{f}</div> })}
                  {p.extra && <div style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 700 }}><i className="ti ti-brand-whatsapp" style={{ color: 'var(--accent)', marginTop: 2 }} />{p.extra.title}</div>}
                </div>
                <button onClick={function() { ir(p.name) }} disabled={indo === p.name} style={{ border: 0, cursor: 'pointer', background: p.featured ? 'linear-gradient(135deg,#4b3fe8,#5b4ef8,#8b6dfa)' : 'var(--surface2)', color: p.featured ? '#fff' : 'var(--text)', fontWeight: 800, fontSize: 14.5, padding: '12px', borderRadius: 12, boxShadow: p.featured ? '0 8px 22px rgba(91,78,248,0.35)' : 'none', outline: p.featured ? 'none' : '1px solid var(--border2)' }}>
                  {indo === p.name ? 'Abrindo...' : planoAtual ? 'Fazer upgrade para o ' + p.name : 'Quero o ' + p.name}
                </button>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted2)' }}>Garantia de 7 dias sem risco: se não gostar, devolvemos 100% do valor.</div>
      </div>
    </div>
  )
}
