import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function buildHtmlFromSections(sections: any[], theme: string): string {
  const dark = theme === 'dark'
  const bg = dark ? '#0f0f0f' : '#f8f7ff'
  const text = dark ? '#f1f1f1' : '#1a1a2e'
  const accent = '#7c5cfc'
  const card = dark ? '#1a1a2a' : '#ffffff'
  const border = dark ? '#2a2a3a' : '#e5e7eb'

  const visibleSections = sections.filter(function(s) { return s.visible })

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${bg};color:${text};}
a{text-decoration:none;}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
.cta-btn{animation:pulse 2.5s ease-in-out infinite;}
</style>
</head>
<body>`

  visibleSections.forEach(function(section) {
    if (section.type === 'hero') {
      const d = section.data
      const hasBg = !!d.image
      html += `<section style="position:relative;min-height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 32px;text-align:center;background:${hasBg ? 'transparent' : (dark ? 'linear-gradient(135deg,#1a0a2e,#0a1a2e)' : 'linear-gradient(135deg,#f0ecff,#e8f4ff)')};overflow:hidden;">`
      if (hasBg) {
        html += `<div style="position:absolute;inset:0;background-image:url(${d.image});background-size:cover;background-position:center;filter:brightness(0.35);"></div>`
      }
      html += `<div style="position:relative;z-index:1;max-width:600px;">`
      if (d.tag) {
        html += `<div style="display:inline-block;background:rgba(124,92,252,0.15);border:1px solid rgba(124,92,252,0.3);border-radius:99px;padding:4px 14px;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#a78bfa;margin-bottom:16px;">+ ${d.tag}</div>`
      }
      html += `<h1 style="font-size:clamp(24px,4vw,42px);font-weight:900;line-height:1.15;margin-bottom:16px;color:${hasBg ? '#fff' : text};">${d.title || 'Titulo principal'}</h1>`
      html += `<p style="font-size:16px;color:${hasBg ? 'rgba(255,255,255,0.8)' : (dark ? '#aaa' : '#555')};margin-bottom:32px;line-height:1.6;">${d.subtitle || ''}</p>`
      if (d.btnText) {
        html += `<a href="${d.btnUrl || '#'}" class="cta-btn" style="display:inline-block;background:${accent};color:#fff;padding:14px 32px;border-radius:12px;font-weight:700;font-size:16px;">✦ ${d.btnText}</a>`
      }
      html += `</div></section>`
    }

    if (section.type === 'benefits') {
      const d = section.data
      const items = (d.items || []).filter(function(i: string) { return i })
      html += `<section style="padding:48px 32px;max-width:700px;margin:0 auto;">`
      html += `<p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:${accent};margin-bottom:8px;text-transform:uppercase;">O QUE VOCE VAI RECEBER</p>`
      html += `<h2 style="font-size:28px;font-weight:800;margin-bottom:28px;">${d.title || 'Beneficios'}</h2>`
      items.forEach(function(item: string) {
        html += `<div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:${card};border:1px solid ${border};border-radius:12px;margin-bottom:10px;">`
        html += `<div style="width:28px;height:28px;background:${accent};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;color:#fff;">✓</div>`
        html += `<span style="font-size:15px;">${item}</span></div>`
      })
      html += `</section>`
    }

    if (section.type === 'testimonials') {
      const d = section.data
      const items = (d.items || []).filter(function(i: any) { return i.text })
      html += `<section style="padding:48px 32px;background:${dark ? '#0a0a1a' : '#f3f0ff'};">`
      html += `<div style="max-width:700px;margin:0 auto;">`
      html += `<p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:${accent};margin-bottom:8px;text-transform:uppercase;">DEPOIMENTOS</p>`
      html += `<h2 style="font-size:28px;font-weight:800;margin-bottom:28px;">${d.title || 'O que dizem nossos clientes'}</h2>`
      html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;">`
      items.forEach(function(item: any) {
        html += `<div style="background:${card};border:1px solid ${border};border-radius:14px;padding:20px;">`
        html += `<div style="color:#f59e0b;font-size:14px;margin-bottom:10px;">★★★★★</div>`
        html += `<p style="font-size:14px;line-height:1.6;color:${dark ? '#ccc' : '#444'};margin-bottom:14px;font-style:italic;">"${item.text}"</p>`
        html += `<div style="display:flex;align-items:center;gap:10px;">`
        html += `<div style="width:36px;height:36px;background:${accent};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">${(item.name || 'A')[0].toUpperCase()}</div>`
        html += `<div><div style="font-weight:600;font-size:13px;">${item.name}</div><div style="font-size:12px;color:${dark ? '#888' : '#777'};">${item.role}</div></div>`
        html += `</div></div>`
      })
      html += `</div></div></section>`
    }

    if (section.type === 'bonus') {
      const d = section.data
      html += `<section style="padding:48px 32px;max-width:700px;margin:0 auto;">`
      html += `<p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:${accent};margin-bottom:8px;text-transform:uppercase;">BONUS EXCLUSIVO</p>`
      html += `<h2 style="font-size:28px;font-weight:800;margin-bottom:16px;">${d.title || 'Bonus'}</h2>`
      if (d.image) {
        html += `<img src="${d.image}" alt="bonus" style="width:100%;border-radius:12px;margin-bottom:16px;max-height:200px;object-fit:cover;"/>`
      }
      html += `<p style="font-size:16px;line-height:1.7;color:${dark ? '#ccc' : '#555'};">${d.text || ''}</p>`
      html += `</section>`
    }

    if (section.type === 'guarantee') {
      const d = section.data
      html += `<section style="padding:48px 32px;background:${dark ? '#0a1a0a' : '#f0fff4'};">`
      html += `<div style="max-width:600px;margin:0 auto;text-align:center;">`
      html += `<div style="font-size:48px;margin-bottom:16px;">🛡️</div>`
      html += `<h2 style="font-size:28px;font-weight:800;margin-bottom:12px;">${d.title || 'Garantia'}</h2>`
      if (d.days) {
        html += `<div style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);border-radius:99px;padding:6px 20px;font-size:14px;font-weight:700;color:#16a34a;margin-bottom:16px;">${d.days} dias de garantia</div>`
      }
      html += `<p style="font-size:16px;line-height:1.7;color:${dark ? '#ccc' : '#555'};">${d.text || ''}</p>`
      html += `</div></section>`
    }

    if (section.type === 'cta') {
      const d = section.data
      html += `<section style="padding:64px 32px;background:${dark ? 'linear-gradient(135deg,#1a0a2e,#0a1a2e)' : 'linear-gradient(135deg,#f0ecff,#e8f4ff)'};text-align:center;">`
      html += `<h2 style="font-size:32px;font-weight:900;margin-bottom:12px;">${d.title || 'Pronto para comecar?'}</h2>`
      html += `<p style="font-size:16px;color:${dark ? '#aaa' : '#666'};margin-bottom:32px;">${d.subtitle || ''}</p>`
      if (d.btnText) {
        html += `<a href="${d.btnUrl || '#'}" class="cta-btn" style="display:inline-block;background:${accent};color:#fff;padding:16px 40px;border-radius:14px;font-weight:800;font-size:18px;">✦ ${d.btnText}</a>`
      }
      if (d.note) {
        html += `<p style="font-size:13px;color:${dark ? '#888' : '#888'};margin-top:14px;">🔒 ${d.note}</p>`
      }
      html += `</section>`
    }

    if (section.type === 'image') {
      const d = section.data
      if (d.image) {
        html += `<section style="padding:32px;max-width:700px;margin:0 auto;">`
        html += `<img src="${d.image}" alt="${d.caption || ''}" style="width:100%;border-radius:14px;object-fit:cover;max-height:320px;"/>`
        if (d.caption) {
          html += `<p style="font-size:13px;color:${dark ? '#888' : '#888'};text-align:center;margin-top:8px;">${d.caption}</p>`
        }
        html += `</section>`
      }
    }
  })

  html += `</body></html>`
  return html
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

    const body = await req.json()
    const { id, sections, theme } = body
    if (!id || !sections) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })

    const newHtml = buildHtmlFromSections(sections, theme || 'light')

    const { error } = await supabase
      .from('sales_pages')
      .update({
        sections,
        theme,
        html: newHtml,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
