'use client'
// Faixa de prints de resultados de alunos (tela inicial). Corre sem parar, em volta, da direita para a esquerda.
// Toque na imagem para ampliar. Para acrescentar um print: coloque o arquivo em public/resultados/ e inclua o caminho na lista abaixo.
import { useEffect, useState } from 'react'

const PRINTS = [
  '/resultados/resultado-1.jpeg',
  '/resultados/resultado-2.jpeg',
  '/resultados/resultado-3.jpeg',
  '/resultados/resultado-4.jpg',
  '/resultados/resultado-5.jpg',
]

export default function CarrosselResultados({ onOpen }: { onOpen: (src: string) => void }) {
  const [reduzido, setReduzido] = useState(false)
  useEffect(function() {
    try { setReduzido(window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) { /* segue com a animacao */ }
  }, [])

  // a lista aparece duas vezes seguidas: quando a primeira metade sai da tela, a segunda ocupa o mesmo lugar e a faixa recomeca sem pulo
  const lista = reduzido ? PRINTS : PRINTS.concat(PRINTS)

  return (
    <div style={{ overflowX: reduzido ? 'auto' : 'hidden', overflowY: 'hidden', position: 'relative', margin: '0 -4px' }}>
      <div className={reduzido ? '' : 'faixa-resultados'} style={{ display: 'flex', gap: 14, width: 'max-content', padding: '2px 4px 6px' }}>
        {lista.map(function(src, i) {
          const n = (i % PRINTS.length) + 1
          return (
            <div
              key={src + '-' + i}
              onClick={function() { onOpen(src) }}
              aria-hidden={i >= PRINTS.length ? true : undefined}
              style={{ flex: '0 0 auto', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'zoom-in', boxShadow: 'var(--shadow-sm)' }}
            >
              <img
                src={src}
                alt={'Resultado de aluno ' + n}
                draggable={false}
                style={{ height: 'min(420px, 60vh)', width: 'auto', display: 'block' }}
              />
            </div>
          )
        })}
      </div>
      <style>{'@keyframes faixaResultados{from{transform:translateX(0)}to{transform:translateX(calc(-50% - 7px))}}.faixa-resultados{animation:faixaResultados 45s linear infinite;will-change:transform}'}</style>
    </div>
  )
}
