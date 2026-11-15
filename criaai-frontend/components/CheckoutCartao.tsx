'use client'
// Janela de pagamento no cartao (checkout transparente do Mercado Pago, "Card Payment Brick").
// Os dados do cartao sao digitados no campo do proprio Mercado Pago; a plataforma so recebe um token.
import { useEffect, useRef, useState } from 'react'

declare global { interface Window { MercadoPago?: any } }

const SDK = 'https://sdk.mercadopago.com/js/v2'

function carregarSdk(): Promise<void> {
  return new Promise(function(ok, falha) {
    if (window.MercadoPago) { ok(); return }
    const ja = document.querySelector('script[src="' + SDK + '"]') as HTMLScriptElement | null
    const s = ja || document.createElement('script')
    s.addEventListener('load', function() { ok() })
    s.addEventListener('error', function() { falha(new Error('sdk')) })
    if (!ja) { s.src = SDK; s.async = true; document.head.appendChild(s) }
  })
}

export default function CheckoutCartao({ plano, valor, email, onFechar, onSucesso }: { plano: string; valor: number; email: string; onFechar: () => void; onSucesso: (msg: string) => void }) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const controle = useRef<any>(null)
  const chave = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY

  useEffect(function() {
    let vivo = true
    if (!chave) { setErro('O pagamento pelo cartão ainda não foi configurado.'); setCarregando(false); return }
    carregarSdk().then(async function() {
      if (!vivo || !window.MercadoPago) return
      const mpObj = new window.MercadoPago(chave, { locale: 'pt-BR' })
      controle.current = await mpObj.bricks().create('cardPayment', 'mp-cartao', {
        initialization: { amount: valor, payer: { email } },
        customization: {
          paymentMethods: { maxInstallments: 1, types: { excluded: ['debit_card'] } },
          visual: {
            hideFormTitle: false,
            texts: { formTitle: 'Cartão de crédito', formSubmit: 'Assinar agora' },
            // Tom roxo da plataforma
            style: { theme: 'default', customVariables: { baseColor: '#5b4ef8', baseColorFirstVariant: '#4b3fe8', baseColorSecondVariant: '#7c6ffc', buttonTextColor: '#ffffff', borderRadiusMedium: '10px', borderRadiusLarge: '14px', formBackgroundColor: 'transparent' } },
          },
        },
        callbacks: {
          onReady: function() { if (vivo) setCarregando(false) },
          onError: function(e: any) { console.error('[checkout-cartao]', e && e.type); if (vivo) { setCarregando(false); if (e && e.type === 'critical') setErro('Não foi possível abrir o pagamento. Recarregue a página e tente de novo.') } },
          onSubmit: function(dados: any) {
            setErro(''); setEnviando(true)
            return fetch('/api/mp/assinar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plano, token: dados.token, email: dados.payer && dados.payer.email }) })
              .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j } }) })
              .then(function(x) {
                setEnviando(false)
                if (!x.ok) { setErro(x.j.error || 'Não foi possível concluir. Tente de novo.'); throw new Error('recusado') }
                onSucesso(x.j.mensagem || 'Assinatura feita!')
              })
              .catch(function(e) { setEnviando(false); if (String(e && e.message) !== 'recusado') setErro('Sem conexão. Tente de novo.'); throw e })
          },
        },
      })
    }).catch(function() { if (vivo) { setErro('Não foi possível abrir o pagamento. Confira a internet e tente de novo.'); setCarregando(false) } })
    return function() { vivo = false; try { if (controle.current) controle.current.unmount() } catch (e) {} }
  }, [])

  useEffect(function() {
    function tecla(e: KeyboardEvent) { if (e.key === 'Escape' && !enviando) onFechar() }
    window.addEventListener('keydown', tecla)
    return function() { window.removeEventListener('keydown', tecla) }
  }, [enviando])

  return (
    <div onClick={function() { if (!enviando) onFechar() }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,8,30,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ck-titulo" onClick={function(e) { e.stopPropagation() }} style={{ position: 'relative', width: '100%', maxWidth: 460, maxHeight: '94vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 20, padding: '22px 20px 18px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <button type="button" onClick={onFechar} disabled={enviando} aria-label="Fechar" style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--muted2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-x" /></button>
        <div id="ck-titulo" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--text)', paddingRight: 40, marginBottom: 14 }}>Assinar agora</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Plano {plano}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>R$ {valor.toFixed(2).replace('.', ',')}/mês</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#5b4ef8', background: 'rgba(91,78,248,0.10)', borderRadius: 999, padding: '5px 10px' }}><i className="ti ti-credit-card" />Cartão de crédito</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(91,78,248,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: 'var(--text)' }}>Cobrado todo mês no cartão</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#4b3fe8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>R$ {valor.toFixed(2).replace('.', ',')}</span>
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 6 }}>A cobrança se repete todo mês, sozinha. Você pode cancelar quando quiser na tela de Planos.</div>
        {carregando && !erro && <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--muted2)', fontSize: 14 }}><i className="ti ti-loader" style={{ display: 'block', fontSize: 26, marginBottom: 6 }} />Abrindo o pagamento…</div>}
        <div id="mp-cartao" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}><i className="ti ti-lock" style={{ color: '#5b4ef8' }} />Pagamento seguro pelo Mercado Pago. A plataforma não guarda os dados do seu cartão.</div>
        {erro && <div role="alert" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(220,38,38,0.08)', color: '#b91c1c', borderRadius: 12, padding: '10px 12px', fontSize: 13.5, fontWeight: 700, lineHeight: 1.45 }}><i className="ti ti-alert-triangle" style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }} />{erro}</div>}
      </div>
    </div>
  )
}
