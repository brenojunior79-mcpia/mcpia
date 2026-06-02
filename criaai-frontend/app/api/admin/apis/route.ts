import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const KLING_API_KEY = process.env.KLING_API_KEY
    const KLING_BASE_URL = process.env.KLING_API_URL || 'https://api.klingai.com'

    // ── Kling AI: saldo ─────────────────────────────────────────
    let klingCredits = 0
    let klingTotal = 0
    let klingPackages: any[] = []
    let klingError: string | null = null

    if (!KLING_API_KEY) {
      klingError = 'KLING_API_KEY não configurada'
    } else {
      try {
        const res = await fetch(`${KLING_BASE_URL}/v1/account/packages`, {
          headers: { 'Authorization': `Bearer ${KLING_API_KEY}` },
        })
        const data = await res.json()
        if (data?.data?.resource_packages) {
          klingPackages = data.data.resource_packages
          klingCredits = klingPackages.reduce((s: number, p: any) => s + (p.remaining || 0), 0)
          klingTotal = klingPackages.reduce((s: number, p: any) => s + (p.total || 0), 0)
        } else if (res.ok) {
          klingCredits = data?.data?.credits || data?.credits || data?.balance || 0
          klingTotal = data?.data?.total || data?.total || klingCredits
        } else {
          klingError = data?.message || `HTTP ${res.status}`
        }
      } catch (e: any) {
        klingError = e.message
      }
    }

    return NextResponse.json({
      kling: { credits: klingCredits, total: klingTotal, packages: klingPackages, error: klingError },
      openai: { balance: null, error: null, manualCheck: true },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
