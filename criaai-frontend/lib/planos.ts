// Planos da plataforma (usado na tela de Planos e no aviso do Gerenciador de Anuncios).
// Os links de pagamento (Hubla) e os precos ficam aqui, em um so lugar.
export const HUBLA_LINKS: Record<string, string> = {
  Starter: 'https://pay.hub.la/0AueQQcwJxUeV9BE1ax7',
  Pro: 'https://pay.hub.la/16HkQulcBTksGN8AEnow',
  Premium: 'https://pay.hub.la/TwrkZegsChmWcaJ9LO4z',
}

export type PlanoInfo = {
  name: string
  price: number
  featured?: boolean
  features: string[]
  gerenciador: boolean // inclui o Gerenciador de Anuncios?
  extra?: { title: string; desc: string }
}

export const PLANOS: PlanoInfo[] = [
  { name: 'Starter', price: 39.90, gerenciador: false, features: ['10 criativos por mês', '2 e-books por mês', '2 sites por mês'] },
  { name: 'Pro', price: 49.90, featured: true, gerenciador: true, features: ['18 criativos por mês', '3 e-books por mês', '3 sites por mês'] },
  {
    name: 'Premium', price: 79.90, gerenciador: true, features: ['30 criativos por mês', '10 e-books por mês', '10 sites por mês'],
    extra: { title: 'Grupo VIP no WhatsApp com o Breno', desc: 'Um grupo fechado no WhatsApp, só para quem é Premium, para conversar com o Breno de perto.' },
  },
]

// Do menor para o maior (para saber o que e upgrade)
export const NIVEL_PLANO: Record<string, number> = { Starter: 1, Pro: 2, Premium: 3 }

export function precoBR(v: number): string { return v.toFixed(2).replace('.', ',') }
