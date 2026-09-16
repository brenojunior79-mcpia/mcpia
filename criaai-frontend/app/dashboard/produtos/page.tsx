'use client'
import { useState } from 'react'
import Link from 'next/link'

const products = [
  {
    id: 'jovens-altar',
    name: 'Jovens no Altar',
    platform: 'cakto',
    category: 'Ministerio Jovem',
    description: 'Produto voltado para ministerios jovens e igrejas evangelicas. Conteudo de alto impacto para evangelismo e formacao de lideres.',
    audience: 'Pastores, lideres de jovens, igrejas e ministerios',
    ageRange: '25-50 anos',
    dailySales: 'R$200 - R$500/dia',
    commission: 'A confirmar',
    affiliateUrl: 'https://app.cakto.com.br/affiliate/invite/530d76d8-005e-4de4-a9e6-98b07a722e6a',
    siteUrl: 'https://www.reinoemfoco.com/cakto',
    driveUrl: 'https://drive.google.com/drive/folders/1uxe1EzH2_qGOZxgwOYyfKvQ7rCMWR2xM',
    videoUrl: '',
    color: '#7c5cfc',
    colorBg: 'rgba(124,92,252,0.08)',
    emoji: '⛪',
  },
  {
    id: 'escolinha-crista',
    name: 'Escolinha Crista',
    platform: 'cakto',
    category: 'Educacao Crista',
    description: 'Material completo para escola biblica infantil. Ideal para quem quer impactar criancas com o evangelho de forma ludica e criativa.',
    audience: 'Professores de escola biblica, pais cristaos, igrejas',
    ageRange: '25-45 anos',
    dailySales: 'R$150 - R$400/dia',
    commission: 'A confirmar',
    affiliateUrl: 'https://app.cakto.com.br/affiliate/invite/d0456f33-809c-4700-8042-663a40c4c9af',
    siteUrl: 'https://www.reinoemfoco.com/escolinha-kids',
    driveUrl: 'https://drive.google.com/drive/folders/1dvJrnH2kPqR0zAGM3jGBAbPunLctGSov',
    videoUrl: '',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.08)',
    emoji: '📚',
  },
  {
    id: 'play-kids',
    name: 'Play Kids',
    platform: 'cakto',
    category: 'Entretenimento Cristao',
    description: 'Plataforma de conteudo infantil cristao. Musicas, historias e atividades para criancas de forma segura e edificante.',
    audience: 'Pais cristaos, igrejas, educadores',
    ageRange: '20-40 anos',
    dailySales: 'R$200 - R$500/dia',
    commission: 'A confirmar',
    affiliateUrl: 'https://app.cakto.com.br/affiliate/invite/23680113-4c24-43ee-b480-d23e36dca605',
    siteUrl: 'https://www.reinoemfoco.com/play-kids',
    driveUrl: '',
    videoUrl: '',
    color: '#4ade80',
    colorBg: 'rgba(74,222,128,0.08)',
    emoji: '🎮',
  },
]

export default function ProdutosAltaPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const selectedProduct = products.find(function(p) { return p.id === selected })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>

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

        {/* Lista de produtos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {products.map(function(product) {
            const isSelected = selected === product.id
            return (
              <div
                key={product.id}
                style={{
                  background: isSelected ? product.colorBg : 'var(--surface)',
                  border: '1px solid ' + (isSelected ? product.color + '44' : 'var(--border)'),
                  borderRadius: 16,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onClick={function() { setSelected(isSelected ? null : product.id) }}
              >
                {/* Card header */}
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 52, height: 52, background: product.colorBg, border: '1px solid ' + product.color + '33', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                      {product.emoji}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800 }}>{product.name}</span>
                        <span style={{ fontSize: 11, background: product.colorBg, border: '1px solid ' + product.color + '44', color: product.color, borderRadius: 99, padding: '2px 10px', fontWeight: 600 }}>{product.category}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0 }}>{product.description}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', align: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Potencial</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>{product.dailySales}</div>
                    </div>
                    <div style={{ fontSize: 20, color: 'var(--muted2)' }}>{isSelected ? '▲' : '▼'}</div>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isSelected && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                      <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Publico-alvo</div>
                        <div style={{ fontSize: 14 }}>{product.audience}</div>
                      </div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Faixa etaria</div>
                        <div style={{ fontSize: 14 }}>{product.ageRange}</div>
                      </div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Vendas diarias</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>{product.dailySales}</div>
                      </div>
                    </div>

                    {/* Video aula */}
                    {product.videoUrl ? (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aula — Como se afiliar</div>
                        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                          <iframe
                            src={product.videoUrl}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 20, background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🎬</div>
                        <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Aula em breve</div>
                      </div>
                    )}

                    {/* Botoes de acao */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={function(e) { e.stopPropagation() }}
                        style={{ flex: 1, minWidth: 160, background: 'linear-gradient(135deg, ' + product.color + ', ' + product.color + 'cc)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 20px', borderRadius: 12, textDecoration: 'none', textAlign: 'center', display: 'block' }}
                      >
                        🤝 Quero me afiliar
                      </a>
                      <a
                        href={product.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={function(e) { e.stopPropagation() }}
                        style={{ flex: 1, minWidth: 160, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 14, padding: '12px 20px', borderRadius: 12, textDecoration: 'none', textAlign: 'center', display: 'block' }}
                      >
                        🌐 Ver pagina de vendas
                      </a>
                      {product.driveUrl && (
                        <a
                          href={product.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={function(e) { e.stopPropagation() }}
                          style={{ flex: 1, minWidth: 160, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontWeight: 600, fontSize: 14, padding: '12px 20px', borderRadius: 12, textDecoration: 'none', textAlign: 'center', display: 'block' }}
                        >
                          📁 Material de apoio
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 32 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Dica importante</div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
              Use o <strong>Criador de Criativos</strong> e o <strong>Gerador de Ebook</strong> do MCP.IA para criar seu material de divulgacao e vender muito mais rapido!
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
