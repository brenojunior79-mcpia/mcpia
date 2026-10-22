'use client'
import { Metricas, Relatorio, etapasDoFunil, PASSAGENS, avaliar, valorMetrica, EXPLICA } from '@/lib/anuncios'
import { COR, cartao, titulo, inteiro } from './estilo'

// Larguras (em %) de cada camada do funil, de cima para baixo
const LARGURAS = [100, 80, 62, 46, 32]
const CORES = ['#6d5df6', '#7c5cfc', '#8b5cf6', '#2f9e6e', '#16a34a']

export default function Funil({ m, relatorio, nomeCampanha }: { m: Metricas; relatorio: Relatorio; nomeCampanha: string }) {
  const etapas = etapasDoFunil(m)
  const nivelRel = relatorio.situacao === 'falha' ? 'ruim' : relatorio.situacao === 'atencao' ? 'atencao' : relatorio.situacao === 'saudavel' ? 'bom' : 'sem'

  return (
    <div style={cartao}>
      <h2 style={titulo}>🔻 Funil do anúncio</h2>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 2, marginBottom: 14 }}>{nomeCampanha}</div>

      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {etapas.map(function(e, i) {
          const topo = LARGURAS[i]
          const base = i < LARGURAS.length - 1 ? LARGURAS[i + 1] : LARGURAS[i] * 0.78
          const recuo = ((topo - base) / 2 / topo) * 100 // % de cada lado na base
          const falha = relatorio.falhaEm === e.id
          const passagem = PASSAGENS.find(function(p) { return p.para === e.id })
          const av = passagem ? avaliar(passagem.metrica, m) : null
          return (
            <div key={e.id}>
              {passagem && av && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: COR[av.nivel].bg, color: COR[av.nivel].fg, border: '1px solid ' + COR[av.nivel].borda }}>
                    ▼ {EXPLICA[passagem.metrica].nome}: {valorMetrica(passagem.metrica, m)}
                  </span>
                </div>
              )}
              <div style={{ width: topo + '%', margin: '0 auto', position: 'relative' }}>
                <div style={{
                  height: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center',
                  background: falha ? 'linear-gradient(180deg,#ef4444,#b91c1c)' : 'linear-gradient(180deg,' + CORES[i] + ',' + CORES[i] + 'dd)',
                  clipPath: 'polygon(0 0, 100% 0, ' + (100 - recuo) + '% 100%, ' + recuo + '% 100%)',
                  padding: '0 ' + Math.max(6, recuo) + '%',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', lineHeight: 1.1 }}>{inteiro(e.valor)}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.95 }}>{e.icone} {e.nome}</div>
                </div>
                {falha && <div style={{ position: 'absolute', right: -6, top: -8, background: '#b91c1c', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>⚠ falha aqui</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 18, borderRadius: 14, padding: '14px 16px', background: COR[nivelRel].bg, border: '1px solid ' + COR[nivelRel].borda }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: COR[nivelRel].fg }}>📋 Relatório: {relatorio.titulo}</div>
        <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.5 }}>{relatorio.resumo}</div>
        {relatorio.itens.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {relatorio.itens.map(function(it, i) {
              return (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.45 }}>
                  <span>{COR[it.nivel].rotulo.split(' ')[0]}</span>
                  <div><b>{it.titulo}</b><div style={{ color: 'var(--muted2)' }}>{it.texto}</div></div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
