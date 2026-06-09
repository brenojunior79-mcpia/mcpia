// criaai-frontend/app/api/unsplash-images/route.ts
import { NextRequest, NextResponse } from 'next/server'

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || 'business'
  const count = parseInt(searchParams.get('count') || '6')

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    )

    if (!res.ok) {
      throw new Error('Unsplash error: ' + res.status)
    }

    const data = await res.json()
    const images = (data.results || []).map((img: any) => ({
      id: img.id,
      url: img.urls.regular,
      thumb: img.urls.thumb,
      small: img.urls.small,
      alt: img.alt_description || query,
      author: img.user.name,
      authorLink: img.user.links.html,
    }))

    return NextResponse.json({ images })
  } catch (err: any) {
    console.error('[unsplash-images]', err)
    return NextResponse.json({ images: [] }, { status: 500 })
  }
}
