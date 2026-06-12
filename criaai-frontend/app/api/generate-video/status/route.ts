import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkKlingJob } from '@/lib/kling'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const taskId = req.nextUrl.searchParams.get('taskId')
    if (!taskId) return NextResponse.json({ error: 'taskId obrigatorio' }, { status: 400 })

    // Buscar o mode salvo no metadata da generation
    const { data: generation } = await supabase
      .from('generations')
      .select('metadata')
      .eq('user_id', user.id)
      .contains('metadata', { taskId })
      .single()

    const mode = generation?.metadata?.mode || 'image2video'

    const job = await checkKlingJob(taskId, mode)

    if (job.status === 'completed' && job.videoUrl) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_videos_used, plans(is_unlimited, name)')
        .eq('id', user.id)
        .single()

      const used = profile?.credits_videos_used || 0

      await supabase
        .from('generations')
        .update({ status: 'completed', output_url: job.videoUrl, api_cost: job.cost || 0 })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .contains('metadata', { taskId })

      await supabase
        .from('profiles')
        .update({ credits_videos_used: used + 1 })
        .eq('id', user.id)

      return NextResponse.json({ status: 'completed', videoUrl: job.videoUrl })
    }

    if (job.status === 'failed') {
      await supabase
        .from('generations')
        .update({ status: 'failed' })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .contains('metadata', { taskId })

      return NextResponse.json({ status: 'failed', error: 'Geracao falhou no Kling' })
    }

    return NextResponse.json({ status: job.status })
  } catch (err: any) {
    console.error('video-status error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
