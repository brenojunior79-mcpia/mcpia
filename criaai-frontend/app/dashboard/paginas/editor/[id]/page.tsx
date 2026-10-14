'use client'
// Editor de paginas: lista de secoes, formulario da secao e preview real (a mesma pagina que vai pro ar).

import { useState, useEffect, useRef } from 'react'
import { renderSalesPage, normalizeSections, newSection, SECTION_LABELS, Section, SectionType, DEFAULT_ACCENT } from '@/lib/sales-page'

interface ImageItem { id: string; url: string; thumb: string; small: string; alt: string; author: string }

const ACCENTS = ['#7c5cfc', '#2563eb', '#16a34a', '#ea580c', '#e11d48', '#0f766e']
const ADDABLE: SectionType[] = ['media', 'contents', 'painText', 'testimonials', 'howto', 'bonus', 'offer', 'guarantee', 'faq', 'cta', 'image']

const inp: React.CSSProperties = { width: '100%', background: '#0a120a', border: '1px solid #1e3a1e', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, fontWeight: 500 }
const addBtn: React.CSSProperties = { background: 'none', border: '1px dashed #1e3a1e', borderRadius: 8, padding: '8px 14px', color: '#6b7280', fontSize: 12, cursor: 'pointer', width: '100%' }
const delBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer', marginTop: 6 }
const box: React.CSSProperties = { background: '#0a120a', border: '1px solid #1e3a1e', borderRadius: 10, padding: 12, marginBottom: 10 }

function DragHandle() {
  return <div style={{ cursor: 'grab', padding: '0 8px', color: '#555', fontSize: 18, userSelect: 'none' }}>⠿</div>
}

