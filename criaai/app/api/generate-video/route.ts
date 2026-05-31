// app/api/generate-video/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createKlingJob, waitForKlingJob } from '@/lib/kling'

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    // 2. Verificar e consumir crédito
    const { data: canConsume, error: creditError } = await supabaseAdmin
      .rpc('consume_credit', { p_user_id: user.id, p_type: 'video' })

    if (creditError || !canConsume) {
      return NextResponse.json({ 
        error: 'Créditos insuficientes',
        code: 'NO_CREDITS'
      }, { status: 402 })
    }

    // 3. Pegar dados do body
    const { imageUrl, niche, tone, format } = await req.json()
    if (!imageUrl || !niche) {
      return NextResponse.json({ error: 'imageUrl e niche são obrigatórios' }, { status: 400 })
    }

    // 4. Criar registro da geração no banco
    const { data: generation, error: genError } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        type: 'video',
        status: 'processing',
        niche,
        metadata: { tone, format, imageUrl },
      })
      .select()
      .single()

    if (genError) throw genError

    // 5. Enviar para Kling AI
    const klingJob = await createKlingJob({ imageUrl, niche, tone: tone || 'lifestyle' })

    // 6. Aguardar resultado (polling)
    const result = await waitForKlingJob(klingJob.jobId)

    if (result.status === 'failed') {
      await supabaseAdmin
        .from('generations')
        .update({ status: 'failed' })
        .eq('id', generation.id)

      return NextResponse.json({ error: 'Falha na geração do vídeo' }, { status: 500 })
    }

    // 7. Atualizar geração com URL do vídeo
    await supabaseAdmin
      .from('generations')
      .update({
        status: 'completed',
        output_url: result.videoUrl,
        api_cost: result.cost,
      })
      .eq('id', generation.id)

    return NextResponse.json({
      success: true,
      generationId: generation.id,
      videoUrl: result.videoUrl,
    })

  } catch (err: any) {
    console.error('generate-video error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
