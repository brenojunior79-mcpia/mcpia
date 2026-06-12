import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY!
const CREATOMATE_TEMPLATE_ID = process.env.CREATOMATE_TEMPLATE_ID!
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!
const AGENCY_VIDEO_LIMIT = 100

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

async function getUnsplashImages(query: string): Promise<string[]> {
  try {
    const res = await fetch(
      'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&per_page=4&orientation=portrait',
      { headers: { 'Authorization': 'Client-ID ' + UNSPLASH_ACCESS_KEY } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map(function(img: any) { return img.urls.regular })
  } catch {
    return []
  }
}

async function generateScript(niche: string, tone: string, customPrompt: string) {
  const toneMap: Record<string, string> = {
    lifestyle: 'inspirador, caloroso e acessivel',
    urgencia: 'urgente, direto e com senso de escassez',
    luxo: 'sofisticado, elegante e premium',
    humor: 'divertido, descontraido e com bom humor',
  }
  const toneDesc = toneMap[tone] || toneMap['lifestyle']
  const userInstructions = customPrompt && customPrompt.trim().length > 10
    ? 'Instrucoes adicionais: ' + customPrompt
    : ''

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Voce e especialista em criativos de vendas para redes sociais. Crie roteiros curtos de alta conversao em portugues brasileiro. Retorne APENAS JSON valido com 4 campos: text1 (hook, max 80 chars), text2 (problema/desejo, max 100 chars), text3 (beneficio principal, max 100 chars), text4 (CTA urgente, max 80 chars). Sem markdown, sem explicacoes.',
      },
      {
        role: 'user',
        content: 'Produto/niche: ' + niche + '. Tom: ' + toneDesc + '. ' + userInstructions,
      },
    ],
    temperature: 0.8,
    max_tokens: 300,
  })

  const content = response.choices[0].message.content || '{}'
  const clean = content.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    return {
      text1: String(parsed.text1 || 'Voce precisa ver isso!'),
      text2: String(parsed.text2 || 'Transforme sua vida hoje'),
      text3: String(parsed.text3 || 'Resultado garantido'),
      text4: String(parsed.text4 || 'Clique agora e saiba mais!'),
    }
  } catch {
    return {
      text1: 'Voce precisa ver isso!',
      text2: 'Transforme sua vida com ' + niche,
      text3: 'Resultado garantido ou dinheiro de volta',
      text4: 'Clique agora e saiba mais!',
    }
  }
}

async function createRender(script: { text1: string; text2: string; text3: string; text4: string }, images: string[]): Promise<string> {
  const modifications: Record<string, string> = {
    'Text-1.text': script.text1,
    'Text-2.text': script.text2,
    'Text-3.text': script.text3,
    'Text-4.text': script.text4,
  }

  if (images[0]) modifications['Background-1.source'] = images[0]
  if (images[1]) modifications['Background-2.source'] = images[1]
  if (images[2]) modifications['Background-3.source'] = images[2]
  if (images[3]) modifications['Background-4.source'] = images[3]

  const res = await fetch('https://api.creatomate.com/v2/renders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + CREATOMATE_API_KEY,
    },
    body: JSON.stringify({
      template_id: CREATOMATE_TEMPLATE_ID,
      modifications: modifications,
    }),
