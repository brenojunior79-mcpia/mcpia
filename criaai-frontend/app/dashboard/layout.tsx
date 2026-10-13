import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import PlanPopup from '@/components/layout/PlanPopup'
import InstallTracker from '@/components/layout/InstallTracker'
import PushSetup from '@/components/layout/PushSetup'
import PresenceTracker from '@/components/layout/PresenceTracker'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, plans(name, credits_videos, credits_ebooks, is_unlimited, price_monthly)')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} user={user} />
      <PlanPopup profile={profile} user={user} />
      <InstallTracker />
      <PresenceTracker />
      <PushSetup user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar profile={profile} user={user} />
        <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{children}</main>
      </div>
    </div>
  )
}
