'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { podeVerSazonais } from '@/lib/acessoSazonais'

// ============================================================================
// PRODUTOS SAZONAIS (produtos do momento)
// Para subir um produto, copie o modelo abaixo para dentro da lista `sazonais`.
//   id           texto unico, sem espaco (ex.: 'kit-natal')
//   name         nome do produto
//   temporada    ex.: 'Black Friday', 'Natal', 'Dia das Maes'
//   platform     'cakto' | 'kiwify' | 'kaiross'
//   tipo         'digital' | 'fisico'
//   category     categoria curta (ex.: 'Presentes')
//   description  descricao curta
//   audience     publico (ex.: 'Maes, avos')
//   ageRange     faixa de idade (ex.: '25-50 anos')
//   ate          data final no formato 'AAAA-MM-DD' (opcional). Depois dela o produto some para os alunos
//   affiliateUrl link para o aluno se afiliar
//   siteUrl      link do site do produto (opcional, '' se nao tiver)
//   driveUrl     link do material/criativos (opcional, '' se nao tiver)
//   image        link da imagem do produto
//   color        cor do card, ex.: '#7c5cfc'  |  colorBg: 'rgba(124,92,252,0.08)'
// ============================================================================
const TEMPORADA_ATUAL = 'Black Friday e Natal'

const sazonais: any[] = [
  // {
  //   id: 'exemplo', name: 'Nome do produto', temporada: 'Black Friday', platform: 'kiwify', tipo: 'digital',
  //   category: 'Categoria', description: 'Descricao curta do produto.', audience: 'Publico', ageRange: '25-50 anos',
  //   ate: '2026-12-05', affiliateUrl: '', siteUrl: '', driveUrl: '', image: '',
  //   color: '#ef4444', colorBg: 'rgba(239,68,68,0.08)',
  // },
]

// Modelo que so o admin enxerga enquanto a lista acima estiver vazia (para conferir o visual)
const exemploAdmin = {
  id: 'exemplo-admin', name: 'Produto de exemplo', temporada: 'Black Friday', platform: 'kiwify', tipo: 'digital',
  category: 'Exemplo', description: 'Assim vai aparecer o produto do momento: descricao curta, publico, prazo e os botoes de afiliacao, site e material.',
  audience: 'Publico do produto', ageRange: '25-50 anos', ate: '', affiliateUrl: '', siteUrl: '', driveUrl: '', image: '',
  color: '#ef4444', colorBg: 'rgba(239,68,68,0.08)',
}

