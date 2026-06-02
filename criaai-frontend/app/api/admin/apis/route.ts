import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import crypto from 'crypto'

const KLING_API_URL = 'https://api.klingai.com'

function generateKlingToken(): string {
  const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY!
  const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY!
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iss: KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5 })).toString('base64url')
  const signature = crypto.createHmac('sha256', KLING_SECRET_KEY).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    // ── Kling AI: saldo de pacotes ──────────────────────────────
    let klingPackages: any[] = []
    let klingError: string | null = null
    try {
      const token = generateKlingToken()
      const klingRes = await fetch(`${KLING_API_URL}/v1/account/packages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const klingData = await klingRes.json()
      klingPackages = klingData?.data?.resource_packages || []
    } catch (e: any) {
      klingError = e.message
    }

    const klingCredits = klingPackages.reduce((sum: number, pkg: any) => sum + (pkg.remaining || 0), 0)
    const klingTotal = klingPackages.reduce((sum: number, pkg: any) => sum + (pkg.total || 0), 0)

    // ── OpenAI: saldo ───────────────────────────────────────────
    let openaiBalance: number | null = null
    let openaiError: string | null = null
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/organization/credits/ledger?page_size=1', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      })
      if (openaiRes.ok) {
        const openaiData = await openaiRes.json()
        openaiBalance = openaiData?.data?.[0]?.ending_balance ?? null
      } else {
        const billingRes = await fetch('https://api.openai.com/dashboard/billing/credit_grants', {
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        })
        if (billingRes.ok) {
          const billingData = await billingRes.json()
          openaiBalance = billingData?.total_available ?? null
        } else {
          openaiError = `HTTP ${openaiRes.status}`
        }
      }
    } catch (e: any) {
      openaiError = e.message
    }

    return NextResponse.json({
      kling: { credits: klingCredits, total: klingTotal, packages: klingPackages, error: klingError },
      openai: { balance: openaiBalance, error: openaiError },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
