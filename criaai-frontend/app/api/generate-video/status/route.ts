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
  imageUrl: string | null
  niche: string
  tone: string
  duration?: number
  customPrompt?: string
}

export interface KlingJob {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  cost?: number
  mode?: string
}

export async function buildKlingPrompt(niche: string, tone: string, customPrompt?: string): Promise<string> {
  const toneMap: Record<string, string> = {
    lifestyle: 'smiling warmly at the camera, relaxed and natural, cozy home setting with warm natural lighting, authentic UGC feel',
    urgencia: 'speaking directly to camera with urgency and excitement, using expressive hand gestures, energetic and dynamic movement',
    luxo: 'speaking confidently in an elegant premium setting, slow deliberate movements, soft luxury lighting, sophisticated atmosphere',
    humor: 'laughing and using playful exaggerated expressions, fun gestures, bright cheerful background, entertaining and light-hearted',
  }

  const toneDescription = toneMap[tone] || toneMap['lifestyle']

  if (customPrompt && customPrompt.trim().length > 10) {
    return `UGC video ad${niche ? ' for "' + niche + '"' : ''}. ${customPrompt.trim()}. The person is ${toneDescription}. Vertical 9:16 format, cinematic quality, realistic human motion, no text overlays, no watermarks.`
  }

  return `UGC video ad. A real person talks enthusiastically about "${niche}" directly to camera. The person is ${toneDescription}. Product is the main focus. Authentic user-generated content style, vertical 9:16 format, cinematic quality, realistic motion, no text overlays, no watermarks.`
}

export async function createKlingJob(params: KlingGenerateParams): Promise<KlingJob> {
  const prompt = await buildKlingPrompt(params.niche, params.tone, params.customPrompt)
  const token = generateKlingToken()
  const duration = params.duration || 10
  const mode = params.imageUrl ? 'image2video' : 'text2video'

  console.log('[kling] mode:', mode)
  console.log('[kling] duration:', duration)
  console.log('[kling] prompt:', prompt)

  let endpoint: string
  let body: any

  if (params.imageUrl) {
    endpoint = `${KLING_API_URL}/v1/videos/image2video`
    body = {
      model_name: 'kling-v1-5',
      image: params.imageUrl,
      prompt,
      negative_prompt: 'blurry, low quality, text overlay, watermark, distorted face, bad anatomy, multiple people, cartoon, animation, CGI',
      cfg_scale: 0.5,
      mode: 'std',
      duration: String(duration),
      aspect_ratio: '9:16',
    }
  } else {
    endpoint = `${KLING_API_URL}/v1/videos/text2video`
    body = {
      model_name: 'kling-v1-5',
      prompt,
      negative_prompt: 'blurry, low quality, text overlay, watermark, distorted face, bad anatomy, multiple people, cartoon, animation, CGI',
      cfg_scale: 0.5,
      mode: 'pro',
      duration: String(duration),
      aspect_ratio: '9:16',
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`Kling API error: ${await response.text()}`)
  const data = await response.json()
  const jobId = data.data?.task_id
  if (!jobId) throw new Error(`Kling nao retornou task_id: ${JSON.stringify(data)}`)
  return { jobId, status: 'pending', mode }
}

export async function checkKlingJob(jobId: string, mode?: string): Promise<KlingJob> {
  const token = generateKlingToken()
  const endpoint = mode === 'text2video'
    ? `${KLING_API_URL}/v1/videos/text2video/${jobId}`
    : `${KLING_API_URL}/v1/videos/image2video/${jobId}`

  const response = await fetch(endpoint, {
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
  return { jobId, status, videoUrl, cost: 0.14, mode }
}

export async function waitForKlingJob(jobId: string, mode?: string): Promise<KlingJob> {
  const maxAttempts = 60
  let attempts = 0
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000))
    const job = await checkKlingJob(jobId, mode)
    if (job.status === 'completed' || job.status === 'failed') return job
    attempts++
  }
  throw new Error('Kling job timeout apos 5 minutos')
}
