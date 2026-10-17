// Converte um audio gravado no navegador (webm/mp4) para MP3, que o WhatsApp aceita sem problema.
// So roda no navegador.
export async function paraMp3(blob: Blob): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
  const ctx = new Ctx()
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    const n = buf.length
    // mistura os canais em um so e converte para inteiros de 16 bits
    const mono = new Int16Array(n)
    const canais: Float32Array[] = []
    for (let c = 0; c < buf.numberOfChannels; c++) canais.push(buf.getChannelData(c))
    for (let i = 0; i < n; i++) {
      let s = 0
      for (let c = 0; c < canais.length; c++) s += canais[c][i]
      s /= canais.length
      s = Math.max(-1, Math.min(1, s))
      mono[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    const enc = new Mp3Encoder(1, buf.sampleRate, 64)
    const partes: Uint8Array[] = []
    for (let i = 0; i < n; i += 1152) {
      const out = enc.encodeBuffer(mono.subarray(i, i + 1152))
      if (out.length > 0) partes.push(new Uint8Array(out))
    }
    const fim = enc.flush()
    if (fim.length > 0) partes.push(new Uint8Array(fim))
    return new Blob(partes as BlobPart[], { type: 'audio/mpeg' })
  } finally {
    try { await ctx.close() } catch (e) {}
  }
}
