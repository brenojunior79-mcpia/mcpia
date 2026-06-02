import crypto from 'crypto'

const KLING_API_URL = process.env.KLING_API_URL || 'https://api.klingai.com'
const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY!
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY!

function generateKlingToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    iss: KLING_ACCESS_KEY,
    exp: now + 1800,
    nbf: now - 5,
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', KLING_SECRET_KEY).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

export interface KlingGenerateParams {
  imageUrl: string
  niche: string
  tone: string
  duration?: number
}

export interface KlingJob {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  cost?: number
}

export async function buildKlingPrompt(niche: string, tone: string): Promise<string> {
  const toneMap: Record<string, string> = {
    lifestyle: 'natural lifestyle setting, warm lighting, everyday use, relatable and aspirational',
    urgencia: 'dynamic fast-paced scene, bold movement, high energy, urgency and excitement',
    luxo: 'luxury setting, premium materials visible, elegant slow motion, sophisticated atmosphere',
    humor: 'playful fun scene, expressive movement, lighthearted and entertaining, smile-inducing',
  }
  return `A professional product advertisement video. The ${niche} product is shown being used naturally by hands in a ${toneMap[tone] || toneMap.lifestyle}. Smooth cinematic camera movement, professional commercial quality lighting. The product stays clearly visible and in focus throughout. No text overlays. Realistic motion. Duration 5 seconds. Vertical format 9:16.`
}

export async function createKlingJob(params: KlingGenerateParams): Promise<KlingJob> {
  const prompt = await buildKlingPrompt(params.niche, params.tone)
  const token = generateKlingToken()
  const response = await fetch(`${KLING_API_URL}/v1/videos/image2video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: 'kling-v1-5',
      image: params.imageUrl,
      prompt,
      negative_prompt: 'blurry, low quality, text, watermark, distorted face, bad hands',
      cfg_scale: 0.5,
      mode: 'std',
      duration: String(params.duration || 5),
      aspect_ratio: '9:16',
    }),
  })
  if (!response.ok) throw new Error(`Kling API error: ${await response.text()}`)
  const data = await response.json()
  const jobId = data.data?.task_id
  if (!jobId) throw new Error(`Kling não retornou task_id: ${JSON.stringify(data)}`)
  return { jobId, status: 'pending' }
}

export async function checkKlingJob(jobId: string): Promise<KlingJob> {
  const token = generateKlingToken()
  const response = await fetch(`${KLING_API_URL}/v1/videos/image2video/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Kling status check failed')
  const data = await response.json()
  const task = data.data
  const statusMap: Record<string, KlingJob['status']> = {
    submitted: 'pending', processing: 'processing',
    succeed: 'completed', failed: 'failed',
  }
  const status = statusMap[task?.task_status] || 'processing'
  const videoUrl = task?.task_result?.videos?.[0]?.url
  return { jobId, status, videoUrl, cost: 0.14 }
}

export async function waitForKlingJob(jobId: string): Promise<KlingJob> {
  const maxAttempts = 60
  let attempts = 0
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000))
    const job = await checkKlingJob(jobId)
    if (job.status === 'completed' || job.status === 'failed') return job
    attempts++
  }
  throw new Error('Kling job timeout após 5 minutos')
}
