import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PublicPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: page } = await supabase
    .from('sales_pages')
    .select('html, active, product_name, views')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!page?.html) notFound()

  // Incrementa views (fire and forget)
  supabase
    .from('sales_pages')
    .update({ views: (page.views || 0) + 1 })
    .eq('slug', params.slug)
    .then(() => {})

  return (
    <div
      dangerouslySetInnerHTML={{ __html: page.html }}
      style={{ minHeight: '100vh' }}
    />
  )
}
