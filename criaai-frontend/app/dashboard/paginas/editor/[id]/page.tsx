'use client'
// criaai-frontend/app/dashboard/paginas/editor/[id]/page.tsx

import { useState, useEffect } from 'react'

interface Section {
  id: string
  type: 'hero' | 'benefits' | 'testimonials' | 'bonus' | 'guarantee' | 'cta' | 'image'
  visible: boolean
  data: any
}

interface ImageItem {
  id: string
  url: string
  thumb: string
  small: string
  alt: string
  author: string
}

const sectionLabels: Record<string, string> = {
  hero: '🎯 Hero',
  benefits: '✅ Benefícios',
  testimonials: '⭐ Depoimentos',
  bonus: '🎁 Bônus',
  guarantee: '🛡️ Garantia',
  cta: '🚀 CTA Final',
  image: '🖼️ Imagem',
}

function DragHandle() {
  return (
    <div style={{ cursor: 'grab', padding: '0 8px', color: '#555', fontSize: 18, userSelect: 'none' }}>
      ⠿
    </div>
  )
}

function ImagePicker({ images, selected, onSelect, onSearch }: {
  images: ImageItem[]
  selected: string
  onSelect: (url: string) => void
  onSearch: (q: string) => void
}) {
  const [query, setQuery] = useState('')
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar imagens..."
          onKeyDown={e => e.key === 'Enter' && onSearch(query)}
          style={{ flex: 1, background: '#0a120a', border: '1px solid #1e3a1e', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
        />
        <button
          onClick={() => onSearch(query)}
          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Buscar
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {images.map(img => (
          <div
            key={img.id}
            onClick={() => onSelect(img.url)}
            style={{
              borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
              border: selected === img.url ? '2px solid #4ade80' : '2px solid transparent',
              aspectRatio: '16/9', background: '#111',
            }}
          >
            <img src={img.small} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
      {images.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
          Nenhuma imagem encontrada. Tente outra busca.
        </p>
      )}
    </div>
  )
}

function SectionEditor({ section, images, onUpdate, onSearchImages }: {
  section: Section
  images: ImageItem[]
  onUpdate: (data: any) => void
  onSearchImages: (q: string) => void
}) {
  const inp = (style?: any): React.CSSProperties => ({
    width: '100%', background: '#0a120a', border: '1px solid #1e3a1e',
    borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13,
    outline: 'none', boxSizing: 'border-box', ...style,
  })
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, fontWeight: 500 }

  const field = (label: string, key: string, multiline = false, rows = 3) => (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      {multiline
        ? <textarea value={section.data[key] || ''} onChange={e => onUpdate({ ...section.data, [key]: e.target.value })} rows={rows} style={{ ...inp(), resize: 'vertical' }} />
        : <input type="text" value={section.data[key] || ''} onChange={e => onUpdate({ ...section.data, [key]: e.target.value })} style={inp()} />
      }
    </div>
  )

  if (section.type === 'hero') return (
    <div>
      {field('Título principal', 'title')}
      {field('Subtítulo', 'subtitle', true, 2)}
      {field('Texto do botão', 'btnText')}
      {field('Link do botão (checkout)', 'btnUrl')}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Tag acima do título (ex: "PARA MULHERES")</label>
        <input type="text" value={section.data.tag || ''} onChange={e => onUpdate({ ...section.data, tag: e.target.value })} style={inp()} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Imagem de fundo</label>
        {section.data.image && (
          <img src={section.data.image} alt="hero" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 120, objectFit: 'cover' }} />
        )}
        <ImagePicker images={images} selected={section.data.image || ''} onSelect={url => onUpdate({ ...section.data, image: url })} onSearch={onSearchImages} />
      </div>
    </div>
  )

  if (section.type === 'benefits') return (
    <div>
      {field('Título da seção', 'title')}
      {(section.data.items || ['', '', '']).map((item: string, i: number) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <label style={lbl}>Benefício {i + 1}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={item}
              onChange={e => {
                const items = [...(section.data.items || ['', '', ''])]
                items[i] = e.target.value
                onUpdate({ ...section.data, items })
              }}
              style={{ ...inp(), flex: 1 }}
            />
            {i >= 2 && (
              <button
                onClick={() => {
                  const items = (section.data.items || []).filter((_: any, idx: number) => idx !== i)
                  onUpdate({ ...section.data, items })
                }}
                style={{ background: '#1a0a0a', border: '1px solid #3a1e1e', color: '#f87171', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 16 }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
      {(section.data.items || []).length < 7 && (
        <button
          onClick={() => onUpdate({ ...section.data, items: [...(section.data.items || []), ''] })}
          style={{ background: 'none', border: '1px dashed #1e3a1e', borderRadius: 8, padding: '8px 14px', color: '#6b7280', fontSize: 12, cursor: 'pointer', width: '100%' }}
        >
          + Adicionar benefício
        </button>
      )}
    </div>
  )

  if (section.type === 'testimonials') return (
    <div>
      {field('Título da seção', 'title')}
      {(section.data.items || [{ name: '', role: '', text: '', stars: 5 }]).map((item: any, i: number) => (
        <div key={i} style={{ background: '#0a120a', border: '1px solid #1e3a1e', borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <label style={{ ...lbl, marginBottom: 8 }}>Depoimento {i + 1}</label>
          <input type="text" placeholder="Nome" value={item.name || ''} onChange={e => {
            const items = [...(section.data.items || [])]
            items[i] = { ...items[i], name: e.target.value }
            onUpdate({ ...section.data, items })
          }} style={{ ...inp(), marginBottom: 6 }} />
          <input type="text" placeholder="Cargo / Cidade" value={item.role || ''} onChange={e => {
            const items = [...(section.data.items || [])]
            items[i] = { ...items[i], role: e.target.value }
            onUpdate({ ...section.data, items })
          }} style={{ ...inp(), marginBottom: 6 }} />
          <textarea placeholder="Texto do depoimento" value={item.text || ''} rows={2} onChange={e => {
            const items = [...(section.data.items || [])]
            items[i] = { ...items[i], text: e.target.value }
            onUpdate({ ...section.data, items })
          }} style={{ ...inp(), resize: 'none' }} />
          {i >= 1 && (
            <button onClick={() => {
              const items = (section.data.items || []).filter((_: any, idx: number) => idx !== i)
              onUpdate({ ...section.data, items })
            }} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer', marginTop: 6 }}>
              Remover
            </button>
          )}
        </div>
      ))}
      {(section.data.items || []).length < 6 && (
        <button
          onClick={() => onUpdate({ ...section.data, items: [...(section.data.items || []), { name: '', role: '', text: '', stars: 5 }] })}
          style={{ background: 'none', border: '1px dashed #1e3a1e', borderRadius: 8, padding: '8px 14px', color: '#6b7280', fontSize: 12, cursor: 'pointer', width: '100%' }}
        >
          + Adicionar depoimento
        </button>
      )}
    </div>
  )

  if (section.type === 'bonus') return (
    <div>
      {field('Título da seção', 'title')}
      {field('Descrição do bônus', 'text', true, 3)}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Imagem do bônus</label>
        {section.data.image && (
          <img src={section.data.image} alt="bonus" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 100, objectFit: 'cover' }} />
        )}
        <ImagePicker images={images} selected={section.data.image || ''} onSelect={url => onUpdate({ ...section.data, image: url })} onSearch={onSearchImages} />
      </div>
    </div>
  )

  if (section.type === 'guarantee') return (
    <div>
      {field('Título da garantia', 'title')}
      {field('Texto da garantia', 'text', true, 3)}
      {field('Dias de garantia (ex: 7)', 'days')}
    </div>
  )

  if (section.type === 'cta') return (
    <div>
      {field('Título do CTA', 'title')}
      {field('Subtítulo', 'subtitle')}
      {field('Texto do botão', 'btnText')}
      {field('Link do botão (checkout)', 'btnUrl')}
      {field('Nota abaixo do botão', 'note')}
    </div>
  )

  if (section.type === 'image') return (
    <div>
      {field('Legenda da imagem (opcional)', 'caption')}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Imagem</label>
        {section.data.image && (
          <img src={section.data.image} alt="section" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 120, objectFit: 'cover' }} />
        )}
        <ImagePicker images={images} selected={section.data.image || ''} onSelect={url => onUpdate({ ...section.data, image: url })} onSearch={onSearchImages} />
      </div>
    </div>
  )

  return null
}

function PagePreview({ sections, theme }: { sections: Section[], theme: string }) {
  const isDark = theme === 'dark'
  const bg = isDark ? '#0f0f0f' : '#f8f7ff'
  const text = isDark ? '#f1f1f1' : '#1a1a2e'
  const accent = '#7c5cfc'
  const card = isDark ? '#1a1a2a' : '#ffffff'
  const border = isDark ? '#2a2a3a' : '#e5e7eb'
  const visible = sections.filter(s => s.visible)

  return (
    <div style={{ background: bg, color: text, fontFamily: 'DM Sans, sans-serif', minHeight: '100%', overflowY: 'auto' }}>
      {visible.map(section => {
        if (section.type === 'hero') return (
          <div key={section.id} style={{ position: 'relative', minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', textAlign: 'center', background: section.data.image ? 'transparent' : `linear-gradient(135deg, ${isDark ? '#1a0a2e' : '#f0ecff'}, ${isDark ? '#0a1a2e' : '#e8f4ff'})`, overflow: 'hidden' }}>
            {section.data.image && (
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${section.data.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.35)' }} />
            )}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
              {section.data.tag && (
                <div style={{ display: 'inline-block', background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 99, padding: '4px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#a78bfa', marginBottom: 16 }}>
                  + {section.data.tag}
                </div>
              )}
              <h1 style={{ fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 900, lineHeight: 1.15, marginBottom: 16, color: section.data.image ? '#fff' : text }}>
                {section.data.title || 'Título principal'}
              </h1>
              <p style={{ fontSize: 16, color: section.data.image ? 'rgba(255,255,255,0.8)' : (isDark ? '#aaa' : '#555'), marginBottom: 32, lineHeight: 1.6 }}>
                {section.data.subtitle || 'Subtítulo aqui'}
              </p>
              {section.data.btnText && (
                <a href={section.data.btnUrl || '#'} style={{ display: 'inline-block', background: accent, color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
                  ✦ {section.data.btnText}
                </a>
              )}
            </div>
          </div>
        )

        if (section.type === 'benefits') return (
          <div key={section.id} style={{ padding: '48px 32px', maxWidth: 700, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: accent, marginBottom: 8, textTransform: 'uppercase' }}>O QUE VOCÊ VAI RECEBER</p>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 28 }}>{section.data.title || 'Benefícios'}</h2>
            {(section.data.items || []).filter((i: string) => i).map((item: string, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: card, border: `1px solid ${border}`, borderRadius: 12, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, background: accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, color: '#fff' }}>✓</div>
                <span style={{ fontSize: 15 }}>{item}</span>
              </div>
            ))}
          </div>
        )

        if (section.type === 'testimonials') return (
          <div key={section.id} style={{ padding: '48px 32px', background: isDark ? '#0a0a1a' : '#f3f0ff' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: accent, marginBottom: 8, textTransform: 'uppercase' }}>DEPOIMENTOS</p>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 28 }}>{section.data.title || 'O que dizem nossos clientes'}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {(section.data.items || []).filter((i: any) => i.text).map((item: any, idx: number) => (
                  <div key={idx} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '20px' }}>
                    <div style={{ color: '#f59e0b', fontSize: 14, marginBottom: 10 }}>★★★★★</div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: isDark ? '#ccc' : '#444', marginBottom: 14, fontStyle: 'italic' }}>"{item.text}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, background: accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                        {(item.name || 'A')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: isDark ? '#888' : '#777' }}>{item.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

        if (section.type === 'bonus') return (
          <div key={section.id} style={{ padding: '48px 32px', maxWidth: 700, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: accent, marginBottom: 8, textTransform: 'uppercase' }}>BÔNUS EXCLUSIVO</p>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>{section.data.title || 'Bônus'}</h2>
            {section.data.image && (
              <img src={section.data.image} alt="bonus" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 200, objectFit: 'cover' }} />
            )}
            <p style={{ fontSize: 16, lineHeight: 1.7, color: isDark ? '#ccc' : '#555' }}>{section.data.text}</p>
          </div>
        )

        if (section.type === 'guarantee') return (
          <div key={section.id} style={{ padding: '48px 32px', background: isDark ? '#0a1a0a' : '#f0fff4' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>{section.data.title || 'Garantia'}</h2>
              {section.data.days && (
                <div style={{ display: 'inline-block', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 99, padding: '6px 20px', fontSize: 14, fontWeight: 700, color: '#16a34a', marginBottom: 16 }}>
                  {section.data.days} dias de garantia
                </div>
              )}
              <p style={{ fontSize: 16, lineHeight: 1.7, color: isDark ? '#ccc' : '#555' }}>{section.data.text}</p>
            </div>
          </div>
        )

        if (section.type === 'cta') return (
          <div key={section.id} style={{ padding: '64px 32px', background: `linear-gradient(135deg, ${isDark ? '#1a0a2e' : '#f0ecff'}, ${isDark ? '#0a1a2e' : '#e8f4ff'})`, textAlign: 'center' }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12 }}>{section.data.title || 'Pronto para começar?'}</h2>
            <p style={{ fontSize: 16, color: isDark ? '#aaa' : '#666', marginBottom: 32 }}>{section.data.subtitle}</p>
            {section.data.btnText && (
              <a href={section.data.btnUrl || '#'} style={{ display: 'inline-block', background: accent, color: '#fff', padding: '16px 40px', borderRadius: 14, fontWeight: 800, fontSize: 18, textDecoration: 'none' }}>
                ✦ {section.data.btnText}
              </a>
            )}
            {section.data.note && (
              <p style={{ fontSize: 13, color: isDark ? '#888' : '#888', marginTop: 14 }}>🔒 {section.data.note}</p>
            )}
          </div>
        )

        if (section.type === 'image') return (
          <div key={section.id} style={{ padding: '32px', maxWidth: 700, margin: '0 auto' }}>
            {section.data.image && (
              <img src={section.data.image} alt={section.data.caption || ''} style={{ width: '100%', borderRadius: 14, objectFit: 'cover', maxHeight: 320 }} />
            )}
            {section.data.caption && (
              <p style={{ fontSize: 13, color: isDark ? '#888' : '#888', textAlign: 'center', marginTop: 8 }}>{section.data.caption}</p>
            )}
          </div>
        )

        return null
      })}
    </div>
  )
}

