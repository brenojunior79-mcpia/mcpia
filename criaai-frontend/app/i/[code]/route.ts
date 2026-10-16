import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { REFERRAL_CHECKOUT } from '@/lib/referrals'

// Link de indicacao: mcpia.site/i/CODIGO
// Guarda o codigo no navegador e leva a pessoa para o pagamento da Mentoria (R$ 297) com o codigo no link.
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = String(params.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  const valid = code.length === 8

  let known = false
  if (valid) {
    try {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const p = await admin.from('profiles').select('id').eq('referral_code', code).maybeSingle()
      known = !!p.data
      // Conta o clique so uma vez por navegador
      if (known && req.cookies.get('mcpia_ref')?.value !== code) await admin.from('referral_clicks').insert({ code })
    } catch (e) {
      console.error('[referral] clique:', e)
    }
  }

  const url = new URL(REFERRAL_CHECKOUT)
  if (known) {
    url.searchParams.set('utm_source', 'indicacao')
    url.searchParams.set('utm_medium', 'ref_' + code)
    url.searchParams.set('utm_campaign', 'indique-e-ganhe')
    url.searchParams.set('sck', 'ref_' + code)
  }
  const res = NextResponse.redirect(url.toString(), 302)
  if (known) {
    // 30 dias. Nao e' secreto: o proprio codigo ja aparece no link.
    res.cookies.set('mcpia_ref', code, { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', secure: true, httpOnly: false })
  }
  return res
}
