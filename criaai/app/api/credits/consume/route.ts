// app/api/credits/consume/route.ts — verificar saldo de créditos
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select(`*, plans(*)`)
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const plan = profile.plans as any
  const isUnlimited = plan?.is_unlimited || false

  return NextResponse.json({
    plan: plan?.name,
    subscription_status: profile.subscription_status,
    trial_ends_at: profile.trial_ends_at,
    videos: {
      used: profile.credits_videos_used,
      limit: isUnlimited ? 'unlimited' : plan?.credits_videos,
      extra: profile.credits_videos_extra,
      available: isUnlimited ? 'unlimited' : Math.max(0,
        (plan?.credits_videos + profile.credits_videos_extra) - profile.credits_videos_used
      ),
    },
    ebooks: {
      used: profile.credits_ebooks_used,
      limit: isUnlimited ? 'unlimited' : plan?.credits_ebooks,
      extra: profile.credits_ebooks_extra,
      available: isUnlimited ? 'unlimited' : Math.max(0,
        (plan?.credits_ebooks + profile.credits_ebooks_extra) - profile.credits_ebooks_used
      ),
    },
  })
}