export default function PageEditorPage({ params }: { params: { id: string } }) {
  const [sections, setSections] = useState<Section[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [pageData, setPageData] = useState<any>(null)
  const [images, setImages] = useState<ImageItem[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => { loadPage() }, [params.id])

  async function loadPage() {
    const pageRes = await fetch('/api/get-page?id=' + params.id)
    const data = await pageRes.json()
    if (data.page) {
      setPageData(data.page)
      setTheme(data.page.theme || 'light')
      if (data.page.sections && Array.isArray(data.page.sections)) {
        setSections(data.page.sections)
      } else {
        setSections(buildDefaultSections(data.page))
      }
      loadImages(data.page.product_name || 'business success')
    }
  }

  function buildDefaultSections(page: any): Section[] {
    return [
      { id: 'hero', type: 'hero', visible: true, data: { title: page.product_name || 'Título principal', subtitle: 'Transforme sua vida com este produto incrível', btnText: 'Garanta seu acesso agora', btnUrl: page.checkout_url || '#', tag: page.audience || '', image: '' } },
      { id: 'benefits', type: 'benefits', visible: true, data: { title: 'Vantagens do nosso produto', items: (page.benefits || []).slice(0, 5) } },
      { id: 'testimonials', type: 'testimonials', visible: true, data: { title: 'O que dizem nossos clientes', items: [ { name: 'Ana Silva', role: 'Nutricionista, São Paulo', text: 'Produto incrível! Mudou completamente minha rotina.', stars: 5 }, { name: 'Maria Oliveira', role: 'Mãe, Rio de Janeiro', text: 'Recomendo para todos. Resultado em poucos dias!', stars: 5 }, { name: 'Julia Costa', role: 'Empresária, Belo Horizonte', text: 'Melhor investimento que fiz esse ano.', stars: 5 } ] } },
      { id: 'bonus', type: 'bonus', visible: !!(page.bonus), data: { title: 'Bônus exclusivo', text: page.bonus || '', image: '' } },
      { id: 'guarantee', type: 'guarantee', visible: !!(page.guarantee), data: { title: 'Garantia incondicional', text: page.guarantee || '7 dias de garantia. Se não gostar, devolvemos 100% do seu dinheiro.', days: '7' } },
      { id: 'cta', type: 'cta', visible: true, data: { title: 'Pronto para transformar sua vida?', subtitle: 'Não perca mais tempo. Garanta agora mesmo!', btnText: 'Quero começar agora', btnUrl: page.checkout_url || '#', note: 'Compra 100% segura · Acesso imediato' } },
    ]
  }

  async function loadImages(query: string) {
    try {
      const res = await fetch('/api/unsplash-images?query=' + encodeURIComponent(query) + '&count=9')
      const data = await res.json()
      setImages(data.images || [])
    } catch (err) {
      console.error('Erro ao buscar imagens:', err)
    }
  }

  function updateSection(id: string, data: any) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, data } : s))
    setSaved(false)
  }

  function toggleVisible(id: string) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s))
    setSaved(false)
  }

  function addSection(type: Section['type']) {
    const newSection: Section = {
      id: type + '-' + Date.now(), type, visible: true,
      data: type === 'image' ? { image: '', caption: '' } : { title: sectionLabels[type] },
    }
    setSections(prev => [...prev, newSection])
    setActiveSection(newSection.id)
    setSaved(false)
  }

  function removeSection(id: string) {
    setSections(prev => prev.filter(s => s.id !== id))
    if (activeSection === id) setActiveSection(null)
    setSaved(false)
  }

  function handleDragStart(id: string) { setDragging(id) }
  function handleDragOver(e: React.DragEvent, id: string) { e.preventDefault(); setDragOver(id) }
  function handleDrop(targetId: string) {
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return }
    setSections(prev => {
      const arr = [...prev]
      const fromIdx = arr.findIndex(s => s.id === dragging)
      const toIdx = arr.findIndex(s => s.id === targetId)
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
    setDragging(null); setDragOver(null); setSaved(false)
  }

  async function save() {
    if (!pageData) return
    setSaving(true)
    try {
      await fetch('/api/save-page-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.id, sections, theme }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site'

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0f0a', color: '#fff', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden' }}>

      {/* Painel esquerdo — lista de seções */}
      <div style={{ width: 280, background: '#0d150d', borderRight: '1px solid #1a2e1a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a2e1a' }}>
          <a href="/dashboard/paginas" style={{ color: '#6b7280', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>← Voltar</a>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Editor de Seções</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Arraste para reordenar</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {sections.map(section => (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={e => handleDragOver(e, section.id)}
              onDrop={() => handleDrop(section.id)}
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                background: activeSection === section.id ? '#1a3a1a' : dragOver === section.id ? '#1a2e1a' : '#0f1a0f',
                border: activeSection === section.id ? '1px solid #4ade80' : '1px solid #1a2e1a',
                transition: 'all 0.15s', opacity: section.visible ? 1 : 0.5,
              }}
            >
              <DragHandle />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{sectionLabels[section.type]}</span>
              <button onClick={e => { e.stopPropagation(); toggleVisible(section.id) }} style={{ background: 'none', border: 'none', color: section.visible ? '#4ade80' : '#6b7280', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>
                {section.visible ? '👁' : '🙈'}
              </button>
              <button onClick={e => { e.stopPropagation(); removeSection(section.id) }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid #1a2e1a' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>+ ADICIONAR SEÇÃO</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(['image', 'cta', 'testimonials'] as Section['type'][]).map(type => (
              <button key={type} onClick={() => addSection(type)} style={{ background: '#0f1a0f', border: '1px solid #1a2e1a', borderRadius: 8, padding: '5px 10px', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
                {sectionLabels[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Painel central — editor da seção ativa */}
      <div style={{ width: 340, background: '#0a0f0a', borderRight: '1px solid #1a2e1a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {activeSection ? sectionLabels[sections.find(s => s.id === activeSection)?.type || 'hero'] : 'Selecione uma seção'}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Edite o conteúdo abaixo</div>
          </div>
          <select value={theme} onChange={e => { setTheme(e.target.value as 'light' | 'dark'); setSaved(false) }} style={{ background: '#0d150d', border: '1px solid #1a2e1a', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none' }}>
            <option value="light">☀️ Claro</option>
            <option value="dark">🌙 Escuro</option>
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeSection ? (
            <SectionEditor
              section={sections.find(s => s.id === activeSection)!}
              images={images}
              onUpdate={data => updateSection(activeSection, data)}
              onSearchImages={loadImages}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', textAlign: 'center', gap: 8 }}>
              <div style={{ fontSize: 32 }}>←</div>
              <div style={{ fontSize: 14 }}>Clique em uma seção para editar</div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1a2e1a', display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ flex: 1, padding: '10px', background: saved ? '#16a34a' : 'linear-gradient(135deg, #16a34a, #4ade80)', color: '#0a0f0a', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saving ? 'Salvando...' : saved ? '✓ Salvo!' : '💾 Salvar'}
          </button>
          {pageData && (
            <a href={`${APP_URL}/p/${pageData.slug}`} target="_blank" rel="noreferrer" style={{ padding: '10px 14px', background: '#0d150d', border: '1px solid #1a2e1a', borderRadius: 10, color: '#4ade80', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              🔗
            </a>
          )}
        </div>
      </div>

      {/* Painel direito — preview */}
      <div style={{ flex: 1, background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Preview em tempo real</div>
          <div style={{ flex: 1, background: '#1a1a1a', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#888' }}>
            {APP_URL}/p/{pageData?.slug || '...'}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: '#1a1a1a', padding: 16 }}>
          <div style={{ background: theme === 'dark' ? '#0f0f0f' : '#fff', borderRadius: 12, overflow: 'hidden', minHeight: '100%', boxShadow: '0 4px 40px rgba(0,0,0,0.4)' }}>
            <PagePreview sections={sections} theme={theme} />
          </div>
        </div>
      </div>

    </div>
  )
}
