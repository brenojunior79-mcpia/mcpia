import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { renderSalesPage, normalizeSections, safeAccent, safePixel } from '@/lib/sales-page'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
    )

    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

    const body = await req.json()
    const { id, sections } = body
    if (!id || !Array.isArray(sections)) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    if (JSON.stringify(sections).length > 4 * 1024 * 1024) return NextResponse.json({ error: 'A pagina ficou grande demais.' }, { status: 413 })

    const theme: 'light' | 'dark' = body.theme === 'dark' ? 'dark' : 'light'

    const cur = await supabase.from('sales_pages').select('product_name, form_data').eq('id', id).eq('user_id', user.id).single()
    if (cur.error || !cur.data) return NextResponse.json({ error: 'Pagina nao encontrada.' }, { status: 404 })

    const prev = (cur.data.form_data && typeof cur.data.form_data === 'object') ? cur.data.form_data : {}
    const accent = safeAccent(body.accent !== undefined ? body.accent : prev.accent)
    const pixelId = safePixel(body.pixelId !== undefined ? body.pixelId : prev.pixelId)

    const clean = normalizeSections(sections)
    const html = renderSalesPage(clean, { theme, accent, pixelId, title: cur.data.product_name })

    const { error } = await supabase
      .from('sales_pages')
      .update({
        sections: clean,
        theme,
        html,
        form_data: { ...prev, accent, pixelId },
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
