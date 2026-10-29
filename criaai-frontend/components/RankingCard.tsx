'use client'
import { useEffect, useState } from 'react'

type Linha = { posicao: number; nome: string; foto: string | null; pontos: number; premio: number; voce: boolean }
type Dados = { mes: string; ano: number; diasRestantes: number; top: Linha[]; eu: { posicao: number | null; pontos: number; nome: string; foto: string | null }; faltam: number; premios: number[] }

const MEDALHA = ['🥇', '🥈', '🥉']
const COR = ['#f5b301', '#9aa5b1', '#cd7f32']
const brl = function(v: number) { return 'R$ ' + v.toLocaleString('pt-BR') }

export default function RankingCard() {
  const [d, setD] = useState<Dados | null>(null)
  const [regras, setRegras] = useState(false)

  useEffect(function() {
    fetch('/api/ranking', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { if (j && j.top) setD(j) }).catch(function() {})
  }, [])

  if (!d) return null

  return (
    <div className="anim-fadeUp" style={{ marginBottom: 28 }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '22px 22px 20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ position: 'absolute', top: -70, right: -50, width: 240, height: 240, background: 'radial-gradient(circle, rgba(245,179,1,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>🏆</span>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)', flex: 1, minWidth: 160 }}>Ranking de {d.mes}</div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.35)', padding: '4px 10px', borderRadius: 99 }}>
            {d.diasRestantes <= 1 ? 'Último dia!' : 'Faltam ' + d.diasRestantes + ' dias'}
          </span>
        </div>
        <div style={{ position: 'relative', fontSize: 13, color: 'var(--muted2)', marginBottom: 16 }}>
          Os 3 primeiros do mês ganham prêmio em dinheiro no Pix.
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map(function(i) {
            const l = d.top[i]
            const premio = d.premios[i]
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: l && l.voce ? 'rgba(124,92,252,0.10)' : 'var(--surface2)', border: '1.5px solid ' + (l && l.voce ? '#7c5cfc' : COR[i] + '66') }}>
                <span style={{ fontSize: 28, lineHeight: 1, width: 34, textAlign: 'center' }}>{MEDALHA[i]}</span>
                <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '2px solid ' + COR[i], background: l ? 'linear-gradient(135deg,#f97316,#fb923c)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>
                  {l ? (l.foto ? <img src={l.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : l.nome.charAt(0).toUpperCase()) : <span style={{ color: 'var(--muted2)' }}>?</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l ? l.nome : 'Vaga aberta'}{l && l.voce ? ' (você)' : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 1 }}>{l ? l.pontos + ' pontos' : 'Ninguém aqui ainda'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#15803d' }}>{brl(premio)}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>no Pix</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Posicao de cada aluno, logo abaixo do 3o colocado */}
        <div style={{ position: 'relative', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--border2)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sua posição</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: 'rgba(124,92,252,0.10)', border: '1.5px solid #7c5cfc' }}>
            <div style={{ minWidth: 34, textAlign: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: d.eu.posicao === null ? 20 : 20, color: '#7c5cfc' }}>
              {d.eu.posicao === null ? '–' : d.eu.posicao + 'º'}
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '2px solid #7c5cfc', background: 'linear-gradient(135deg,#f97316,#fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>
              {d.eu.foto ? <img src={d.eu.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : d.eu.nome.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.eu.nome} (você)</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 1 }}>{d.eu.pontos} pontos</div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {d.eu.posicao === null
              ? 'Você ainda não pontuou neste mês. Use a plataforma para entrar na disputa!'
              : d.eu.posicao <= 3
                ? 'Você está no top 3! Continue assim!'
                : (d.faltam > 0 ? 'Faltam ' + d.faltam + ' pontos para subir uma posição.' : '')}
          </div>
        </div>

        <button onClick={function() { setRegras(!regras) }} style={{ position: 'relative', marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#7c5cfc' }}>
          {regras ? 'Esconder' : 'Como ganhar pontos?'} {regras ? '▲' : '▼'}
        </button>
        {regras && (
          <div style={{ position: 'relative', marginTop: 10, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
            <div>📅 <b>5 pontos</b> por dia que você entra na plataforma</div>
            <div>📘 <b>20 pontos</b> por ebook criado (1 por dia)</div>
            <div>🌐 <b>20 pontos</b> por site criado (1 por dia)</div>
            <div>🎬 <b>30 pontos</b> por criativo gerado</div>
            <div>📲 <b>10 pontos</b> por instalar o aplicativo</div>
            <div>🔔 <b>10 pontos</b> por ativar as notificações</div>
            <div>🎓 <b>10 pontos</b> por aula assistida</div>
            <div style={{ marginLeft: 26, fontSize: 12.5, color: 'var(--muted2)' }}>Bônus: 3 aulas +10 · 5 aulas +20 · 7 aulas +30</div>
            <div style={{ color: 'var(--muted2)', fontSize: 12, marginTop: 6 }}>Ebook e site contam 1 por dia e criativo até 3 por dia. Instalar o app e ativar as notificações valem uma vez só. A aula só conta se você assistir de verdade, com a aba aberta e o som ligado (pular para o final não vale). O ranking zera no começo de cada mês. Os prêmios são pagos por Pix para os 3 primeiros colocados.</div>
          </div>
        )}
      </div>
    </div>
  )
}
