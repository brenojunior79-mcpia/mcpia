// Modelo do e-mail (usado no envio e na previa do admin). Sem dependencias do servidor.
export const SITE_URL = 'https://mcpia.site'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function firstNameOf(full: string | null | undefined) {
  return ((full || '').trim().split(' ')[0]) || ''
}

// Aceita somente https:// ou caminho dentro da plataforma (/dashboard/...)
export function normalizeButtonUrl(url: string): string | null {
  const u = (url || '').trim()
  if (!u) return null
  if (u.charAt(0) === '/' && u.charAt(1) !== '/') return SITE_URL + u
  if (/^https:\/\/[^\s]+$/i.test(u)) return u
  return null
}

function formatBody(message: string, name: string) {
  let text = esc(message).split('{{nome}}').join(esc(name || 'aluno'))
  // **negrito**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // links soltos
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#5b4ef8;">$1</a>')
  const paragraphs = text.split(/\n\s*\n/).map(function(p) { return p.trim() }).filter(Boolean)
  return paragraphs.map(function(p) {
    return '<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2a2d43;">' + p.replace(/\n/g, '<br>') + '</p>'
  }).join('')
}

export function buildEmail(opts: {
  subject: string
  message: string
  buttonText?: string
  buttonUrl?: string
  imageUrl?: string
  imageLink?: string
  name?: string
  unsubscribeUrl: string
}): { html: string, text: string } {
  const name = opts.name || ''
  const body = formatBody(opts.message, name)
  const btnUrl = normalizeButtonUrl(opts.buttonUrl || '')
  const btnText = (opts.buttonText || '').trim()
  const button = btnUrl && btnText
    ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:12px;background:linear-gradient(135deg,#5b4ef8,#ec4899);background-color:#5b4ef8;"><a href="' + esc(btnUrl) + '" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">' + esc(btnText) + '</a></td></tr></table>'
    : ''

  // Imagem no topo (opcional). Pode levar a um link ao clicar.
  const imgUrl = /^https:\/\/[^\s"'<>]+$/i.test((opts.imageUrl || '').trim()) ? (opts.imageUrl || '').trim() : ''
  const imgLink = normalizeButtonUrl(opts.imageLink || '')
  let image = ''
  if (imgUrl) {
    const img = '<img src="' + esc(imgUrl) + '" alt="' + esc(opts.subject) + '" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">'
    image = '<tr><td style="padding:0;line-height:0;font-size:0;">' + (imgLink ? '<a href="' + esc(imgLink) + '" style="text-decoration:none;">' + img + '</a>' : img) + '</td></tr>'
  }

  const html =
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(opts.subject) + '</title></head>' +
    '<body style="margin:0;padding:0;background:#f4f5fa;font-family:Arial,Helvetica,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fa;padding:24px 12px;"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">' +
    '<tr><td style="background:#5b4ef8;background-image:linear-gradient(135deg,#5b4ef8,#ec4899);padding:22px 28px;color:#ffffff;font-size:18px;font-weight:700;">Plataforma do Cristão Próspero</td></tr>' +
    image +
    '<tr><td style="padding:28px 28px 8px;">' + body + button + '</td></tr>' +
    '<tr><td style="padding:18px 28px 26px;border-top:1px solid #eceef6;font-size:12px;line-height:1.5;color:#8a8ea8;">' +
    'Você recebeu este e-mail porque tem cadastro na Plataforma do Cristão Próspero.<br>' +
    'Se não quiser mais receber, <a href="' + esc(opts.unsubscribeUrl) + '" style="color:#8a8ea8;">clique aqui para sair da lista</a>.' +
    '</td></tr></table></td></tr></table></body></html>'

  const plain = opts.message.split('{{nome}}').join(name || 'aluno').replace(/\*\*(.+?)\*\*/g, '$1') +
    (btnUrl && btnText ? '\n\n' + btnText + ': ' + btnUrl : '') +
    '\n\n--\nPara sair da lista: ' + opts.unsubscribeUrl

  return { html, text: plain }
}
