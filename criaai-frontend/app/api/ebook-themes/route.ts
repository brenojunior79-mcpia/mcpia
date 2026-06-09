import { NextResponse } from 'next/server'

const GAMMA_API_KEY = process.env.GAMMA_API_KEY!

const colorMap: Record<string, string> = {
  black: 'Preto', white: 'Branco', gray: 'Cinza', 'light gray': 'Cinza claro',
  'dark gray': 'Cinza escuro', dark: 'Escuro', light: 'Claro', blue: 'Azul',
  'dark blue': 'Azul escuro', 'light blue': 'Azul claro', 'soft blue': 'Azul suave',
  'royal blue': 'Azul royal', navy: 'Azul marinho', indigo: 'Índigo',
  purple: 'Roxo', violet: 'Violeta', fuchsia: 'Fucsia', pink: 'Rosa',
  red: 'Vermelho', orange: 'Laranja', salmon: 'Salmão', yellow: 'Amarelo',
  gold: 'Dourado', green: 'Verde', 'lime green': 'Verde limão', 'neon green': 'Verde neon',
  teal: 'Verde azulado', mint: 'Menta', cyan: 'Ciano', turquoise: 'Turquesa',
  brown: 'Marrom', beige: 'Bege', cream: 'Creme', ivory: 'Marfim',
  gradient: 'Gradiente', pastel: 'Pastel', neon: 'Neon', metallic: 'Metálico',
  bright: 'Vibrante', accent: 'Destaque', warm: 'Quente', cool: 'Frio',
  neutral: 'Neutro', colorful: 'Colorido', vibrant: 'Vibrante',
  pearlescent: 'Perolado', holographic: 'Holográfico', lavender: 'Lavanda',
  blueberry: 'Mirtilo',
}

const toneMap: Record<string, string> = {
  professional: 'Profissional', modern: 'Moderno', elegant: 'Elegante',
  sophisticated: 'Sofisticado', minimal: 'Minimalista', clean: 'Clean',
  bold: 'Ousado', playful: 'Divertido', friendly: 'Amigável', fun: 'Alegre',
  creative: 'Criativo', inspirational: 'Inspirador', dramatic: 'Dramático',
  dark: 'Escuro', light: 'Claro', warm: 'Aconchegante', cool: 'Frio',
  energetic: 'Energético', calm: 'Calmo', luxury: 'Luxuoso', casual: 'Casual',
  corporate: 'Corporativo', retro: 'Retrô', futuristic: 'Futurista',
}

function translateKeywords(keywords: string[], map: Record<string, string>): string[] {
  return keywords.map((k) => map[k.toLowerCase()] ?? k)
}

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
      colorKeywords: translateKeywords(t.colorKeywords ?? [], colorMap),
      toneKeywords: translateKeywords(t.toneKeywords ?? [], toneMap),
    }))

    return NextResponse.json({ themes })
  } catch {
    return NextResponse.json({ themes: [] })
  }
}
