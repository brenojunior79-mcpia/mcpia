/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.klingai.com' },
    ],
  },
  async headers() {
    return [
      {
        // Fontes e icones: nunca mudam (o nome muda se trocar a versao), entao o navegador guarda por 1 ano
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Aplicativo Android: baixa o arquivo em vez de tentar abrir
        source: '/cristao-prospero.apk',
        headers: [
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
          { key: 'Content-Disposition', value: 'attachment; filename="Cristao-Prospero.apk"' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        // Liga o app Android ao site (abre em tela cheia, sem barra do navegador)
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
}

module.exports = nextConfig