function ImagePicker({ images, selected, onSelect, onSearch }: { images: ImageItem[]; selected: string; onSelect: (url: string) => void; onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('')
  return (
    <div style={{ marginTop: 10 }}>
      <input value={selected && selected.length < 400 ? selected : ''} onChange={e => onSelect(e.target.value)} placeholder="Cole o link de uma imagem (https://...)" style={{ ...inp, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ou busque uma foto..." onKeyDown={e => e.key === 'Enter' && onSearch(query)} style={{ ...inp, flex: 1 }} />
        <button onClick={() => onSearch(query)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Buscar</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {images.map(img => (
          <div key={img.id} onClick={() => onSelect(img.url)} style={{ borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: selected === img.url ? '2px solid #4ade80' : '2px solid transparent', aspectRatio: '16/9', background: '#111' }}>
            <img src={img.small} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionForm({ section, images, onUpdate, onSearchImages }: { section: Section; images: ImageItem[]; onUpdate: (data: any) => void; onSearchImages: (q: string) => void }) {
  const d = section.data || {}
  const set = (key: string, value: any) => onUpdate({ ...d, [key]: value })

  const text = (label: string, key: string, hint?: string) => (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <input type="text" value={d[key] || ''} onChange={e => set(key, e.target.value)} style={inp} />
      {hint && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{hint}</div>}
    </div>
  )
  const area = (label: string, key: string, rows = 3, hint?: string) => (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <textarea value={d[key] || ''} onChange={e => set(key, e.target.value)} rows={rows} style={{ ...inp, resize: 'vertical' }} />
      {hint && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{hint}</div>}
    </div>
  )

  // lista de textos simples
  const strList = (label: string, key: string, max: number, addLabel: string) => {
    const items: string[] = d[key] || []
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>{label}</label>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="text" value={it} onChange={e => { const n = [...items]; n[i] = e.target.value; set(key, n) }} style={{ ...inp, flex: 1 }} />
            <button onClick={() => set(key, items.filter((_, idx) => idx !== i))} style={{ background: '#1a0a0a', border: '1px solid #3a1e1e', color: '#f87171', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        ))}
        {items.length < max && <button onClick={() => set(key, [...items, ''])} style={addBtn}>+ {addLabel}</button>}
      </div>
    )
  }

  // lista de itens com varios campos
  const objList = (label: string, key: string, max: number, addLabel: string, fields: { k: string; label: string; area?: boolean }[], blank: any) => {
    const items: any[] = d[key] || []
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>{label}</label>
        {items.map((it, i) => (
          <div key={i} style={box}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>#{i + 1}</div>
            {fields.map(f => f.area
              ? <textarea key={f.k} placeholder={f.label} value={it[f.k] || ''} rows={2} onChange={e => { const n = [...items]; n[i] = { ...n[i], [f.k]: e.target.value }; set(key, n) }} style={{ ...inp, resize: 'vertical', marginBottom: 6 }} />
              : <input key={f.k} type="text" placeholder={f.label} value={it[f.k] || ''} onChange={e => { const n = [...items]; n[i] = { ...n[i], [f.k]: e.target.value }; set(key, n) }} style={{ ...inp, marginBottom: 6 }} />
            )}
            <button onClick={() => set(key, items.filter((_, idx) => idx !== i))} style={delBtn}>Remover</button>
          </div>
        ))}
        {items.length < max && <button onClick={() => set(key, [...items, { ...blank }])} style={addBtn}>+ {addLabel}</button>}
      </div>
    )
  }

  switch (section.type) {
    case 'headline': return (
      <div>
        {text('Faixa no topo da página (opcional)', 'topBar', 'Ex: Frete grátis só hoje. Só use se for verdade.')}
        {text('Frase acima do título', 'tag')}
        {area('Headline (título principal)', 'title', 2, 'Use **duas estrelas** para destacar uma palavra.')}
        {area('Subtítulo', 'subtitle', 3)}
        {text('Texto do botão', 'btnText')}
        {text('Link do botão (checkout)', 'btnUrl')}
        {text('Texto abaixo do botão', 'note')}
      </div>
    )
    case 'media': return (
      <div>
        <label style={lbl}>O que mostrar</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[{ id: 'image', n: 'Imagem' }, { id: 'video', n: 'Vídeo' }, { id: 'none', n: 'Nada' }].map(o => (
            <button key={o.id} onClick={() => set('mode', o.id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid ' + (d.mode === o.id ? '#4ade80' : '#1e3a1e'), background: d.mode === o.id ? '#1a3a1a' : '#0a120a', color: '#fff', cursor: 'pointer', fontSize: 13 }}>{o.n}</button>
          ))}
        </div>
        {d.mode === 'video' && text('Link do vídeo (YouTube, Vimeo ou .mp4)', 'videoUrl')}
        {d.mode === 'image' && (
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Imagem</label>
            {d.image && <img src={d.image} alt="" style={{ width: '100%', borderRadius: 8, maxHeight: 140, objectFit: 'cover' }} />}
            <ImagePicker images={images} selected={d.image || ''} onSelect={url => set('image', url)} onSearch={onSearchImages} />
          </div>
        )}
        {text('Legenda (opcional)', 'caption')}
      </div>
    )
    case 'contents': return (
      <div>
        {text('Título das dores', 'painsTitle', 'Ex: Isso acontece com você?')}
        {strList('Dores do público', 'pains', 6, 'Adicionar dor')}
        {text('Título do sumário', 'title', 'Ex: O que você vai encontrar')}
        {objList('Sumário / conteúdo', 'items', 10, 'Adicionar item', [{ k: 'title', label: 'Nome do item' }, { k: 'text', label: 'O que a pessoa ganha (opcional)', area: true }], { title: '', text: '' })}
      </div>
    )
    case 'painText': return (
      <div>
        {text('Palavra acima do título', 'eyebrow')}
        {area('Título', 'title', 2)}
        {area('Texto que bate na dor', 'text', 10, 'Separe os parágrafos com uma linha em branco. Use **duas estrelas** para destacar.')}
      </div>
    )
    case 'testimonials': return (
      <div>
        <div style={{ fontSize: 12, color: '#fbbf24', background: '#2a2208', border: '1px solid #4a3a0a', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>Use só depoimentos de clientes reais.</div>
        {text('Título da seção', 'title')}
        {objList('Depoimentos', 'items', 6, 'Adicionar depoimento', [{ k: 'name', label: 'Nome' }, { k: 'role', label: 'Profissão / cidade' }, { k: 'text', label: 'Depoimento', area: true }], { name: '', role: '', text: '', stars: 5 })}
      </div>
    )
    case 'howto': return (
      <div>
        {text('Título da seção', 'title')}
        {objList('Passos', 'steps', 6, 'Adicionar passo', [{ k: 'title', label: 'Passo (ex: Acesse a área de membros)' }, { k: 'text', label: 'Explicação (opcional)', area: true }], { title: '', text: '' })}
      </div>
    )
    case 'bonus': return (
      <div>
        {text('Título da seção', 'title')}
        {objList('Bônus', 'items', 6, 'Adicionar bônus', [{ k: 'title', label: 'Nome do bônus' }, { k: 'text', label: 'Descrição', area: true }, { k: 'image', label: 'Link de imagem (opcional)' }], { title: '', text: '', image: '' })}
      </div>
    )
    case 'offer': return (
      <div>
        {text('Título', 'title')}
        {strList('O que a pessoa leva (lista)', 'items', 7, 'Adicionar item')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {text('Preço (R$)', 'price')}
          {text('Preço "de" (riscado)', 'oldPrice')}
        </div>
        {text('Tipo de cobrança', 'period', 'Ex: pagamento único')}
        {text('Texto do botão', 'btnText')}
        {text('Link do botão (checkout)', 'btnUrl')}
        {text('Texto abaixo do botão', 'note')}
      </div>
    )
    case 'guarantee': return (
      <div>
        {text('Título', 'title')}
        {text('Dias de garantia (só o número)', 'days')}
        {area('Texto da garantia', 'text', 4)}
      </div>
    )
    case 'faq': return (
      <div>
        {text('Título da seção', 'title')}
        {objList('Perguntas', 'items', 10, 'Adicionar pergunta', [{ k: 'question', label: 'Pergunta' }, { k: 'answer', label: 'Resposta', area: true }], { question: '', answer: '' })}
      </div>
    )
    case 'cta': return (
      <div>
        {text('Título', 'title')}
        {text('Subtítulo', 'subtitle')}
        {text('Texto do botão', 'btnText')}
        {text('Link do botão (checkout)', 'btnUrl')}
        {text('Texto abaixo do botão', 'note')}
      </div>
    )
    case 'image': return (
      <div>
        {text('Legenda (opcional)', 'caption')}
        <label style={lbl}>Imagem</label>
        {d.image && <img src={d.image} alt="" style={{ width: '100%', borderRadius: 8, maxHeight: 140, objectFit: 'cover' }} />}
        <ImagePicker images={images} selected={d.image || ''} onSelect={url => set('image', url)} onSearch={onSearchImages} />
      </div>
    )
    default: return null
  }
}

// Paginas criadas antes do gerador novo nao tem "sections": monta uma base a partir do que foi guardado
function buildDefaultSections(page: any): Section[] {
  const fd = page.form_data || {}
  const benefits: string[] = Array.isArray(fd.benefits) ? fd.benefits : []
  const url = fd.checkoutUrl || '#'
  return [
    { id: 'headline', type: 'headline', visible: true, data: { topBar: '', tag: fd.audience || '', title: page.product_name || 'Título principal', subtitle: '', btnText: 'Quero garantir o meu', btnUrl: url, note: 'Compra segura' } },
    { id: 'media', type: 'media', visible: false, data: { mode: 'image', image: '', videoUrl: '', caption: '' } },
    { id: 'contents', type: 'contents', visible: true, data: { painsTitle: 'Isso acontece com você?', pains: [], title: 'O que você vai receber', items: benefits.map(b => ({ title: b, text: '' })) } },
    { id: 'painText', type: 'painText', visible: false, data: { eyebrow: 'A verdade', title: '', text: '' } },
    { id: 'testimonials', type: 'testimonials', visible: false, data: { title: 'O que dizem quem já usou', items: [{ name: '', role: '', text: '', stars: 5 }] } },
    { id: 'howto', type: 'howto', visible: false, data: { title: 'Como usar', steps: [{ title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }] } },
    { id: 'bonus', type: 'bonus', visible: !!fd.bonus, data: { title: 'Bônus exclusivos', items: [{ title: '', text: typeof fd.bonus === 'string' ? fd.bonus : '', image: '' }] } },
    { id: 'offer', type: 'offer', visible: true, data: { title: 'Garanta o seu acesso', price: fd.price || '', oldPrice: '', period: 'pagamento único', items: benefits.slice(0, 6), btnText: 'Quero garantir o meu', btnUrl: url, note: 'Pagamento seguro' } },
    { id: 'guarantee', type: 'guarantee', visible: true, data: { title: 'Garantia', days: '7', text: typeof fd.guarantee === 'string' ? fd.guarantee : '' } },
  ]
}

export default function PageEditorPage({ params }: { params: { id: string } }) {
  const [sections, setSections] = useState<Section[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT)
  const [pixelId, setPixelId] = useState('')
  const [pageData, setPageData] = useState<any>(null)
  const [images, setImages] = useState<ImageItem[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const activeRef = useRef<string | null>(null)
  activeRef.current = active

  useEffect(() => { loadPage() }, [params.id])

  async function loadPage() {
    const res = await fetch('/api/get-page?id=' + params.id)
    const data = await res.json()
    if (!data.page) return
    const p = data.page
    setPageData(p)
    setTheme(p.theme === 'dark' ? 'dark' : 'light')
    const fd = p.form_data || {}
    setAccent(fd.accent || DEFAULT_ACCENT)
    setPixelId(fd.pixelId || '')
    const norm = Array.isArray(p.sections) ? normalizeSections(p.sections) : []
    setSections(norm.length ? norm : buildDefaultSections(p))
    loadImages(p.product_name || 'business success')
  }

  async function loadImages(query: string) {
    try {
      const res = await fetch('/api/unsplash-images?query=' + encodeURIComponent(query || 'business') + '&count=9')
      const data = await res.json()
      setImages(data.images || [])
    } catch (err) { /* sem fotos de busca, o resto continua funcionando */ }
  }

  // preview: remonta a pagina real alguns instantes depois da ultima digitacao
  useEffect(() => {
    if (!pageData) return
    const t = setTimeout(() => {
      setPreviewHtml(renderSalesPage(sections, { theme, accent, title: pageData.product_name, preview: true }))
    }, 350)
    return () => clearTimeout(t)
  }, [sections, theme, accent, pageData])

  function onFrameLoad() {
    const id = activeRef.current
    if (id && frameRef.current && frameRef.current.contentWindow) frameRef.current.contentWindow.postMessage({ type: 'scrollTo', id }, '*')
  }

  function pick(id: string | null) {
    setActive(id)
    if (id && frameRef.current && frameRef.current.contentWindow) frameRef.current.contentWindow.postMessage({ type: 'scrollTo', id }, '*')
  }

  const touch = () => { setSaved(false); setError('') }
  function updateSection(id: string, data: any) { setSections(prev => prev.map(s => s.id === id ? { ...s, data } : s)); touch() }
  function toggleVisible(id: string) { setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s)); touch() }
  function removeSection(id: string) {
    if (!window.confirm('Remover esta seção?')) return
    setSections(prev => prev.filter(s => s.id !== id))
    if (active === id) setActive(null)
    touch()
  }
  function addSection(type: SectionType) {
    const ns = newSection(type)
    setSections(prev => {
      // o chamado final e a imagem extra vao pro fim; as outras entram antes do FAQ
      const faqIdx = prev.findIndex(s => s.type === 'faq')
      if (type === 'cta' || type === 'faq' || faqIdx === -1) return [...prev, ns]
      const arr = [...prev]; arr.splice(faqIdx, 0, ns); return arr
    })
    setActive(ns.id); setShowAdd(false); touch()
  }

  function handleDrop(targetId: string) {
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return }
    setSections(prev => {
      const arr = [...prev]
      const from = arr.findIndex(s => s.id === dragging)
      const to = arr.findIndex(s => s.id === targetId)
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return arr
    })
    setDragging(null); setDragOver(null); touch()
  }

  async function save() {
    if (!pageData) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/save-page-sections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.id, sections, theme, accent, pixelId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site'
  const activeSection = sections.find(s => s.id === active)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0f0a', color: '#fff', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden' }}>

      {/* Esquerda: secoes */}
      <div style={{ width: 270, background: '#0d150d', borderRight: '1px solid #1a2e1a', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 'none' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a2e1a' }}>
          <a href="/dashboard/paginas" style={{ color: '#6b7280', fontSize: 12, textDecoration: 'none', display: 'block', marginBottom: 8 }}>← Voltar</a>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Seções da página</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Arraste para mudar a ordem</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <div onClick={() => pick('__settings')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, marginBottom: 10, cursor: 'pointer', background: active === '__settings' ? '#1a3a1a' : '#0f1a0f', border: active === '__settings' ? '1px solid #4ade80' : '1px solid #1a2e1a', fontSize: 13, fontWeight: 600 }}>
            ⚙️ Ajustes (cor, tema, pixel)
          </div>
          {sections.map(section => (
            <div key={section.id} draggable
              onDragStart={() => setDragging(section.id)}
              onDragOver={e => { e.preventDefault(); setDragOver(section.id) }}
              onDrop={() => handleDrop(section.id)}
              onClick={() => pick(section.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 8px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', background: active === section.id ? '#1a3a1a' : dragOver === section.id ? '#1a2e1a' : '#0f1a0f', border: active === section.id ? '1px solid #4ade80' : '1px solid #1a2e1a', opacity: section.visible ? 1 : 0.5 }}>
              <DragHandle />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{SECTION_LABELS[section.type]}</span>
              <button title={section.visible ? 'Esconder' : 'Mostrar'} onClick={e => { e.stopPropagation(); toggleVisible(section.id) }} style={{ background: 'none', border: 'none', color: section.visible ? '#4ade80' : '#6b7280', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>{section.visible ? '👁' : '🙈'}</button>
              <button title="Remover" onClick={e => { e.stopPropagation(); removeSection(section.id) }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #1a2e1a' }}>
          <button onClick={() => setShowAdd(!showAdd)} style={{ ...addBtn, color: '#9ca3af' }}>{showAdd ? 'Fechar' : '+ Adicionar seção'}</button>
          {showAdd && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {ADDABLE.map(type => (
                <button key={type} onClick={() => addSection(type)} style={{ background: '#0f1a0f', border: '1px solid #1a2e1a', borderRadius: 8, padding: '5px 10px', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>{SECTION_LABELS[type]}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meio: formulario */}
      <div style={{ width: 340, background: '#0a0f0a', borderRight: '1px solid #1a2e1a', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 'none' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a2e1a' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{active === '__settings' ? '⚙️ Ajustes da página' : activeSection ? SECTION_LABELS[activeSection.type] : 'Selecione uma seção'}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>O preview ao lado mostra a página real</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {active === '__settings' ? (
            <div>
              <label style={lbl}>Tema</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['light', 'dark'] as const).map(t => (
                  <button key={t} onClick={() => { setTheme(t); touch() }} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid ' + (theme === t ? '#4ade80' : '#1e3a1e'), background: theme === t ? '#1a3a1a' : '#0a120a', color: '#fff', cursor: 'pointer', fontSize: 13 }}>{t === 'light' ? '☀️ Claro' : '🌙 Escuro'}</button>
                ))}
              </div>
              <label style={lbl}>Cor principal</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                {ACCENTS.map(c => (
                  <div key={c} onClick={() => { setAccent(c); touch() }} style={{ width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer', border: accent === c ? '3px solid #fff' : '3px solid transparent', boxSizing: 'border-box' }} />
                ))}
                <input type="color" value={accent} onChange={e => { setAccent(e.target.value); touch() }} style={{ width: 38, height: 30, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
              </div>
              <label style={lbl}>ID do Pixel do Facebook</label>
              <input type="text" value={pixelId} onChange={e => { setPixelId(e.target.value.replace(/\s/g, '')); touch() }} placeholder="Ex: 123456789012345" style={inp} />
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, lineHeight: 1.5 }}>
                Registra PageView, ViewContent e InitiateCheckout (clique no botão de compra). O pixel só roda na página publicada, não neste preview.
              </div>
            </div>
          ) : activeSection ? (
            <SectionForm section={activeSection} images={images} onUpdate={data => updateSection(activeSection.id, data)} onSearchImages={loadImages} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', textAlign: 'center', gap: 8 }}>
              <div style={{ fontSize: 32 }}>←</div>
              <div style={{ fontSize: 14 }}>Clique em uma seção para editar</div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #1a2e1a' }}>
          {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, background: saved ? '#16a34a' : 'linear-gradient(135deg, #16a34a, #4ade80)', color: '#0a0f0a', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {saving ? 'Salvando...' : saved ? '✓ Salvo!' : '💾 Salvar'}
            </button>
            {pageData && (
              <a href={`${APP_URL}/p/${pageData.slug}`} target="_blank" rel="noreferrer" style={{ padding: '10px 14px', background: '#0d150d', border: '1px solid #1a2e1a', borderRadius: 10, color: '#4ade80', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>🔗</a>
            )}
          </div>
        </div>
      </div>

      {/* Direita: preview real */}
      <div style={{ flex: 1, background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Preview</div>
          <div style={{ flex: 1, background: '#1a1a1a', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{APP_URL}/p/{pageData?.slug || '...'}</div>
          <button onClick={() => setMobile(false)} style={{ background: !mobile ? '#1a3a1a' : '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>🖥 Computador</button>
          <button onClick={() => setMobile(true)} style={{ background: mobile ? '#1a3a1a' : '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>📱 Celular</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: '#1a1a1a', padding: 16, display: 'flex', justifyContent: 'center' }}>
          <iframe
            ref={frameRef}
            title="Preview da página"
            sandbox="allow-scripts"
            srcDoc={previewHtml}
            onLoad={onFrameLoad}
            style={{ width: mobile ? 390 : '100%', maxWidth: '100%', height: '100%', minHeight: 500, border: 'none', borderRadius: 12, background: '#fff', boxShadow: '0 4px 40px rgba(0,0,0,0.4)' }}
          />
        </div>
      </div>
    </div>
  )
}
