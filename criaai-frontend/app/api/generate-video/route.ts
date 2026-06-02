import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createKlingJob, waitForKlingJob } from '@/lib/kling'

const AGENCY_VIDEO_LIMIT = 100
const ALERT_EMAIL = process.env.ADMIN_EMAIL || 'brenojunior79@gmail.com'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { imageUrl, niche, tone, format, customPrompt } = await req.json()
    if (!imageUrl || !niche) {
      return NextResponse.json({ error: 'Imagem e nicho são obrigatórios' }, { status: 400 })
    }

    // Busca perfil com plano
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_videos_used, credits_videos_extra, plans(name, credits_videos, is_unlimited)')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const plan = (profile as any)?.plans
    const isUnlimited = plan?.is_unlimited
    const isAgency = plan?.name === 'Agency'
    const used = profile.credits_videos_used || 0
    const extra = profile.credits_videos_extra || 0
    const limit = isUnlimited ? 999999 : ((plan?.credits_videos || 0) + extra)

    // Limite soft (hard block) para Agency: 100 vídeos/mês
    if (isAgency || isUnlimited) {
      // Conta vídeos gerados no mês atual
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
        // Envia alerta para admin (sem await para não bloquear)
        notifyAdmin(user.email || '', monthlyUsed, ALERT_EMAIL).catch(console.error)

        return NextResponse.json({
          error: `Limite mensal de ${AGENCY_VIDEO_LIMIT} vídeos atingido. Seus créditos renovam no início do próximo mês. Entre em contato com o suporte se precisar de mais.`,
          limitReached: true,
        }, { status: 429 })
      }

      // Alerta quando chegar em 90%
      if (monthlyUsed === Math.floor(AGENCY_VIDEO_LIMIT * 0.9)) {
        notifyAdmin(user.email || '', monthlyUsed, ALERT_EMAIL).catch(console.error)
      }
    } else {
      // Planos com limite fixo (Starter e Pro)
      if (used >= limit) {
        return NextResponse.json({
          error: 'Sem créditos de vídeo disponíveis. Adicione créditos ou faça upgrade do plano.',
          limitReached: true,
        }, { status: 403 })
      }
    }

    // Cria job no Kling AI
    const job = await createKlingJob({ imageUrl, niche, tone: tone || 'lifestyle' })

    // Aguarda conclusão (máx 5 min)
    const result = await waitForKlingJob(job.jobId)

    if (result.status === 'failed' || !result.videoUrl) {
      return NextResponse.json({ error: 'Falha na geração do vídeo. Tente novamente.' }, { status: 500 })
    }

    // Registra geração no banco
    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'video',
      status: 'completed',
      niche,
      output_url: result.videoUrl,
      format: format || '9:16',
      credits_consumed: 1,
      api_cost: result.cost || 0,
      metadata: { tone, customPrompt },
    })

    // Incrementa crédito usado (apenas para planos com limite)
    if (!isAgency && !isUnlimited) {
      await supabase
        .from('profiles')
        .update({ credits_videos_used: used + 1 })
        .eq('id', user.id)
    } else {
      // Agency: incrementa apenas o contador (para histórico)
      await supabase
        .from('profiles')
        .update({ credits_videos_used: used + 1 })
        .eq('id', user.id)
    }

    return NextResponse.json({ videoUrl: result.videoUrl })
  } catch (err: any) {
    console.error('generate-video error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

async function notifyAdmin(userEmail: string, count: number, adminEmail: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.brenojunio.com.br'
  // Usa a API de email nativa do Next.js via fetch para o endpoint de notificação interno
  // Por ora, loga no console — substitua por Resend/SendGrid se quiser email real
  console.warn(`[AGENCY ALERT] ${userEmail} usou ${count} vídeos este mês. Limite: ${AGENCY_VIDEO_LIMIT}. Admin: ${adminEmail}. App: ${appUrl}`)
}
