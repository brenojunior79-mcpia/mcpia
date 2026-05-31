// lib/kling.ts — Integração com Kling AI para geração de vídeo

const KLING_API_URL = process.env.KLING_API_URL!
const KLING_API_KEY = process.env.KLING_API_KEY!

export interface KlingGenerateParams {
  imageUrl: string      // URL pública da imagem do produto
  niche: string         // nicho/categoria do produto
  tone: string          // lifestyle | urgencia | luxo | humor
  duration?: number     // duração em segundos (padrão 5)
}

export interface KlingJob {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  cost?: number
}

// GPT-4o analisa a imagem e gera o prompt ideal para o Kling
export async function buildKlingPrompt(niche: string, tone: string): Promise<string> {
  const toneMap: Record<string, string> = {
    lifestyle: 'natural lifestyle setting, warm lighting, everyday use, relatable and aspirational',
    urgencia:  'dynamic fast-paced scene, bold movement, high energy, urgency and excitement',
    luxo:      'luxury setting, premium materials visible, elegant slow motion, sophisticated atmosphere',
    humor:     'playful fun scene, expressive movement, lighthearted and entertaining, smile-inducing',
  }

  const toneDesc = toneMap[tone] || toneMap.lifestyle

  return `A professional product advertisement video. The ${niche} product is shown being used naturally by hands in a ${toneDesc}. 
Smooth cinematic camera movement, professional commercial quality lighting. 
The product stays clearly visible and in focus throughout. 
No text overlays. Realistic motion. Duration 5 seconds. Vertical format 9:16.`
}

// Envia job de geração para o Kling
export async function createKlingJob(params: KlingGenerateParams): Promise<KlingJob> {
  const prompt = await buildKlingPrompt(params.niche, params.tone)

  const response = await fetch(`${KLING_API_URL}/videos/image2video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KLING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: 'kling-v1-5',
      image_url: params.imageUrl,
      prompt,
      negative_prompt: 'blurry, low quality, text, watermark, distorted face, bad hands',
      cfg_scale: 0.5,
      mode: 'std',
      duration: params.duration || 5,
      aspect_ratio: '9:16',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Kling API error: ${err}`)
  }

  const data = await response.json()
  return {
    jobId: data.data?.task_id,
    status: 'pending',
  }
}

// Verifica o status de um job no Kling (polling)
export async function checkKlingJob(jobId: string): Promise<KlingJob> {
  const response = await fetch(`${KLING_API_URL}/videos/image2video/${jobId}`, {
    headers: { 'Authorization': `Bearer ${KLING_API_KEY}` },
  })

  if (!response.ok) throw new Error('Kling status check failed')

  const data = await response.json()
  const task = data.data

  const statusMap: Record<string, KlingJob['status']> = {
    submitted: 'pending',
    processing: 'processing',
    succeed: 'completed',
    failed: 'failed',
  }

  return {
    jobId,
    status: statusMap[task.task_status] || 'processing',
    videoUrl: task.task_result?.videos?.[0]?.url,
    cost: 0.14, // custo fixo por vídeo em USD
  }
}

// Aguarda conclusão do job com polling automático (máx 3 min)
export async function waitForKlingJob(jobId: string): Promise<KlingJob> {
  const maxAttempts = 36 // 36 x 5s = 3 minutos
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000)) // espera 5s
    const job = await checkKlingJob(jobId)
    if (job.status === 'completed' || job.status === 'failed') return job
    attempts++
  }

  throw new Error('Kling job timeout após 3 minutos')
}
