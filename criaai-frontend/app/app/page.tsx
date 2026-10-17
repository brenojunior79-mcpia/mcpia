'use client'
import { useEffect, useState } from 'react'

type Aba = 'android' | 'iphone' | 'pc'

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light, rgba(91,78,248,0.12))', color: 'var(--accent, #5b4ef8)', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text)' }}>{children}</div>
    </div>
  )
}

export default function AppPage() {
  const [aba, setAba] = useState<Aba>('android')

  useEffect(function() {
    try {
      const ua = navigator.userAgent || ''
      if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1)) setAba('iphone')
      else if (/android/i.test(ua)) setAba('android')
      else setAba('pc')
    } catch (e) {}
  }, [])

  const abas: { id: Aba; nome: string }[] = [
    { id: 'android', nome: 'Android' },
    { id: 'iphone', nome: 'iPhone' },
    { id: 'pc', nome: 'Computador' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f4f4f7)', color: 'var(--text, #0f0f1a)', padding: '28px 16px 48px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <img src="/icon-192.png" alt="Cristão Próspero" width={84} height={84} style={{ borderRadius: 20, boxShadow: '0 8px 24px rgba(91,78,248,0.25)' }} />
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '14px 0 6px', color: 'var(--text)' }}>Instale o app Cristão Próspero</h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--muted2, #6b6a7e)' }}>Escolha o seu aparelho e siga o passo a passo. Leva menos de 1 minuto.</p>
        </div>

        <div style={{ display: 'flex', gap: 6, background: 'var(--surface2, #eeeff3)', padding: 5, borderRadius: 14, marginBottom: 16 }}>
          {abas.map(function(a) {
            const ativa = aba === a.id
            return (
              <button key={a.id} onClick={function() { setAba(a.id) }}
                style={{ flex: 1, cursor: 'pointer', border: 0, borderRadius: 10, padding: '10px 4px', fontWeight: 700, fontSize: 14, background: ativa ? 'var(--surface, #fff)' : 'transparent', color: ativa ? 'var(--accent, #5b4ef8)' : 'var(--muted2, #6b6a7e)', boxShadow: ativa ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' }}>
                {a.nome}
              </button>
            )
          })}
        </div>

        <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, rgba(0,0,0,0.08))', borderRadius: 18, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {aba === 'android' && (
            <>
              <a href="/cristao-prospero.apk" download="Cristao-Prospero.apk"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', backgroundImage: 'linear-gradient(135deg,#5b4ef8,#7c6ffc)', color: '#fff', fontWeight: 800, fontSize: 17, padding: '15px 18px', borderRadius: 14, boxShadow: '0 8px 22px rgba(91,78,248,0.3)' }}>
                ⬇️ Baixar app para Android
              </a>
              <div style={{ marginTop: 14 }}>
                <Passo n={1}>Toque em <b>Baixar app para Android</b>. Se o celular perguntar, toque em <b>Baixar</b> ou <b>Manter</b>.</Passo>
                <Passo n={2}>Abra o arquivo <b>Cristao-Prospero.apk</b> (pela barra de notificações ou pelo app <b>Arquivos / Downloads</b>).</Passo>
                <Passo n={3}>Se aparecer <b>"Por segurança, o celular não permite instalar apps desta fonte"</b>, toque em <b>Configurações</b> e ligue <b>Permitir desta fonte</b>. Depois volte e abra o arquivo de novo.</Passo>
                <Passo n={4}>Toque em <b>Instalar</b>. Se o Google Play Protect mostrar um aviso, toque em <b>Mais detalhes → Instalar mesmo assim</b>.</Passo>
                <Passo n={5}>Abra o app <b>Cristão Próspero</b> e entre com o mesmo e-mail e senha de sempre.</Passo>
              </div>
              <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: 'rgba(217,119,6,0.1)', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text)' }}>
                <b>Já tinha o app antigo?</b> Desinstale o antigo antes de instalar este.
              </div>
              <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: 'var(--surface2, #eeeff3)', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text)' }}>
                <b>Prefere não baixar arquivo?</b> Abra <b>mcpia.site</b> no Chrome, toque nos 3 pontinhos (⋮) e escolha <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).
              </div>
            </>
          )}

          {aba === 'iphone' && (
            <>
              <div style={{ fontSize: 14, color: 'var(--muted2, #6b6a7e)', marginBottom: 6 }}>No iPhone a instalação é feita pelo Safari, sem arquivo.</div>
              <Passo n={1}>Abra <b>mcpia.site</b> no <b>Safari</b> (não funciona em outros navegadores).</Passo>
              <Passo n={2}>Toque no botão de <b>compartilhar</b> (o quadrado com a setinha para cima, na parte de baixo da tela).</Passo>
              <Passo n={3}>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</Passo>
              <Passo n={4}>Toque em <b>Adicionar</b>. O ícone do <b>Cristão Próspero</b> aparece na sua tela.</Passo>
              <Passo n={5}>Abra pelo ícone e entre com o seu e-mail e senha.</Passo>
              <a href="https://mcpia.site" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 10, backgroundImage: 'linear-gradient(135deg,#5b4ef8,#7c6ffc)', color: '#fff', fontWeight: 800, padding: '13px 16px', borderRadius: 14 }}>Abrir mcpia.site</a>
            </>
          )}

          {aba === 'pc' && (
            <>
              <div style={{ fontSize: 14, color: 'var(--muted2, #6b6a7e)', marginBottom: 6 }}>No computador você pode usar direto no navegador ou instalar como app.</div>
              <Passo n={1}>Abra <b>mcpia.site</b> no <b>Chrome</b> ou no <b>Edge</b>.</Passo>
              <Passo n={2}>Clique no ícone de <b>instalar</b> na barra de endereço (um monitor com uma setinha), ou no menu <b>⋮ → Instalar Cristão Próspero</b>.</Passo>
              <Passo n={3}>Pronto: ele abre em uma janela própria, como um programa.</Passo>
              <a href="https://mcpia.site" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 10, backgroundImage: 'linear-gradient(135deg,#5b4ef8,#7c6ffc)', color: '#fff', fontWeight: 800, padding: '13px 16px', borderRadius: 14 }}>Abrir a plataforma</a>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted2, #6b6a7e)', marginTop: 16 }}>Problemas para instalar? Chame o suporte dentro da plataforma.</p>
      </div>
    </div>
  )
}
