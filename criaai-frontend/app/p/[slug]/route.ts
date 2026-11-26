import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// A pagina publica e' devolvida como um documento HTML de verdade (e nao dentro de outra pagina),
// para que os scripts rodem: animacoes, perguntas frequentes, barra fixa e pixel do Facebook.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createClient()
  const { data: page } = await supabase
    .from('sales_pages')
    .select('html, active, product_name, views')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!page?.html) {
    return new Response(
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Página não encontrada</title></head>' +
      '<body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;color:#444;text-align:center"><div><h1 style="font-size:22px">Página não encontrada</h1><p>Este link não existe ou foi pausado.</p></div></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  // Conta a visita sem atrasar a resposta
  supabase
    .from('sales_pages')
    .update({ views: (page.views || 0) + 1 })
    .eq('slug', slug)
    .then(() => {})

  // Paginas antigas: o player do YouTube/Vimeo dentro da pagina isolada ficava preto. Troca pela capa com botao de play (abre o video no YouTube/Vimeo).
  let html = String(page.html || '')
  if (html.indexOf('<iframe') >= 0) {
    let trocou = false
    html = html.replace(/<iframe[^>]*src="https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})[^"]*"[^>]*><\/iframe>/g, function(_m: string, id: string) {
      trocou = true
      return '<a class="vlink" href="https://www.youtube.com/watch?v=' + id + '" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="Assistir ao vídeo" loading="lazy"/><span class="vplay" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M8 5v14l11-7z" fill="#fff"/></svg></span><span class="vtxt">▶ Toque para assistir ao vídeo</span></a>'
    })
    html = html.replace(/<iframe[^>]*src="https:\/\/player\.vimeo\.com\/video\/(\d+)[^"]*"[^>]*><\/iframe>/g, function(_m: string, id: string) {
      trocou = true
      return '<a class="vlink" href="https://vimeo.com/' + id + '" target="_blank" rel="noopener"><span class="vplay" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M8 5v14l11-7z" fill="#fff"/></svg></span><span class="vtxt">▶ Toque para assistir ao vídeo</span></a>'
    })
    if (trocou && html.indexOf('.vlink{') < 0) {
      const css = '<style>.vlink{position:absolute;inset:0;display:block;color:#fff;text-decoration:none;background:#000}.vlink img{width:100%;height:100%;object-fit:cover;opacity:.85}.vplay{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:rgb(var(--ar,22,163,74));display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.45)}.vtxt{position:absolute;left:0;right:0;bottom:14px;text-align:center;font-weight:800;font-size:15px;text-shadow:0 2px 8px rgba(0,0,0,.7)}</style>'
      html = html.indexOf('</head>') >= 0 ? html.replace('</head>', css + '</head>') : css + html
    }
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      // A pagina de venda e HTML escrito pelo aluno: roda isolada (sem acesso ao login do site) mas com scripts, formularios e links funcionando
      'Content-Security-Policy': 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })
}
