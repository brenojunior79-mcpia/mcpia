'use client'
import { useState } from 'react'

const products = [
  {
    id: 'jovens-altar',
    name: 'Jovens no Altar',
    platform: 'cakto',
    category: 'Ministerio Jovem',
    description: 'Guia pratico para jovens cristaos vencerem a pornografia e viverem em pureza. Alto potencial de vendas no nicho evangelico.',
    audience: 'Jovens cristaos, pastores, lideres de jovens',
    ageRange: '18-35 anos',
    dailySales: 'R$200 - R$500/dia',
    affiliateUrl: 'https://app.cakto.com.br/affiliate/invite/530d76d8-005e-4de4-a9e6-98b07a722e6a',
    siteUrl: 'https://www.reinoemfoco.com/cakto',
    driveUrl: 'https://drive.google.com/drive/folders/1uxe1EzH2_qGOZxgwOYyfKvQ7rCMWR2xM',
    videoUrl: '',
    image: 'https://media.atomicatmedia.net/u/cvGVf0p6A2a9h1ulFdYoyM38xIJ3/Pictures/PudEHx9773560.png?quality=74',
    color: '#7c5cfc',
    colorBg: 'rgba(124,92,252,0.08)',
  },
  {
    id: 'escolinha-crista',
    name: 'Escolinha Crista',
    platform: 'cakto',
    category: 'Educacao Crista',
    description: 'Atividades biblicas mensais para criancas. Material em apostila para imprimir. Ideal para pais e professores de escola biblica.',
    audience: 'Pais cristaos, professores de EBD, igrejas',
    ageRange: '25-45 anos',
    dailySales: 'R$150 - R$400/dia',
    affiliateUrl: 'https://app.cakto.com.br/affiliate/invite/d0456f33-809c-4700-8042-663a40c4c9af',
    siteUrl: 'https://www.reinoemfoco.com/escolinha-kids',
    driveUrl: 'https://drive.google.com/drive/folders/1dvJrnH2kPqR0zAGM3jGBAbPunLctGSov',
    videoUrl: '',
    image: 'https://media.atomicatmedia.net/u/cvGVf0p6A2a9h1ulFdYoyM38xIJ3/Pictures/YldWlp0723979.png?quality=89',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.08)',
  },
  {
    id: 'play-kids',
    name: 'Play Kids',
    platform: 'cakto',
    category: 'Entretenimento Cristao',
    description: '10 jogos cristaos que ensinam valores biblicos de forma divertida. Conteudo seguro e 100% biblico para criancas.',
    audience: 'Pais cristaos, igrejas, educadores cristao',
    ageRange: '20-40 anos',
    dailySales: 'R$200 - R$500/dia',
    affiliateUrl: 'https://app.cakto.com.br/affiliate/invite/23680113-4c24-43ee-b480-d23e36dca605',
    siteUrl: 'https://www.reinoemfoco.com/play-kids',
    driveUrl: '',
    videoUrl: '',
    image: 'https://media.atomicatmedia.net/u/cvGVf0p6A2a9h1ulFdYoyM38xIJ3/Pictures/IsEAFz9840611.png?quality=85',
    color: '#4ade80',
    colorBg: 'rgba(74,222,128,0.08)',
  },
]

export default function ProdutosAltaPage() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 28 }}>🔥</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Produtos em Alta</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted2)', margin: 0 }}>
            Escolha um produto, se afilie e comece a vender hoje mesmo
          </p>
        </div>

        {/* Passo a passo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { num: '1', label: 'Escolha o produto', icon: '🎯' },
            { num: '2', label: 'Acesse o material', icon: '📦' },
            { num: '3', label: 'Comece a vender', icon: '💰' },
          ].map(function(step) {
            return (
              <div key={step.num} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{step.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Passo {step.num}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{step.label}</div>
              </div>
            )
          })}
        </div>

        {/* Grid de produtos — lado a lado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
          {products.map(function(product) {
            const isSelected = selected === product.id
            return (
              <div
                key={product.id}
                style={{
                  background: 'var(--surface)',
                  border: '2px solid ' + (isSelected ? product.color : 'var(--border)'),
                  borderRadius: 18,
                  overflow: 'hidden',
                  transition: 'all 0.25s',
                  cursor: 'pointer',
                  transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isSelected ? '0 16px 40px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onClick={function() { setSelected(isSelected ? null : product.id) }}
              >
                {/* Imagem do produto */}
                <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: product.colorBg }}>
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                    onError={function(e: any) { e.target.style.display = 'none' }}
                  />
                  {/* Badge plataforma */}
                  <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#fff', backdropFilter: 'blur(8px)' }}>
                    {product.platform.toUpperCase()}
                  </div>
                  {/* Badge potencial */}
                  <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(74,222,128,0.9)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#000' }}>
                    {product.dailySales}
                  </div>
                </div>

                {/* Info do produto */}
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800 }}>{product.name}</span>
                  </div>
                  <div style={{ fontSize: 11, background: product.colorBg, border: '1px solid ' + product.color + '44', color: product.color, borderRadius: 99, padding: '2px 10px', fontWeight: 600, display: 'inline-block', marginBottom: 10 }}>{product.category}</div>
                  <p style={{ fontSize: 13, color: 'var(--muted2)', margin: '0 0 14px', lineHeight: 1.6 }}>{product.description}</p>

                  {/* Infos rapidas */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
                      👥 {product.ageRange}
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
                      🎯 {product.audience.split(',')[0]}
                    </div>
                  </div>

                  {/* Botoes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <a
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={function(e) { e.stopPropagation() }}
                      style={{ background: 'linear-gradient(135deg, ' + product.color + ', ' + product.color + 'bb)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px', borderRadius: 12, textDecoration: 'none', textAlign: 'center', display: 'block' }}
                    >
                      🤝 Quero me afiliar
                    </a>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={product.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={function(e) { e.stopPropagation() }}
                        style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 12, padding: '9px', borderRadius: 10, textDecoration: 'none', textAlign: 'center', display: 'block' }}
                      >
                        🌐 Ver site
                      </a>
                      {product.driveUrl && (
                        <a
                          href={product.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={function(e) { e.stopPropagation() }}
                          style={{ flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontWeight: 600, fontSize: 12, padding: '9px', borderRadius: 10, textDecoration: 'none', textAlign: 'center', display: 'block' }}
                        >
                          📁 Material
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Detalhes expandidos */}
                  {isSelected && (
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      {product.videoUrl ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 8, textTransform: 'uppercase' }}>Aula — Como se afiliar</div>
                          <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                            <iframe src={product.videoUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 20, marginBottom: 4 }}>🎬</div>
                          <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Aula de afiliacao em breve</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Dica */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 32 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Dica importante</div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
              Use o Criador de Criativos e o Gerador de Ebook do MCP.IA para criar seu material de divulgacao e vender muito mais rapido!
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
