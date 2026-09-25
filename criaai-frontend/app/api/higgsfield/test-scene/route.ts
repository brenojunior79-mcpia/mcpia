import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const HF_API_KEY_ID = process.env.HF_API_KEY_ID!
const HF_API_KEY_SECRET = process.env.HF_API_KEY_SECRET!

// Rota de TESTE: manda uma unica chamada de geracao de cena e devolve a resposta crua,
// pra confirmarmos o formato exato antes de construir o pipeline completo.
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
    )

    const user = (await supabase.auth.getUser()).data.user
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const profile = (await supabase.from('profiles').select('is_admin').eq('id', user.id).single()).data
    if (!(profile as any)?.is_admin) return NextResponse.json({ error: 'Apenas admin' }, { status: 403 })

    const body = await req.json()
    const customReferenceId: string = body.customReferenceId
    const prompt: string = body.prompt || 'Woman sitting in a car, natural lighting, candid smartphone photo style'

    if (!customReferenceId) return NextResponse.json({ error: 'customReferenceId obrigatorio' }, { status: 400 })

    const res = await fetch('https://platform.higgsfield.ai/v1/text2image/soul', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + HF_API_KEY_ID + ':' + HF_API_KEY_SECRET,
      },
      body: JSON.stringify({
        params: {
          prompt: prompt,
          width_and_height: '1152x2048',
          quality: '1080p',
          custom_reference_id: customReferenceId,
          custom_reference_strength: 1,
          batch_size: 1,
        },
      }),
    })

    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}

    return NextResponse.json({ httpStatus: res.status, ok: res.ok, raw: json || text })
  } catch (err: any) {
    console.error('[higgsfield/test-scene]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
