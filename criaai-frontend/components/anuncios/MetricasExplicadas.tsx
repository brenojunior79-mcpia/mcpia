'use client'
import { avaliar, valorMetrica, LIMITES, type Metricas, type MetricaId } from '@/lib/anuncios'
import { COR, cartao, titulo } from './estilo'

type Item = { id: MetricaId; icone: string; nome: string; sigla: string; oQue: string; exemplo: string; meta: string }

// Os quatro números que mostram como o anúncio está indo, explicados em palavras simples
const ITENS: Item[] = [
  {
    id: 'ctr', icone: '👆', nome: 'CTR', sigla: 'Taxa de cliques no link',
    oQue: 'É a porcentagem de pessoas que clicaram no seu anúncio depois de vê-lo. Mostra se o anúncio está chamando a atenção.',
    exemplo: 'Se 100 pessoas viram e 2 clicaram, o CTR é 2%.',
    meta: 'Meta: no mínimo ' + String(LIMITES.ctr.bom).replace('.', ',') + '%. Abaixo disso, o anúncio não está prendendo a atenção.',
  },
  {
    id: 'cpc', icone: '💸', nome: 'CPC', sigla: 'Custo por clique no link',
    oQue: 'É quanto você paga, em média, por cada pessoa que clica no link do seu anúncio. Quanto menor, melhor.',
    exemplo: 'Se você gastou R$ 10 e teve 10 cliques, cada clique custou R$ 1,00.',
    meta: 'Meta: até R$ ' + LIMITES.cpc.bom.toFixed(2).replace('.', ',') + ' por clique. Acima de R$ ' + LIMITES.cpc.atencao.toFixed(2).replace('.', ',') + ' está caro.',
  },
  {
    id: 'connect', icone: '⚡', nome: 'Connect Rate', sigla: 'Velocidade da página',
    oQue: 'Das pessoas que clicaram no anúncio, mostra quantas esperaram a página abrir de verdade. Se o número é baixo, sua página está lenta e você está perdendo clientes antes mesmo deles verem a oferta.',
    exemplo: 'Se 100 pessoas clicaram e só 70 viram a página, 30 desistiram porque ela demorou.',
    meta: 'Meta: acima de ' + LIMITES.connect.bom + '%. Abaixo de ' + LIMITES.connect.atencao + '% você está perdendo muita gente.',
  },
  {
    id: 'cpm', icone: '📺', nome: 'CPM', sigla: 'Custo para aparecer 1.000 vezes',
    oQue: 'É quanto você paga para o seu anúncio aparecer 1.000 vezes. Pense como o aluguel de uma vitrine: quanto mais caro, mais você paga só para ser visto. Quanto menor, melhor.',
    exemplo: 'Se o CPM é R$ 20, a cada 1.000 vezes que o anúncio aparece você paga R$ 20.',
    meta: 'Meta: até R$ ' + LIMITES.cpm.bom + ' é bom. Acima de R$ ' + LIMITES.cpm.atencao + ' está caro.',
  },
]

export default function MetricasExplicadas({ m, nome, periodo }: { m: Metricas; nome: string; periodo: string }) {
  return (
    <div>
      <h2 style={{ ...titulo, marginBottom: 4 }}>📊 Como está o seu anúncio</h2>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 12 }}>
        Quatro números que mostram se o anúncio está funcionando. Valem para: <b>{nome}</b> ({periodo}). A cor mostra se está bom, em atenção ou ruim.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
        {ITENS.map(function(it) {
          const a = avaliar(it.id, m)
          const c = COR[a.nivel]
          return (
            <div key={it.id} style={{ ...cartao, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 22 }} aria-hidden="true">{it.icone}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, lineHeight: 1.15 }}>{it.nome}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted2)', fontWeight: 700 }}>{it.sigla}</div>
                  </div>
                </div>
                <span style={{ background: c.bg, color: c.fg, border: '1px solid ' + c.borda, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{c.rotulo}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>{valorMetrica(it.id, m)}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>{it.oQue}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted2)', background: 'var(--surface2)', borderRadius: 10, padding: '8px 10px' }}>
                <b>Exemplo:</b> {it.exemplo}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.5 }}>🎯 {it.meta}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: c.fg, fontWeight: 600 }}>{a.dica}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
