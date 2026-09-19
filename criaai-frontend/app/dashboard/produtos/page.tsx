'use client'
import { useState, useRef } from 'react'

const digitalProducts = [
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
    audience: 'Pais cristaos, igrejas, educadores',
    ageRange: '20-40 anos',
    dailySales: 'R$200 - R$500/dia',
    affiliateUrl: 'https://app.cakto.com.br/affiliate/invite/23680113-4c24-43ee-b480-d23e36dca605',
    siteUrl: 'https://www.reinoemfoco.com/play-kids',
    driveUrl: '',
    image: 'https://media.atomicatmedia.net/u/cvGVf0p6A2a9h1ulFdYoyM38xIJ3/Pictures/IsEAFz9840611.png?quality=85',
    color: '#4ade80',
    colorBg: 'rgba(74,222,128,0.08)',
  },
  {
    id: 'manual-biblico',
    name: 'Manual Biblico Digital',
    platform: 'kiwify',
    category: 'Estudo Biblico',
    description: 'Aplicativo com mapeamento estrategico do AT, apologetica aplicada, teologia sistematica e manual de usos e costumes. Pagamento unico, acesso vitalicio.',
    audience: 'Cristaos, pastores, lideres, apologistas',
    ageRange: '20-55 anos',
    dailySales: 'R$150 - R$400/dia',
    affiliateUrl: 'https://dashboard.kiwify.com.br/marketplace?product=6zt7pfPP',
    siteUrl: 'https://excelenciacrista.com.br/manual-kiwify/',
    driveUrl: '',
    image: 'https://excelenciacrista.com.br/wp-content/uploads/2026/01/5-1-1024x1024.png',
    color: '#3b82f6',
    colorBg: 'rgba(59,130,246,0.08)',
  },
  {
    id: 'pack-aeg',
    name: 'Pack AEG — Artes para Igreja',
    platform: 'kiwify',
    category: 'Design Gospel',
    description: '+600 artes 100% editaveis no Canva e Photoshop para igrejas e ministerios. Ideal para social media gospel. Mais de 3 mil membros.',
    audience: 'Designers gospel, igrejas, lideres de comunicacao',
    ageRange: '18-45 anos',
    dailySales: 'R$100 - R$300/dia',
    affiliateUrl: 'https://dashboard.kiwify.com.br/marketplace?product=njYS5if6',
    siteUrl: 'https://lianesoares.com.br/pack-aeg-afiliados/',
    driveUrl: '',
    image: 'https://lianesoares.com.br/wp-content/uploads/2025/06/Pack-AEG-1.0-Topo-1024x641.webp',
    color: '#ec4899',
    colorBg: 'rgba(236,72,153,0.08)',
  },
  {
    id: 'receitas-bolos',
    name: '700 Receitas de Bolos e Tortas',
    platform: 'kiwify',
    category: 'Confeitaria',
    description: '700 receitas exclusivas de bolos, tortas e sobremesas para vender e lucrar imediatamente. Do basico ao avancado, com suporte diario.',
    audience: 'Mulheres empreendedoras, confeiteiras, donas de casa',
    ageRange: '25-55 anos',
    dailySales: 'R$100 - R$300/dia',
    affiliateUrl: 'https://dashboard.kiwify.com.br/marketplace?product=0q6lmkEh',
    siteUrl: 'https://vida-nova-oficial.com/?page_id=992',
    driveUrl: 'https://drive.google.com/drive/folders/15x3aNoA-rtQFu18oIaDx0ge6QFnfoQT3?usp=drive_link',
    image: 'https://vida-nova-oficial.com/wp-content/uploads/2024/04/Design_sem_nome__41_-removebg.png',
    color: '#f97316',
    colorBg: 'rgba(249,115,22,0.08)',
  },
]

