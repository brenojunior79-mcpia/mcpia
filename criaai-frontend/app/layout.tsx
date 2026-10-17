import type { Metadata } from 'next'
import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'

export const metadata: Metadata = {
  title: 'Plataforma Cristão Prospero',
  description: 'Gere vídeos e ebooks com IA para escalar no Facebook Ads',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-32.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/tabler/tabler-icons.woff2?v3.49.0" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/fonts/tabler/tabler-icons.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5b4ef8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cristão Próspero" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mcpia_theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}