const platformColors: Record<string, { bg: string; text: string; label: string }> = {
  cakto: { bg: 'rgba(124,92,252,0.12)', text: '#7c5cfc', label: 'CAKTO' },
  kiwify: { bg: 'rgba(34,197,94,0.12)', text: '#16a34a', label: 'KIWIFY' },
  kaiross: { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', label: 'KAIROSS' },
}

function diasRestantes(ate: string): number | null {
  if (!ate) return null
  const fim = new Date(ate + 'T23:59:59').getTime()
  if (isNaN(fim)) return null
  return Math.ceil((fim - Date.now()) / (24 * 60 * 60 * 1000))
}

function formatarData(ate: string): string {
  const p = ate.split('-')
  return p.length === 3 ? p[2] + '/' + p[1] : ate
}

function SazonalCard({ product, exemplo }: { product: any; exemplo?: boolean }) {
  const plat = platformColors[product.platform] || platformColors.kiwify
  const dias = diasRestantes(product.ate)
  const encerrado = dias !== null && dias < 0
  return (
    <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', opacity: encerrado ? 0.6 : 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 170, overflow: 'hidden', background: product.colorBg }}>
        {product.image ? (
          <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} onError={function(e: any) { e.target.style.display = 'none' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>{product.tipo === 'fisico' ? '📦' : '🎁'}</div>
        )}
        <div style={{ position: 'absolute', top: 12, left: 12, background: plat.bg, border: '1px solid ' + plat.text + '44', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: plat.text, backdropFilter: 'blur(8px)' }}>{plat.label}</div>
        {product.temporada && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(124,92,252,0.92)', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#fff' }}>{product.temporada}</div>
        )}
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{product.name}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 11, background: product.colorBg, border: '1px solid ' + product.color + '33', color: product.color, borderRadius: 99, padding: '2px 10px', fontWeight: 600 }}>{product.category}</span>
          <span style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted2)', borderRadius: 99, padding: '2px 10px', fontWeight: 600 }}>{product.tipo === 'fisico' ? 'Físico' : 'Digital'}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted2)', margin: '0 0 12px', lineHeight: 1.6 }}>{product.description}</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {product.ageRange && <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '4px 8px', fontSize: 11 }}>👥 {product.ageRange}</div>}
          {product.audience && <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '4px 8px', fontSize: 11 }}>🎯 {String(product.audience).split(',')[0]}</div>}
        </div>
        {product.ate && dias !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: encerrado ? 'var(--surface2)' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (encerrado ? 'var(--border)' : 'rgba(239,68,68,0.25)'), borderRadius: 9, padding: '7px 10px', marginBottom: 12 }}>
            <i className="ti ti-clock" style={{ color: encerrado ? 'var(--muted2)' : '#dc2626', fontSize: 15 }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: encerrado ? 'var(--muted2)' : '#dc2626' }}>
              {encerrado ? 'Encerrado em ' + formatarData(product.ate) : dias === 0 ? 'Último dia!' : 'Disponível até ' + formatarData(product.ate) + ' · faltam ' + dias + (dias === 1 ? ' dia' : ' dias')}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
          <a href={exemplo || !product.affiliateUrl ? undefined : product.affiliateUrl} target="_blank" rel="noreferrer"
            onClick={function(e) { if (exemplo || !product.affiliateUrl) e.preventDefault() }}
            style={{ background: 'linear-gradient(135deg, ' + product.color + ', ' + product.color + 'bb)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px', borderRadius: 10, textDecoration: 'none', textAlign: 'center', display: 'block', boxShadow: '0 4px 12px ' + product.color + '33', cursor: exemplo ? 'default' : 'pointer' }}>
            🤝 Quero me afiliar
          </a>
          <div style={{ display: 'flex', gap: 6 }}>
            {product.siteUrl && <a href={product.siteUrl} target="_blank" rel="noreferrer" style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 11, padding: '8px', borderRadius: 8, textDecoration: 'none', textAlign: 'center', display: 'block' }}>🌐 Ver site</a>}
            {product.driveUrl && <a href={product.driveUrl} target="_blank" rel="noreferrer" style={{ flex: 1, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontWeight: 600, fontSize: 11, padding: '8px', borderRadius: 8, textDecoration: 'none', textAlign: 'center', display: 'block' }}>📁 Material</a>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SazonaisPage() {
  const router = useRouter()
  const supabase = createClient()
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado'>('carregando')
  const [ehAdmin, setEhAdmin] = useState(false)

  useEffect(function() {
    supabase.auth.getUser().then(async function(r) {
      const uid = r.data.user ? r.data.user.id : null
      if (!uid) { setEstado('negado'); router.replace('/dashboard'); return }
      const p = await supabase.from('profiles').select('is_admin, created_at, subscription_status, plans(name)').eq('id', uid).maybeSingle()
      const d: any = p.data || {}
      const admin = !!d.is_admin
      setEhAdmin(admin)
      if (!podeVerSazonais(admin, d.created_at, d.subscription_status, d.plans ? d.plans.name : null)) { setEstado('negado'); router.replace('/dashboard'); return }
      setEstado('ok')
    })
  }, [])

  if (estado !== 'ok') {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)', fontSize: 13 }}>{estado === 'carregando' ? 'Carregando...' : 'Redirecionando...'}</div>
  }

  // Alunos nao veem produto com prazo vencido; o admin ve (marcado como encerrado)
  const visiveis = sazonais.filter(function(p) { const d = diasRestantes(p.ate); return ehAdmin || d === null || d >= 0 })
  const mostrarExemplo = ehAdmin && visiveis.length === 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 28 }}>🎄</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Produtos Sazonais</h1>
            {ehAdmin && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: '#7c5cfc', borderRadius: 99, padding: '3px 10px' }}>SÓ VOCÊ VÊ ESTE MENU</span>}
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted2)', margin: 0 }}>Os produtos do momento, que vendem mais em datas especiais. Exclusivo para assinantes do plano Pro. Cada produto fica disponível por tempo limitado.</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.10), rgba(236,72,153,0.08))', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 16, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 26 }}>✨</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent2)' }}>Temporada atual</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{TEMPORADA_ATUAL}</div>
          </div>
        </div>

        {visiveis.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18, marginBottom: 32 }}>
            {visiveis.map(function(p) { return <SazonalCard key={p.id} product={p} /> })}
          </div>
        )}

        {mostrarExemplo && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 10 }}>Nenhum produto cadastrado ainda. Este é só um <b>exemplo</b> do visual (nenhum aluno vê isso):</div>
            <div style={{ maxWidth: 320 }}><SazonalCard product={exemploAdmin} exemplo /></div>
          </div>
        )}

        {visiveis.length === 0 && !ehAdmin && (
          <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 16, padding: '36px 24px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🎁</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Novos produtos do momento chegando</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Volte em breve para ver os produtos da temporada.</div>
          </div>
        )}
      </div>
    </div>
  )
}