const physicalProducts = [
  {
    id: 'progressiva-vegetal',
    name: 'Progressiva Vegetal Creme',
    platform: 'logzz',
    category: 'Beleza e Cabelo',
    description: 'Progressiva vegetal em creme, alta demanda no publico feminino. Venda direta por WhatsApp, sem necessidade de pagina de vendas.',
    audience: 'Mulheres, saloes de beleza, revendedoras',
    ageRange: '20-50 anos',
    dailySales: 'Alta demanda',
    affiliateUrl: 'https://app.logzz.com.br/loja/produto/2494',
    driveUrl: 'https://drive.google.com/drive/folders/1xZaqXR5C61ioZEaj_vfmDbdUIvgWFrRl',
    whatsappGroupUrl: 'https://chat.whatsapp.com/I0qU6lHleqP2tcqBJUNfjk',
    soldViaWhatsapp: true,
    image: 'https://logzz-s3.s3.us-east-2.amazonaws.com/uploads/files/products/prok9x6e/img_0_20251113-202321.webp',
    color: '#14b8a6',
    colorBg: 'rgba(20,184,166,0.08)',
  },
  {
    id: 'escova-alisadora',
    name: 'Escova Alisadora 3 em 1',
    platform: 'logzz',
    category: 'Beleza e Cabelo',
    description: 'Escova alisadora eletrica 3 em 1, muito procurada para modelar, secar e alisar. Venda direta por WhatsApp.',
    audience: 'Mulheres, saloes de beleza, revendedoras',
    ageRange: '18-50 anos',
    dailySales: 'Alta demanda',
    affiliateUrl: 'https://app.logzz.com.br/loja/produto/2203',
    driveUrl: '',
    whatsappGroupUrl: 'https://chat.whatsapp.com/GOlEOLyoXy54dc6hOLDWAZ',
    soldViaWhatsapp: true,
    image: 'https://logzz-s3.s3.us-east-2.amazonaws.com/uploads/files/products/20260225-001026prommyom.jpg',
    color: '#f43f5e',
    colorBg: 'rgba(244,63,94,0.08)',
  },
  {
    id: 'caneta-depiladora',
    name: 'Caneta Depilador Eletrico',
    platform: 'logzz',
    category: 'Beleza e Cuidados',
    description: 'Depilador eletrico portatil em formato de caneta, indolor e pratico. Venda direta por WhatsApp.',
    audience: 'Mulheres, publico geral, revendedoras',
    ageRange: '18-45 anos',
    dailySales: 'Alta demanda',
    affiliateUrl: 'https://app.logzz.com.br/loja/produto/17751',
    driveUrl: 'https://drive.google.com/drive/folders/1ZwlHWPVCXHjW3B_4fNm1RrjdgfXZkt3k?usp=sharing',
    whatsappGroupUrl: 'https://chat.whatsapp.com/Gt4V0wucTA28QwfwBsPZOk',
    soldViaWhatsapp: true,
    image: '/produtos/caneta-depiladora.png',
    color: '#8b5cf6',
    colorBg: 'rgba(139,92,246,0.08)',
  },
]

const platformColors: Record<string, { bg: string; text: string; label: string }> = {
  cakto: { bg: 'rgba(124,92,252,0.12)', text: '#7c5cfc', label: 'CAKTO' },
  kiwify: { bg: 'rgba(34,197,94,0.12)', text: '#16a34a', label: 'KIWIFY' },
  logzz: { bg: 'rgba(245,158,11,0.12)', text: '#d97706', label: 'LOGZZ' },
}

