import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import PlanPopup from '@/components/layout/PlanPopup'
import InstallTracker from '@/components/layout/InstallTracker'
import PushSetup from '@/components/layout/PushSetup'
import PresenceTracker from '@/components/layout/PresenceTracker'
import RefundBlocked from '@/components/layout/RefundBlocked'
import ReferralClaim from '@/components/referral/ReferralClaim'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, plans(name, credits_videos, credits_ebooks, is_unlimited, price_monthly)')
    .eq('id', user.id)
    .single()

  // Reembolsado: sem acesso a nenhum menu (admin nunca e bloqueado; quem comprar de novo volta a ter acesso)
  const hasPlan = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  if (profile?.refunded_at && !profile?.is_admin && !hasPlan) {
    return <RefundBlocked name={(profile?.full_name || '').split(' ')[0] || ''} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} user={user} />
      <PlanPopup profile={profile} user={user} />
      <InstallTracker />
      <PresenceTracker />
      <ReferralClaim />
      <PushSetup user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar profile={profile} user={user} />
        <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{children}</main>
      </div>
    </div>
  )
}
