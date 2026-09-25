import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const HF_API_KEY_ID = process.env.HF_API_KEY_ID!
const HF_API_KEY_SECRET = process.env.HF_API_KEY_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site'

// Cria (ou verifica o status de) o personagem reutilizavel na Higgsfield.
// So o admin deve chamar essa rota, uma vez por avatar novo.
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
    if (!(profile as any)?.is_admin) return NextResponse.json({ error: 'Apenas admin pode criar avatares' }, { status: 403 })

    const body = await req.json()
    const avatarId: string = body.avatarId
    if (!avatarId) return NextResponse.json({ error: 'avatarId obrigatorio' }, { status: 400 })

    const avatar = (await supabase.from('ai_avatars').select('*').eq('id', avatarId).single()).data
    if (!avatar) return NextResponse.json({ error: 'Avatar nao encontrado' }, { status: 404 })

    // Se ja tem external_id, so verifica o status atual em vez de criar de novo
    if (avatar.external_id) {
      const statusRes = await fetch('https://platform.higgsfield.ai/v1/custom-references/' + avatar.external_id, {
        headers: { 'Authorization': 'Key ' + HF_API_KEY_ID + ':' + HF_API_KEY_SECRET },
      })
      const statusData = await statusRes.json()
      const newStatus = statusData.status || avatar.status
      await supabase.from('ai_avatars').update({ status: newStatus }).eq('id', avatarId)
      return NextResponse.json({ id: avatar.external_id, status: newStatus })
    }

    const imageUrl = avatar.reference_image_url.startsWith('http')
      ? avatar.reference_image_url
      : APP_URL + avatar.reference_image_url

    const createRes = await fetch('https://platform.higgsfield.ai/v1/custom-references', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + HF_API_KEY_ID + ':' + HF_API_KEY_SECRET,
      },
      body: JSON.stringify({
        name: avatar.name,
        input_images: [{ type: 'image_url', image_url: imageUrl }],
      }),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      return NextResponse.json({ error: 'Higgsfield error ' + createRes.status + ': ' + errText }, { status: 500 })
    }

    const createData = await createRes.json()
    const externalId = createData.id
    const status = createData.status || 'not_ready'

    await supabase.from('ai_avatars').update({ external_id: externalId, status: status }).eq('id', avatarId)

    return NextResponse.json({ id: externalId, status: status })
  } catch (err: any) {
    console.error('[higgsfield/create-character]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
