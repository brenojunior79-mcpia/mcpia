import { NextResponse } from 'next/server'

const GAMMA_API_KEY = process.env.GAMMA_API_KEY!

export async function GET() {
  try {
    const res = await fetch('https://public-api.gamma.app/v1.0/themes?limit=50&type=standard', {
      headers: { 'X-API-KEY': GAMMA_API_KEY },
    })

    if (!res.ok) {
      return NextResponse.json({ themes: [] })
    }

    const data = await res.json()
    const themes = (data.data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      colorKeywords: t.colorKeywords ?? [],
      toneKeywords: t.toneKeywords ?? [],
    }))

    return NextResponse.json({ themes })
  } catch {
    return NextResponse.json({ themes: [] })
  }
}
