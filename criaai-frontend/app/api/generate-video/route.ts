import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createKlingJob } from '@/lib/kling'

const AGENCY_VIDEO_LIMIT = 100

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const { imageUrl, niche, tone, format, customPrompt, duration } = await req.json()

    if (!niche && !customPrompt) {
      return NextResponse.json({ error: 'Preencha o nicho ou descreva o criativo.' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_videos_used, credits_videos_extra, plans(name, credits_videos, is_unlimited)')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

    const plan = (profile as any)?.plans
    const isUnlimited = plan?.is_unlimited
    const isAgency = plan?.name === 'Agency'
    const used = profile.credits_videos_used || 0
    const extra = profile.credits_videos_extra || 0
    const limit = isUnlimited ? 999999 : ((plan?.credits_videos || 0) + extra)

    if (isAgency || isUnlimited) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'video')
        .gte('created_at', startOfMonth.toISOString())
      const monthlyUsed = count || 0
      if (monthlyUsed >= AGENCY_VIDEO_LIMIT) {
        return NextResponse.json({
          error: `Limite mensal de ${AGENCY_VIDEO_LIMIT} videos atingido.`,
          limitReached: true,
        }, { status: 429 })
      }
    } else {
      if (used >= limit) {
        return NextResponse.json({
          error: 'Sem creditos de video disponiveis.',
          limitReached: true,
        }, { status: 403 })
      }
    }

    const job = await createKlingJob({
      imageUrl: imageUrl || null,
      niche: niche || '',
      tone: tone || 'lifestyle',
      customPrompt,
      duration: duration || 10,
    })

    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'video',
      status: 'pending',
      niche: niche || customPrompt?.slice(0, 50) || 'criativo',
      format: format || '9:16',
      credits_consumed: 1,
      metadata: { tone, customPrompt, taskId: job.jobId, duration },
    })

    return NextResponse.json({ taskId: job.jobId })
  } catch (err: any) {
    console.error('generate-video error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
