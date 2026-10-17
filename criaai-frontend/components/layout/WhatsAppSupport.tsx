'use client'
import { usePathname } from 'next/navigation'

const WHATSAPP = '553791348869'
// Telas onde o botao atrapalharia (ja tem WhatsApp ou o botao de enviar fica no mesmo canto)
const HIDE_ON = ['/dashboard/suporte', '/dashboard/chat', '/dashboard/admin/conversas']

// Botao flutuante de suporte pelo WhatsApp, em todas as telas do aluno
export default function WhatsAppSupport() {
  const pathname = usePathname() || ''
  if (HIDE_ON.some(function(p) { return pathname.indexOf(p) === 0 })) return null
  return (
    <>
      <style>{`
        @keyframes wsPulse { 0% { box-shadow: 0 0 0 0 rgba(37,211,102,0.55), 0 6px 18px rgba(0,0,0,0.25); } 70% { box-shadow: 0 0 0 14px rgba(37,211,102,0), 0 6px 18px rgba(0,0,0,0.25); } 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0), 0 6px 18px rgba(0,0,0,0.25); } }
        .ws-fab { position: fixed; right: 16px; bottom: 16px; z-index: 40; width: 54px; height: 54px; border-radius: 50%; background: #25d366; color: #fff; display: flex; align-items: center; justify-content: center; text-decoration: none; animation: wsPulse 2.4s ease-out infinite; }
        .ws-fab i { font-size: 30px; line-height: 1; }
        .ws-fab:hover { transform: scale(1.06); }
      `}</style>
      <a
        className="ws-fab"
        href={'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Ola, preciso de suporte na Plataforma do Cristao Prospero')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com o suporte no WhatsApp"
        title="Falar com o suporte no WhatsApp"
      >
        <i className="ti ti-brand-whatsapp" />
      </a>
    </>
  )
}
