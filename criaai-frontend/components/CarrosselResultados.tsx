'use client'
// Carrossel de prints de resultados de alunos (tela inicial). Passa sozinho a cada poucos segundos, o aluno tambem pode
// arrastar com o dedo. Toque na imagem para ampliar. Para acrescentar um print: coloque o arquivo em public/resultados/
// e inclua o caminho na lista abaixo.
import { useEffect, useRef, useState } from 'react'

const PRINTS = [
  '/resultados/resultado-1.jpeg',
  '/resultados/resultado-2.jpeg',
  '/resultados/resultado-3.jpeg',
  '/resultados/resultado-4.jpg',
  '/resultados/resultado-5.jpg',
]

export default function CarrosselResultados({ onOpen }: { onOpen: (src: string) => void }) {
  const trilho = useRef<HTMLDivElement>(null)
  const pausaAte = useRef(0)
  const [ativo, setAtivo] = useState(0)

  function irPara(i: number) {
    const t = trilho.current
    if (!t) return
    const el = t.children[i] as HTMLElement | undefined
    if (!el) return
    t.scrollTo({ left: el.offsetLeft - t.offsetLeft - 4, behavior: 'smooth' })
  }

  // passa sozinho (a cada 3,5 s); se a pessoa mexer, espera um pouco antes de voltar a passar
  useEffect(function() {
    let reduzido = false
    try { reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) { reduzido = false }
    if (reduzido) return
    const id = window.setInterval(function() {
      if (Date.now() < pausaAte.current) return
      const t = trilho.current
      if (!t) return
      const fim = t.scrollLeft + t.clientWidth >= t.scrollWidth - 6
      const prox = fim ? 0 : Math.min(PRINTS.length - 1, ativo + 1)
      irPara(prox)
    }, 3500)
    return function() { window.clearInterval(id) }
  }, [ativo])

  // descobre qual print esta mais a esquerda (para as bolinhas)
  function aoRolar() {
    const t = trilho.current
    if (!t) return
    let melhor = 0
    let dist = Infinity
    for (let i = 0; i < t.children.length; i++) {
      const el = t.children[i] as HTMLElement
      const d = Math.abs(el.offsetLeft - t.offsetLeft - t.scrollLeft)
      if (d < dist) { dist = d; melhor = i }
    }
    if (t.scrollLeft + t.clientWidth >= t.scrollWidth - 6) melhor = PRINTS.length - 1
    setAtivo(melhor)
  }
  function pausar() { pausaAte.current = Date.now() + 8000 }

  return (
    <div>
      <div
        ref={trilho}
        onScroll={aoRolar}
        onPointerDown={pausar}
        onMouseEnter={pausar}
        onTouchStart={pausar}
        className="carrossel-resultados"
        style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', padding: '2px 2px 6px', WebkitOverflowScrolling: 'touch' }}
      >
        {PRINTS.map(function(src, i) {
          return (
            <div
              key={src}
              onClick={function() { onOpen(src) }}
              style={{ flex: '0 0 auto', scrollSnapAlign: 'start', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'zoom-in', boxShadow: 'var(--shadow-sm)' }}
            >
              <img
                src={src}
                alt={'Resultado de aluno ' + (i + 1)}
                loading={i < 2 ? 'eager' : 'lazy'}
                draggable={false}
                style={{ height: 'min(440px, 62vh)', width: 'auto', maxWidth: '84vw', display: 'block', objectFit: 'contain' }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 8 }}>
        {PRINTS.map(function(src, i) {
          return (
            <button
              key={src}
              type="button"
              aria-label={'Ver resultado ' + (i + 1)}
              onClick={function() { pausar(); irPara(i) }}
              style={{ width: i === ativo ? 22 : 8, height: 8, borderRadius: 99, border: 0, padding: 0, cursor: 'pointer', background: i === ativo ? 'var(--accent)' : 'var(--border)', transition: 'all .25s' }}
            />
          )
        })}
      </div>
      <style>{'.carrossel-resultados::-webkit-scrollbar{display:none}'}</style>
    </div>
  )
}
