// Copia o editor de video (ffmpeg.wasm) para /public/ffmpeg, para o navegador baixar do proprio site.
// Roda depois do npm install (inclusive na Vercel). Se falhar, nao quebra a instalacao.
const fs = require('fs')
const path = require('path')
try {
  const src = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd')
  const dst = path.join(__dirname, '..', 'public', 'ffmpeg')
  if (!fs.existsSync(src)) { console.log('[copy-ffmpeg] @ffmpeg/core nao encontrado, pulando'); process.exit(0) }
  fs.mkdirSync(dst, { recursive: true })
  for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) fs.copyFileSync(path.join(src, f), path.join(dst, f))
  console.log('[copy-ffmpeg] ok')
} catch (e) { console.log('[copy-ffmpeg] aviso:', e && e.message) }
