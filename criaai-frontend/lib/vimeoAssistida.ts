// Acompanha o video do Vimeo e avisa o servidor quando o aluno realmente assistiu (pelo menos 70% do tempo, sem pular, com a aba aberta e o som ligado).
// Usa o player oficial do Vimeo (player.js). Se algo falhar, so nao conta o ponto; o video continua normal.
declare global { interface Window { Vimeo?: any } }

let carregando: Promise<any> | null = null
function carregarPlayerJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject()
  if (window.Vimeo && window.Vimeo.Player) return Promise.resolve(window.Vimeo)
  if (carregando) return carregando
  carregando = new Promise(function(resolve, reject) {
    const s = document.createElement('script')
    s.src = 'https://player.vimeo.com/api/player.js'
    s.async = true
    s.onload = function() { window.Vimeo && window.Vimeo.Player ? resolve(window.Vimeo) : reject() }
    s.onerror = function() { carregando = null; reject() }
    document.head.appendChild(s)
  })
  return carregando
}

export function rastrearAula(iframe: HTMLIFrameElement, videoId: string): () => void {
  let player: any = null
  let ultimo = -1
  let assistido = 0
  let enviado = false
  let vivo = true
  let volume = 1
  carregarPlayerJs().then(function(Vimeo) {
    if (!vivo) return
    player = new Vimeo.Player(iframe)
    // Para contar, a aba precisa estar aberta na tela e o video com som
    try { player.getVolume().then(function(v: number) { volume = v }).catch(function() {}) } catch (e) {}
    player.on('volumechange', function(d: any) { if (d && typeof d.volume === 'number') volume = d.volume })
    player.on('timeupdate', function(d: any) {
      if (enviado || !d || !d.duration) return
      // So soma o tempo que passou de verdade (se a pessoa pular para o fim, nao conta)
      const aberta = typeof document === 'undefined' || document.visibilityState === 'visible'
      if (aberta && volume > 0 && ultimo >= 0 && d.seconds > ultimo && d.seconds - ultimo < 2.5) assistido += d.seconds - ultimo
      ultimo = d.seconds
      if (assistido >= d.duration * 0.7) {
        enviado = true
        try { fetch('/api/aulas/assistida', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId }), keepalive: true }).catch(function() {}) } catch (e) {}
      }
    })
  }).catch(function() {})
  return function() {
    vivo = false
    try { if (player) { player.off('timeupdate'); player.off('volumechange') } } catch (e) {}
  }
}
