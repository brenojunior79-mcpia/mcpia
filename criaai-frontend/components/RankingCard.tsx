'use client'
import { useEffect, useState } from 'react'
import { ativarNotificacoes, situacaoNotificacao } from '@/lib/pushAtivar'

type Linha = { posicao: number; nome: string; foto: string | null; pontos: number; premio: number; voce: boolean }
type Dados = { mes: string; fimEm: string; ano: number; diasRestantes: number; top: Linha[]; eu: { posicao: number | null; pontos: number; nome: string; foto: string | null }; faltam: number; notif?: boolean; premios: number[] }

const MEDALHA = ['🥇', '🥈', '🥉']
const COR = ['#f5b301', '#9aa5b1', '#cd7f32']

const CSS = `
@keyframes rkTrofeu { 0%,100% { transform: translateY(0) rotate(-6deg) scale(1) } 50% { transform: translateY(-5px) rotate(6deg) scale(1.12) } }
@keyframes rkEntra { from { opacity: 0; transform: translateY(18px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes rkMedalha { 0%,100% { transform: scale(1) rotate(0) } 50% { transform: scale(1.18) rotate(-8deg) } }
@keyframes rkBrilho { 0% { left: -60% } 55%,100% { left: 130% } }
@keyframes rkOuro { 0%,100% { box-shadow: 0 0 0 0 rgba(245,179,1,0.0) } 50% { box-shadow: 0 0 18px 2px rgba(245,179,1,0.45) } }
@keyframes rkPremio { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }
@keyframes rkFaisca { 0% { opacity: 0; transform: translateY(8px) scale(0.6) } 30% { opacity: 1 } 100% { opacity: 0; transform: translateY(-26px) scale(1.1) } }
@keyframes rkPulsa { 0%,100% { box-shadow: 0 0 0 0 rgba(124,92,252,0.55), 0 6px 18px rgba(124,92,252,0.35) } 50% { box-shadow: 0 0 0 9px rgba(124,92,252,0), 0 6px 22px rgba(236,72,153,0.4) } }
@keyframes rkBalanca { 0%,86%,100% { transform: rotate(0) } 90% { transform: rotate(-14deg) } 94% { transform: rotate(12deg) } 97% { transform: rotate(-6deg) } }
@keyframes rkGradiente { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
@keyframes rkAbre { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes rkCheck { 0% { transform: scale(0.4) } 60% { transform: scale(1.3) } 100% { transform: scale(1) } }
@media (prefers-reduced-motion: reduce) { .rk-anim, .rk-anim * { animation: none !important } }
`
const brl = function(v: number) { return 'R$ ' + v.toLocaleString('pt-BR') }

// Formas de ganhar pontos (o aluno marca o que ja fez ou vai fazer)
const ITENS: { id: string; emoji: string; pts: string; texto: string; extra?: string }[] = [
  { id: 'acesso', emoji: '📅', pts: '5 pontos', texto: 'por dia que você entra na plataforma' },
  { id: 'ebook', emoji: '📘', pts: '20 pontos', texto: 'por ebook criado (1 por dia)' },
  { id: 'site', emoji: '🌐', pts: '20 pontos', texto: 'por site criado (1 por dia)' },
  { id: 'criativo', emoji: '🎬', pts: '30 pontos', texto: 'por criativo gerado' },
  { id: 'anuncio', emoji: '📣', pts: '50 pontos', texto: 'por anúncio publicado (até 2 por dia)' },
  { id: 'venda', emoji: '💰', pts: '50 pontos', texto: 'por venda registrada' },
  { id: 'app', emoji: '📲', pts: '10 pontos', texto: 'por instalar o aplicativo' },
  { id: 'notif', emoji: '🔔', pts: '10 pontos', texto: 'por ativar as notificações' },
  { id: 'aula', emoji: '🎓', pts: '10 pontos', texto: 'por aula assistida', extra: 'Bônus: 3 aulas +10 · 5 aulas +20 · 7 aulas +30' },
]
const CHAVE_MARCAS = 'rk_marcas_v1'
function lerMarcas(): Record<string, boolean> {
  try { const v = JSON.parse(localStorage.getItem(CHAVE_MARCAS) || '{}'); return v && typeof v === 'object' ? v : {} } catch (e) { return {} }
}

