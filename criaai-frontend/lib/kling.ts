const KLING_API_URL = process.env.KLING_API_URL || 'https://api.klingapi.com'
const KLING_API_KEY = process.env.KLING_API_KEY!

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
  const response = await fetch(`${KLING_API_URL}/v1/videos/image2video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KLING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kling-v1-5',
      image_url: params.imageUrl,
      prompt,
      negative_prompt: 'blurry, low quality, text, watermark, distorted face, bad hands',
      cfg_scale: 0.5,
      mode: 'std',
      duration: params.duration || 5,
      aspect_ratio: '9:16',
    }),
  })
  if (!response.ok) throw new Error(`Kling API error: ${await response.text()}`)
  const data = await response.json()
  const jobId = data.task_id || data.data?.task_id
  if (!jobId) throw new Error('Kling não retornou task_id')
  return { jobId, status: 'pending' }
}

export async function checkKlingJob(jobId: string): Promise<KlingJob> {
  const response = await fetch(`${KLING_API_URL}/v1/videos/${jobId}`, {
    headers: { 'Authorization': `Bearer ${KLING_API_KEY}` },
  })
  if (!response.ok) throw new Error('Kling status check failed')
  const data = await response.json()
  const task = data.data || data
  const statusRaw = task.status || task.task_status || ''
  const statusMap: Record<string, KlingJob['status']> = {
    submitted: 'pending', pending: 'pending',
    processing: 'processing', running: 'processing',
    succeed: 'completed', completed: 'completed', success: 'completed',
    failed: 'failed', error: 'failed',
  }
  const status = statusMap[statusRaw] || 'processing'
  const videoUrl = task.video_url || task.result?.video_url || task.task_result?.videos?.[0]?.url
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
