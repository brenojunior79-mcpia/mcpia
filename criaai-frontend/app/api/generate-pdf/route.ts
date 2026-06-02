import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { title, subtitle, author, niche, color, template, chapters, coverImageUrl } = await req.json()
    if (!title || !chapters) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

    // Converte imagem da capa para base64 para funcionar no PDF
    let coverBase64 = ''
    if (coverImageUrl) {
      try {
        const imgRes = await fetch(coverImageUrl)
        const arrayBuffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = imgRes.headers.get('content-type') || 'image/png'
        coverBase64 = `data:${mimeType};base64,${base64}`
      } catch {
        coverBase64 = ''
      }
    }

    const templates: Record<string, any> = {
      moderno: {
        bg: '#0a0a0f',
        coverBg: `linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)`,
        accent: color || '#C2FF00',
        text: '#f0eeff',
        muted: '#9994b0',
        pageBg: '#111118',
        borderColor: 'rgba(194,255,0,0.2)',
        fontTitle: 'Arial Black, sans-serif',
        fontBody: 'Arial, sans-serif',
      },
      minimalista: {
        bg: '#ffffff',
        coverBg: `linear-gradient(135deg, #f8f8f8 0%, #efefef 100%)`,
        accent: color || '#333333',
        text: '#1a1a1a',
        muted: '#666666',
        pageBg: '#ffffff',
        borderColor: '#e0e0e0',
        fontTitle: 'Georgia, serif',
        fontBody: 'Arial, sans-serif',
      },
      bold: {
        bg: color || '#7c5cfc',
        coverBg: `linear-gradient(135deg, ${color || '#7c5cfc'} 0%, ${color || '#5a3dd4'} 100%)`,
        accent: '#ffffff',
        text: '#ffffff',
        muted: 'rgba(255,255,255,0.7)',
        pageBg: '#ffffff',
        borderColor: color || '#7c5cfc',
        fontTitle: 'Arial Black, sans-serif',
        fontBody: 'Arial, sans-serif',
      },
    }

    const t = templates[template] || templates.moderno

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${t.fontBody}; background: ${t.pageBg}; color: ${template === 'bold' ? '#1a1a1a' : t.text}; }
  .cover { width: 794px; height: 1123px; background: ${t.coverBg}; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; text-align: center; page-break-after: always; position: relative; overflow: hidden; }
  .cover-pattern { position: absolute; inset: 0; opacity: 0.05; background-image: repeating-linear-gradient(45deg, ${t.accent} 0, ${t.accent} 1px, transparent 0, transparent 50%); background-size: 20px 20px; }
  .cover-niche { font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: ${t.accent}; margin-bottom: 24px; font-weight: 600; }
  .cover-line { width: 60px; height: 3px; background: ${t.accent}; margin: 0 auto 32px; }
  .cover-title { font-family: ${t.fontTitle}; font-size: 42px; font-weight: 900; color: ${t.text}; line-height: 1.15; margin-bottom: 20px; }
  .cover-subtitle { font-size: 18px; color: ${t.muted}; line-height: 1.5; margin-bottom: 40px; }
  .cover-author { font-size: 14px; color: ${t.accent}; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; border-top: 1px solid ${t.accent}; padding-top: 16px; width: 200px; }
  .toc-page { width: 794px; min-height: 1123px; padding: 80px; page-break-after: always; background: ${t.pageBg}; }
  .toc-header { font-family: ${t.fontTitle}; font-size: 28px; font-weight: 900; color: ${t.accent}; margin-bottom: 8px; }
  .toc-line { width: 50px; height: 3px; background: ${t.accent}; margin-bottom: 40px; }
  .toc-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid ${t.borderColor}; font-size: 15px; }
  .toc-num { font-weight: 700; color: ${t.accent}; margin-right: 16px; font-size: 13px; }
  .toc-title-text { flex: 1; color: ${template === 'bold' ? '#1a1a1a' : t.text}; }
  .toc-page-num { color: ${t.muted}; font-size: 13px; }
  .chapter-page { width: 794px; min-height: 1123px; padding: 80px; page-break-before: always; background: ${t.pageBg}; }
  .chapter-num { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: ${t.accent}; font-weight: 600; margin-bottom: 8px; }
  .chapter-title { font-family: ${t.fontTitle}; font-size: 30px; font-weight: 900; color: ${template === 'bold' ? '#1a1a1a' : t.text}; line-height: 1.2; margin-bottom: 8px; }
  .chapter-line { width: 40px; height: 3px; background: ${t.accent}; margin-bottom: 32px; }
  .chapter-intro { font-size: 16px; line-height: 1.8; color: ${template === 'bold' ? '#333' : t.muted}; margin-bottom: 32px; padding: 20px; background: ${template === 'moderno' ? 'rgba(194,255,0,0.05)' : '#f9f9f9'}; border-left: 3px solid ${t.accent}; border-radius: 4px; }
  .points-title { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: ${t.accent}; font-weight: 600; margin-bottom: 16px; }
  .point-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; font-size: 15px; line-height: 1.7; color: ${template === 'bold' ? '#333' : t.muted}; }
  .point-dot { width: 8px; height: 8px; border-radius: 50%; background: ${t.accent}; flex-shrink: 0; margin-top: 8px; }
  .chapter-conclusion { margin-top: 32px; padding: 20px; border: 1px solid ${t.borderColor}; border-radius: 8px; font-size: 15px; line-height: 1.7; font-style: italic; color: ${template === 'bold' ? '#333' : t.muted}; }
</style>
</head>
<body>
<div class="cover">
  <div class="cover-pattern"></div>
  ${coverBase64 ? `<img src="${coverBase64}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.4;"/>` : ''}
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:60px;text-align:center;">
    <div class="cover-niche">${niche || 'Ebook'}</div>
    <div class="cover-line"></div>
    <div class="cover-title">${title}</div>
    <div class="cover-subtitle">${subtitle || ''}</div>
    <div class="cover-author">${author || 'Autor'}</div>
  </div>
</div>
<div class="toc-page">
  <div class="toc-header">Sumário</div>
  <div class="toc-line"></div>
  ${chapters.map((c: any, i: number) => `
    <div class="toc-item">
      <span class="toc-num">${String(i+1).padStart(2,'0')}</span>
      <span class="toc-title-text">${c.title}</span>
      <span class="toc-page-num">${(i+1)*4 + 3}</span>
    </div>
  `).join('')}
</div>
${chapters.map((c: any, i: number) => `
<div class="chapter-page">
  <div class="chapter-num">Capítulo ${String(i+1).padStart(2,'0')}</div>
  <div class="chapter-title">${c.title}</div>
  <div class="chapter-line"></div>
  <div class="chapter-intro">${c.introduction || ''}</div>
  <div class="points-title">Pontos principais</div>
  ${(c.keyPoints || []).map((p: string) => `
    <div class="point-item"><div class="point-dot"></div><span>${p}</span></div>
  `).join('')}
  <div class="chapter-conclusion">${c.conclusion || ''}</div>
</div>
`).join('')}
</body>
</html>`

    return NextResponse.json({ html })
  } catch (err: any) {
    console.error('generate-pdf error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