function ProductCard({ product, selected, onToggle }: { product: any; selected: boolean; onToggle: () => void }) {
  const plat = platformColors[product.platform]

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '2px solid ' + (selected ? product.color : 'var(--border)'),
        borderRadius: 18,
        overflow: 'hidden',
        transition: 'all 0.25s',
        cursor: 'pointer',
        transform: selected ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: selected ? '0 16px 40px rgba(0,0,0,0.12)' : 'var(--shadow-sm)',
        flex: '0 0 290px',
        scrollSnapAlign: 'start',
      }}
      onClick={onToggle}
    >
      {/* Imagem do produto */}
      <div style={{ position: 'relative', height: 170, overflow: 'hidden', background: product.colorBg }}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            onError={function(e: any) { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
            {product.platform === 'logzz' ? '📦' : '🛒'}
          </div>
        )}
        <div style={{ position: 'absolute', top: 12, left: 12, background: plat.bg, border: '1px solid ' + plat.text + '44', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: plat.text, backdropFilter: 'blur(8px)' }}>
          {plat.label}
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(22,163,74,0.9)', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#fff' }}>
          {product.dailySales}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800 }}>{product.name}</span>
        </div>
        <div style={{ fontSize: 11, background: product.colorBg, border: '1px solid ' + product.color + '33', color: product.color, borderRadius: 99, padding: '2px 10px', fontWeight: 600, display: 'inline-block', marginBottom: 10 }}>
          {product.category}
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted2)', margin: '0 0 12px', lineHeight: 1.6 }}>{product.description}</p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '4px 8px', fontSize: 11 }}>👥 {product.ageRange}</div>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '4px 8px', fontSize: 11 }}>🎯 {product.audience.split(',')[0]}</div>
        </div>

        {product.soldViaWhatsapp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 9, padding: '7px 10px', marginBottom: 10 }}>
            <i className="ti ti-brand-whatsapp" style={{ color: '#16a34a', fontSize: 15, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, lineHeight: 1.4 }}>Este produto nao tem pagina de vendas — a venda e feita direto pelo WhatsApp</span>
          </div>
        )}

        {/* Botoes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noreferrer"
            onClick={function(e) { e.stopPropagation() }}
            style={{ background: 'linear-gradient(135deg, ' + product.color + ', ' + product.color + 'bb)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px', borderRadius: 10, textDecoration: 'none', textAlign: 'center', display: 'block', boxShadow: '0 4px 12px ' + product.color + '33' }}
          >
            🤝 Quero me afiliar
          </a>
          <div style={{ display: 'flex', gap: 6 }}>
            {product.siteUrl && (
              <a
                href={product.siteUrl}
                target="_blank"
                rel="noreferrer"
                onClick={function(e) { e.stopPropagation() }}
                style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 11, padding: '8px', borderRadius: 8, textDecoration: 'none', textAlign: 'center', display: 'block' }}
              >
                🌐 Ver site
              </a>
            )}
            {product.whatsappGroupUrl && (
              <a
                href={product.whatsappGroupUrl}
                target="_blank"
                rel="noreferrer"
                onClick={function(e) { e.stopPropagation() }}
                style={{ flex: 1, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', color: '#16a34a', fontWeight: 600, fontSize: 11, padding: '8px', borderRadius: 8, textDecoration: 'none', textAlign: 'center', display: 'block' }}
              >
                <i className="ti ti-brand-whatsapp" style={{ marginRight: 4 }} />Grupo
              </a>
            )}
            {product.driveUrl && (
              <a
                href={product.driveUrl}
                target="_blank"
                rel="noreferrer"
                onClick={function(e) { e.stopPropagation() }}
                style={{ flex: 1, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontWeight: 600, fontSize: 11, padding: '8px', borderRadius: 8, textDecoration: 'none', textAlign: 'center', display: 'block' }}
              >
                📁 Material
              </a>
            )}
          </div>
        </div>

        {selected && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🎬</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Aula de afiliacao em breve</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductCarousel({ title, icon, products, selected, onToggle }: { title: string; icon: string; products: any[]; selected: string | null; onToggle: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: number) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * 310, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, margin: 0 }}>{title}</h2>
          <span style={{ fontSize: 11, color: 'var(--muted2)', background: 'var(--surface2)', borderRadius: 99, padding: '2px 9px' }}>{products.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={function() { scroll(-1) }}
            aria-label="Anterior"
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-chevron-left" />
          </button>
          <button
            onClick={function() { scroll(1) }}
            aria-label="Proximo"
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 18, overflowX: 'auto', scrollSnapType: 'x mandatory',
          paddingBottom: 10, marginBottom: -10,
          scrollbarWidth: 'none',
        }}
      >
        {products.map(function(product) {
          return (
            <ProductCard
              key={product.id}
              product={product}
              selected={selected === product.id}
              onToggle={function() { onToggle(product.id) }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function ProdutosAltaPage() {
  const [selected, setSelected] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected(function(s) { return s === id ? null : id })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 28 }}>🔥</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Produtos em Alta</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted2)', margin: 0 }}>
            Arraste para o lado para ver mais opcoes. Escolha um produto, se afilie e comece a vender hoje mesmo
          </p>
        </div>

        {/* Passo a passo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 36 }}>
          {[
            { num: '1', label: 'Escolha o produto', icon: '🎯' },
            { num: '2', label: 'Acesse o material', icon: '📦' },
            { num: '3', label: 'Comece a vender', icon: '💰' },
          ].map(function(step) {
            return (
              <div key={step.num} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{step.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Passo {step.num}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{step.label}</div>
              </div>
            )
          })}
        </div>

        {/* Carrossel: Produtos Digitais */}
        <ProductCarousel title="Produtos Digitais" icon="💻" products={digitalProducts} selected={selected} onToggle={toggle} />

        {/* Carrossel: Produtos Fisicos */}
        <ProductCarousel title="Produtos Fisicos" icon="📦" products={physicalProducts} selected={selected} onToggle={toggle} />

        {/* Dica */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
          <div style={{ fontSize: 32 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Dica importante</div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
              Use o Criador de Criativos e o Gerador de Ebook do MCP.IA para criar seu material de divulgacao e vender muito mais rapido!
            </p>
          </div>
        </div>

        {/* Barra de novos produtos em breve */}
        <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.08))', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: '18px 24px', boxShadow: '0 4px 16px rgba(239,68,68,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, animation: 'pulseEmoji 1.5s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Procurando novos produtos</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #ef4444, #ec4899)', borderRadius: 99, padding: '4px 12px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>🔥 Em breve</span>
          </div>
          <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: '65%',
              background: 'linear-gradient(90deg, #f59e0b, #ef4444, #ec4899, #f59e0b)',
              backgroundSize: '300% 100%',
              borderRadius: 99,
              animation: 'buscando 1.8s ease-in-out infinite',
              boxShadow: '0 0 12px rgba(239,68,68,0.5)',
            }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, margin: '8px 0 0' }}>Novos produtos digitais e fisicos serao adicionados em breve nos carrosseis. Fique ligado!</p>
        </div>

        <style>{`
          @keyframes buscando {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
          @keyframes pulseEmoji {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.3); }
          }
        `}</style>

      </div>
    </div>
  )
}
