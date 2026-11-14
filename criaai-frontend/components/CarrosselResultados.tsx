'use client'
// Faixa de prints de resultados de alunos (tela inicial). Corre sem parar, em volta, da direita para a esquerda.
// Toque na imagem para ampliar. Para acrescentar um print: coloque o arquivo em public/resultados/ e inclua o caminho na lista abaixo.

const PRINTS = [
  '/resultados/resultado-1.jpeg',
  '/resultados/resultado-2.jpeg',
  '/resultados/resultado-3.jpeg',
  '/resultados/resultado-4.jpg',
  '/resultados/resultado-5.jpg',
]

export default function CarrosselResultados({ onOpen }: { onOpen: (src: string) => void }) {
  // a lista aparece duas vezes seguidas: quando a primeira metade sai da tela, a segunda ocupa o mesmo lugar e a faixa recomeca sem pulo
  const lista = PRINTS.concat(PRINTS)

  return (
    <div className="faixa-moldura" style={{ overflowX: 'hidden', overflowY: 'hidden', position: 'relative', margin: '0 -4px' }}>
      <div className="faixa-resultados" style={{ display: 'flex', gap: 14, width: 'max-content', padding: '2px 4px 6px' }}>
        {lista.map(function(src, i) {
          const n = (i % PRINTS.length) + 1
          return (
            <div
              key={src + '-' + i}
              onClick={function() { onOpen(src) }}
              aria-hidden={i >= PRINTS.length ? true : undefined}
              // Todos os cartoes do mesmo tamanho (antes cada print tinha uma largura e o print deitado ficava enorme).
              // O print inteiro continua aparecendo ao tocar para ampliar.
              style={{ flex: '0 0 auto', width: 'min(250px, 64vw)', height: 'min(420px, 60vh)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: '#efeae2', cursor: 'zoom-in', boxShadow: 'var(--shadow-sm)' }}
            >
              {/* O print aparece inteiro (sem cortar texto); a sobra fica com o bege do fundo do WhatsApp */}
              <img
                src={src}
                alt={'Resultado de aluno ' + n}
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          )
        })}
      </div>
      <style>{'@keyframes faixaResultados{from{transform:translateX(0)}to{transform:translateX(calc(-50% - 7px))}}.faixa-resultados{animation:faixaResultados 45s linear infinite;will-change:transform}.faixa-moldura:hover .faixa-resultados{animation-play-state:paused}.faixa-moldura{-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%)}@media (prefers-reduced-motion: reduce){.faixa-resultados{animation:none}.faixa-moldura{overflow-x:auto!important}}'}</style>
    </div>
  )
}
