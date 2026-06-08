// criaai-frontend/app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const generationId = searchParams.get('generationId')

    if (!generationId) {
      return NextResponse.json({ error: 'generationId é obrigatório.' }, { status: 400 })
    }

    const { data: ebook, error: ebookError } = await supabase
      .from('ebooks')
      .select('pdf_url, title')
      .eq('gamma_generation_id', generationId)
      .eq('user_id', user.id)
      .single()

    if (ebookError || !ebook) {
      return NextResponse.json(
        { error: 'Ebook não encontrado ou sem permissão.' },
        { status: 404 }
      )
    }

    const pdfResponse = await fetch(ebook.pdf_url)

    if (!pdfResponse.ok) {
      throw new Error(`Erro ao buscar PDF do Gamma: ${pdfResponse.status}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const filename = encodeURIComponent(`${ebook.title ?? 'ebook'}.pdf`)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('[generate-pdf]', err)
    return NextResponse.json(
      { error: err.message ?? 'Erro interno ao baixar PDF.' },
      { status: 500 }
    )
  }
}
