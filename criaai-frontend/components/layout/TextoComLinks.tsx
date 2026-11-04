import React from 'react'

// Mostra o texto do chat com os links (https://...) clicaveis. Nao mexe em mais nada do texto.
export default function TextoComLinks({ texto }: { texto: string }) {
  const partes = String(texto || '').split(/(https?:\/\/[^\s)]+)/g)
  return (
    <>
      {partes.map(function(p, i) {
        if (/^https?:\/\//i.test(p)) {
          const m = p.match(/^(.*?)([.,;:!?]*)$/)
          const url = m ? m[1] : p
          const resto = m ? m[2] : ''
          return <React.Fragment key={i}><a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>{url}</a>{resto}</React.Fragment>
        }
        return <React.Fragment key={i}>{p}</React.Fragment>
      })}
    </>
  )
}
