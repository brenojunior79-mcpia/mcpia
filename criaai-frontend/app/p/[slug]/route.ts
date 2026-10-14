import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// A pagina publica e' devolvida como um documento HTML de verdade (e nao dentro de outra pagina),
// para que os scripts rodem: animacoes, perguntas frequentes, barra fixa e pixel do Facebook.
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: page } = await supabase
    .from('sales_pages')
    .select('html, active, product_name, views')
    .eq('slug', params.slug)
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
    .eq('slug', params.slug)
    .then(() => {})

  return new Response(page.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })
}