export default function RankingCard() {
  const [d, setD] = useState<Dados | null>(null)
  const [regras, setRegras] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [ativando, setAtivando] = useState(false)
  const [msgNotif, setMsgNotif] = useState('')
  const [marcas, setMarcas] = useState<Record<string, boolean>>({})

  useEffect(function() { setMarcas(lerMarcas()) }, [])

  function alternar(id: string) {
    const novo = { ...marcas, [id]: !marcas[id] }
    setMarcas(novo)
    try { localStorage.setItem(CHAVE_MARCAS, JSON.stringify(novo)) } catch (e) {}
  }

  useEffect(function() {
    setFalha(null)
    fetch('/api/ranking', { cache: 'no-store' })
      .then(function(r) { return r.json().catch(function() { return { error: 'Resposta inesperada (' + r.status + ')' } }) })
      .then(function(j) { if (j && j.top) setD(j); else setFalha((j && (j.detalhe || j.error)) || 'Erro desconhecido') })
      .catch(function(e) { setFalha(String(e && e.message || e)) })
  }, [tentativa])

  async function ativar() {
    setAtivando(true); setMsgNotif('')
    const r = await ativarNotificacoes()
    setAtivando(false)
    if (r === 'ok') { setMsgNotif('Pronto! Notificações ativadas. Seus 10 pontos já valem.'); setTentativa(tentativa + 1) }
    else if (r === 'negado') setMsgNotif('Você não permitiu. Para ativar, toque no cadeado ao lado do endereço do site, escolha Notificações e mude para Permitir.')
    else setMsgNotif('Não deu certo neste aparelho. Tente de novo ou veja como instalar o app.')
  }

  if (!d) {
    // Carregando ou com problema: o ranking nunca some sem avisar
    return (
      <div className="anim-fadeUp" style={{ marginBottom: 28 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 24 }}>🏆</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Ranking</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{falha ? 'Não consegui carregar o ranking agora.' : 'Carregando o ranking...'}</div>
            {falha && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2, opacity: 0.8 }}>{falha}</div>}
          </div>
          {falha && <button onClick={function() { setTentativa(tentativa + 1) }} style={{ cursor: 'pointer', border: '1px solid #7c5cfc', color: '#7c5cfc', background: 'transparent', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13 }}>Tentar de novo</button>}
        </div>
      </div>
    )
  }

  return (
    <div className="anim-fadeUp rk-anim" style={{ marginBottom: 28 }}>
      <style>{CSS}</style>
      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '22px 22px 20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ position: 'absolute', top: -70, right: -50, width: 240, height: 240, background: 'radial-gradient(circle, rgba(245,179,1,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ position: 'relative', fontSize: 26, display: 'inline-block', animation: 'rkTrofeu 2.4s ease-in-out infinite' }}>
            🏆
            {[0, 1, 2].map(function(k) { return <span key={k} style={{ position: 'absolute', top: -2, left: 4 + k * 9, fontSize: 11, opacity: 0, animation: 'rkFaisca 2.4s ease-out ' + (k * 0.5) + 's infinite' }}>✨</span> })}
          </span>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)', flex: 1, minWidth: 160 }}>Ranking de premiação</div>
        </div>
        <div style={{ position: 'relative', fontSize: 13, color: 'var(--muted2)', marginBottom: 16, lineHeight: 1.5 }}>
          Cada atividade que você faz na plataforma vale pontos. Veja quem está no topo e suba no ranking.
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map(function(i) {
            const l = d.top[i]
            const premio = d.premios[i]
            return (
              <div key={i} style={{ position: 'relative', overflow: 'hidden', animation: 'rkEntra 0.6s ease both ' + (0.1 + i * 0.18) + 's' + (i === 0 ? ', rkOuro 2.8s ease-in-out 1s infinite' : ''), display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: l && l.voce ? 'rgba(124,92,252,0.10)' : 'var(--surface2)', border: '1.5px solid ' + (l && l.voce ? '#7c5cfc' : COR[i] + '66') }}>
                {i === 0 && <div style={{ position: 'absolute', top: 0, bottom: 0, width: 50, left: '-60%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)', transform: 'skewX(-18deg)', animation: 'rkBrilho 3.6s ease-in-out 1.2s infinite', pointerEvents: 'none' }} />}
                <span style={{ fontSize: 28, lineHeight: 1, width: 34, textAlign: 'center', display: 'inline-block', animation: 'rkMedalha 2.2s ease-in-out ' + (i * 0.35) + 's infinite' }}>{MEDALHA[i]}</span>
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
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#15803d', animation: 'rkPremio 2s ease-in-out ' + (i * 0.3) + 's infinite' }}>{brl(premio)}</div>
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


        {/* Convite para ativar as notificacoes (10 pontos) */}
        {d.notif === false && (
          <div style={{ position: 'relative', marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>🔔</span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Ative as notificações e ganhe 10 pontos</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>
                  {situacaoNotificacao() === 'ios_instalar' ? 'No iPhone, primeiro adicione o app à tela inicial e depois abra por ele.' : 'Avisamos você das novidades, aulas e do ranking.'}
                </div>
              </div>
              {situacaoNotificacao() === 'ios_instalar' || situacaoNotificacao() === 'sem_suporte'
                ? <button onClick={function() { window.dispatchEvent(new Event('mcpia-como-instalar')) }} style={{ cursor: 'pointer', border: 'none', background: '#16a34a', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: 13 }}>Ver como instalar</button>
                : <button onClick={ativar} disabled={ativando} style={{ cursor: 'pointer', border: 'none', background: '#16a34a', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: 13, opacity: ativando ? 0.7 : 1 }}>{ativando ? 'Ativando...' : 'Ativar agora'}</button>}
            </div>
            {situacaoNotificacao() === 'bloqueado' && !msgNotif && <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text)' }}>As notificações estão bloqueadas neste aparelho. Toque no <b>cadeado</b> ao lado do endereço do site, escolha <b>Notificações</b> e mude para <b>Permitir</b>. Depois atualize a página.</div>}
            {msgNotif && <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{msgNotif}</div>}
          </div>
        )}

        <button
          onClick={function() { setRegras(!regras) }}
          aria-expanded={regras}
          style={{ position: 'relative', overflow: 'hidden', marginTop: 14, width: '100%', cursor: 'pointer', border: 'none', borderRadius: 14, padding: '13px 16px', fontSize: 15, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#fff', backgroundImage: 'linear-gradient(90deg, #7c5cfc, #ec4899, #f5b301, #7c5cfc)', backgroundSize: '200% 100%', animation: 'rkGradiente 4s linear infinite, rkPulsa 2.2s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <span style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', left: '-60%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)', animation: 'rkBrilho 2.6s ease-in-out infinite', pointerEvents: 'none' }} />
          <span style={{ display: 'inline-block', animation: 'rkBalanca 3s ease-in-out infinite' }}>🎯</span>
          <span style={{ position: 'relative' }}>{regras ? 'Esconder' : 'Como ganhar pontos?'}</span>
          <span style={{ position: 'relative' }}>{regras ? '▲' : '▼'}</span>
        </button>
        {regras && (
          <div style={{ position: 'relative', marginTop: 12, fontSize: 13, color: 'var(--text)', animation: 'rkAbre 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800 }}>Marque o que você já fez ou vai fazer</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>{ITENS.filter(function(it) { return marcas[it.id] || (it.id === 'notif' && d.notif) }).length} de {ITENS.length} marcados</div>
            </div>
            {ITENS.map(function(it) {
              const auto = it.id === 'notif' && d.notif === true
              const on = !!marcas[it.id] || auto
              return (
                <button
                  key={it.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={function() { if (!auto) alternar(it.id) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: auto ? 'default' : 'pointer', marginBottom: 6, padding: '10px 12px', borderRadius: 12, border: '1.5px solid ' + (on ? 'rgba(22,163,74,0.5)' : 'var(--border)'), background: on ? 'rgba(22,163,74,0.08)' : 'var(--surface2)', color: 'var(--text)', fontSize: 13, lineHeight: 1.45, transition: 'background 0.2s, border-color 0.2s' }}
                >
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid ' + (on ? '#16a34a' : 'var(--muted2)'), background: on ? '#16a34a' : 'transparent', color: '#fff', fontSize: 15, fontWeight: 900, animation: on ? 'rkCheck 0.35s ease-out' : 'none' }}>{on ? '✓' : ''}</span>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{it.emoji}</span>
                  <span style={{ flex: 1, opacity: on ? 0.75 : 1 }}>
                    <b>{it.pts}</b> {it.texto}
                    {it.extra && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted2)' }}>{it.extra}</span>}
                    {auto && <span style={{ display: 'block', fontSize: 12, color: '#16a34a', fontWeight: 700 }}>Você já ativou</span>}
                  </span>
                </button>
              )
            })}
            <div style={{ color: 'var(--muted2)', fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>Ebook e site contam 1 por dia e criativo até 3 por dia. Instalar o app e ativar as notificações valem uma vez só. A aula só conta se você assistir de verdade, com a aba aberta e o som ligado (pular para o final não vale). Depois de {d.fimEm}, o ranking zera e recomeça no começo de cada mês. Os prêmios são pagos por Pix para os 3 primeiros colocados.</div>
          </div>
        )}
      </div>
    </div>
  )
}
