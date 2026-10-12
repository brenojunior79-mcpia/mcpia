import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// GIF transparente de 1x1 pixel
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

// Imagem invisivel colocada no fim do e-mail. Quando o aluno abre o e-mail, ela e carregada e a abertura e contada.
export async function GET(req: NextRequest) {
  const b = req.nextUrl.searchParams.get('b') || ''
  const u = req.nextUrl.searchParams.get('u') || ''
  if (UUID.test(b) && UUID.test(u)) {
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await supabase.rpc('register_email_open', { p_broadcast: b, p_user: u })
    } catch (e) {}
  }
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  })
}
