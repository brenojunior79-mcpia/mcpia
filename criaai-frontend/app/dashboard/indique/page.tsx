'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

const SITE = 'https://mcpia.site'
const PRECO = 297
const COMISSAO = 60

type Indicado = { nome: string; status: string; quando: string; libera_em: string | null }
type Saque = { id: string; valor: number; status: string; quando: string; pago_em: string | null }
type Overview = {
  code: string; cliques: number; cadastros: number; compras: number
  aguardando: number; liberado: number; em_saque: number; pago: number
  indicados: Indicado[]; saques: Saque[]; pix: { chave: string; tipo: string } | null; whatsapp: string | null
}

function brl(v: any): string {
  return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function dia(v: any): string {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const STATUS: Record<string, { txt: string; cor: string; bg: string }> = {
  aguardando: { txt: '⏳ Aguardando liberar', cor: '#b45309', bg: 'rgba(217,119,6,0.12)' },
  liberada: { txt: '✅ Liberado para sacar', cor: '#15803d', bg: 'rgba(22,163,74,0.12)' },
  em_saque: { txt: '💸 Saque pedido', cor: '#1d4ed8', bg: 'rgba(37,99,235,0.12)' },
  pago: { txt: '🎉 Pix enviado', cor: '#15803d', bg: 'rgba(22,163,74,0.16)' },
  cancelada: { txt: '↩️ Reembolsada', cor: '#b91c1c', bg: 'rgba(220,38,38,0.1)' },
  cadastrou: { txt: '👤 Cadastrou, ainda não comprou', cor: '#6b6a7e', bg: 'rgba(107,106,126,0.12)' },
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)' }

export default function IndiquePage() {
  const supabase = createClient()
  const [data, setData] = useState<Overview | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [pixTipo, setPixTipo] = useState('CPF')
  const [pixChave, setPixChave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [whats, setWhats] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msgDados, setMsgDados] = useState<{ ok: boolean; txt: string } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null)

  async function carregar() {
    const r = await supabase.rpc('referral_overview')
    if (r.error) { setErro('Não consegui carregar agora. Atualize a página em instantes.'); return }
    const o = r.data as Overview
    setData(o)
    if (o.pix && !pixChave) { setPixChave(o.pix.chave || ''); if (o.pix.tipo) setPixTipo(o.pix.tipo) }
    if (o.whatsapp && !whats) setWhats(o.whatsapp)
  }

  useEffect(function() { carregar() }, [])

  const link = data ? SITE + '/i/' + data.code : ''
  const texto = 'Quer aprender a vender como afiliado? Conheça a Plataforma do Cristão Próspero 👇 ' + link

  async function copiar() {
    try { await navigator.clipboard.writeText(link) } catch (e) {
      const el = document.createElement('textarea'); el.value = link; document.body.appendChild(el); el.select()
      try { document.execCommand('copy') } catch (e2) {}
      document.body.removeChild(el)
    }
    setCopiado(true)
    setTimeout(function() { setCopiado(false) }, 2200)
  }

  async function salvarDados() {
    setMsgDados(null)
    if (pixChave.trim().length < 5) { setMsgDados({ ok: false, txt: 'Digite a sua chave Pix.' }); return }
    if (whats.replace(/\D/g, '').length < 10) { setMsgDados({ ok: false, txt: 'Digite o seu WhatsApp com DDD.' }); return }
    setSalvando(true)
    const r = await supabase.rpc('referral_save_contact', { p_pix: pixChave.trim(), p_type: pixTipo, p_whatsapp: whats })
    setSalvando(false)
    if (r.error) { setMsgDados({ ok: false, txt: r.error.message || 'Não foi possível salvar.' }); return }
    setMsgDados({ ok: true, txt: 'Dados salvos! Agora é só pedir o saque quando tiver saldo liberado.' })
    carregar()
  }

  async function sacar() {
    if (!data) return
    setMsg(null)
    if (!data.pix) { setMsg({ ok: false, txt: 'Cadastre a sua chave Pix e o seu WhatsApp antes de sacar.' }); return }
    setEnviando(true)
    const r = await supabase.rpc('referral_request_payout', { p_pix: '', p_type: '' })
    setEnviando(false)
    if (r.error) { setMsg({ ok: false, txt: r.error.message || 'Não foi possível pedir o saque.' }); return }
    setMsg({ ok: true, txt: 'Saque pedido! Nossa equipe vai enviar o Pix para a chave informada.' })
    carregar()
  }

  const liberado = Number(data?.liberado) || 0

  return (
    <div style={{ padding: '24px 20px 48px', maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{`
        @keyframes indPop { 0% { transform: scale(.96); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes indShine { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
        .ind-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
        .ind-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
        .ind-btn { cursor: pointer; border: 0; border-radius: 12px; font-weight: 700; font-size: 14px; padding: 12px 18px; transition: transform .15s, opacity .15s; }
        .ind-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .ind-btn:disabled { opacity: .55; cursor: not-allowed; }
        .ind-input { width: 100%; padding: 11px 12px; border-radius: 10px; border: 1px solid var(--border2); background: var(--surface2); color: var(--text); font-size: 14px; outline: none; }
        .ind-input:focus { border-color: #16a34a; }
      `}</style>

      {/* Topo */}
      <div style={{ borderRadius: 20, padding: '26px 22px', color: '#fff', backgroundImage: 'linear-gradient(135deg,#15803d,#16a34a 45%,#f59e0b)', boxShadow: '0 10px 30px rgba(22,163,74,0.28)', animation: 'indPop .4s ease both' }}>
        <div style={{ fontSize: 13, fontWeight: 700, opacity: .9, letterSpacing: .3 }}>🎁 INDIQUE E GANHE</div>
        <h1 style={{ fontSize: 26, lineHeight: 1.2, margin: '8px 0 8px', fontWeight: 800 }}>Ganhe {brl(COMISSAO).replace(',00', '')} no Pix por cada pessoa que comprar</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, opacity: .95 }}>
          Quando alguém comprar a plataforma por <b>R$ {PRECO}</b> pelo seu link, você recebe <b>R$ {COMISSAO} no Pix</b>. Sem limite de indicações.
        </p>
      </div>

      {erro && <div style={{ ...card, color: 'var(--red)' }}>{erro}</div>}
      {!data && !erro && <div style={{ ...card, color: 'var(--muted2)' }}>Carregando…</div>}

      {data && (
        <>
          {/* Link */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted2)', marginBottom: 8 }}>SEU LINK DE INDICAÇÃO</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="ind-input" readOnly value={link} onFocus={function(e) { e.currentTarget.select() }} style={{ flex: '1 1 260px', fontWeight: 600 }} />
              <button className="ind-btn" onClick={copiar} style={{ background: copiado ? '#15803d' : '#16a34a', color: '#fff', minWidth: 120 }}>
                {copiado ? '✓ Copiado!' : 'Copiar link'}
              </button>
              <a className="ind-btn" href={'https://wa.me/?text=' + encodeURIComponent(texto)} target="_blank" rel="noopener noreferrer"
                style={{ background: '#25d366', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                Enviar no WhatsApp
              </a>
            </div>
          </div>

          {/* Como funciona */}
          <div className="ind-steps">
            {[
              { n: '1', t: 'Compartilhe seu link', d: 'Mande para amigos, grupos e redes sociais.' },
              { n: '2', t: 'A pessoa compra por R$ ' + PRECO, d: 'A compra da plataforma precisa ser feita pelo seu link.' },
              { n: '3', t: 'Você recebe R$ ' + COMISSAO + ' no Pix', d: 'Depois de 7 dias sem reembolso, o valor é liberado para saque.' },
            ].map(function(s) {
              return (
                <div key={s.n} style={{ ...card, padding: 16 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(22,163,74,0.14)', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{s.n}</div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>{s.t}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.45 }}>{s.d}</div>
                </div>
              )
            })}
          </div>

          {/* Numeros */}
          <div className="ind-grid">
            {[
              { l: 'Cliques no link', v: String(data.cliques) },
              { l: 'Compras', v: String(data.compras) },
              { l: 'Aguardando liberar', v: brl(data.aguardando), c: '#b45309' },
              { l: 'Liberado para sacar', v: brl(data.liberado), c: '#15803d' },
              { l: 'Já recebido', v: brl(data.pago), c: '#15803d' },
            ].map(function(t) {
              return (
                <div key={t.l} style={{ ...card, padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted2)', fontWeight: 600 }}>{t.l}</div>
                  <div style={{ fontSize: 21, fontWeight: 800, marginTop: 4, color: t.c || 'var(--text)' }}>{t.v}</div>
                </div>
              )
            })}
          </div>

          {/* Dados para receber */}
          <div style={{ ...card, borderColor: data.pix ? 'var(--border)' : 'rgba(245,158,11,0.55)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🔑 Seus dados para receber</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted2)', marginBottom: 12 }}>
              {data.pix ? 'Pix e WhatsApp cadastrados. Você pode mudar quando quiser.' : 'Cadastre a sua chave Pix e o seu WhatsApp. Sem isso não dá para fazer o saque.'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <select className="ind-input" value={pixTipo} onChange={function(e) { setPixTipo(e.target.value) }} style={{ flex: '0 0 150px' }}>
                <option>CPF</option><option>E-mail</option><option>Celular</option><option>Aleatória</option>
              </select>
              <input className="ind-input" placeholder="Sua chave Pix" value={pixChave} onChange={function(e) { setPixChave(e.target.value) }} style={{ flex: '1 1 220px' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="ind-input" placeholder="Seu WhatsApp com DDD, ex: (11) 99999-9999" inputMode="tel" value={whats} onChange={function(e) { setWhats(e.target.value) }} style={{ flex: '1 1 260px' }} />
              <button className="ind-btn" disabled={salvando} onClick={salvarDados} style={{ background: '#16a34a', color: '#fff' }}>
                {salvando ? 'Salvando…' : data.pix ? 'Atualizar dados' : 'Salvar dados'}
              </button>
            </div>
            {msgDados && <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, color: msgDados.ok ? '#15803d' : 'var(--red)' }}>{msgDados.txt}</div>}
          </div>

          {/* Saque */}
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>💸 Sacar no Pix</div>
            {Number(data.em_saque) > 0 && (
              <div style={{ fontSize: 13, color: '#1d4ed8', marginBottom: 8 }}>Você tem {brl(data.em_saque)} em saque pedido. Nossa equipe está enviando o Pix.</div>
            )}
            {liberado > 0 ? (
              <>
                <div style={{ fontSize: 14, color: 'var(--muted2)', marginBottom: 12 }}>
                  Você pode sacar <b style={{ color: '#15803d' }}>{brl(liberado)}</b> agora{data.pix ? ', no Pix ' + data.pix.chave + '.' : '.'}
                </div>
                <button className="ind-btn" disabled={enviando || !data.pix} onClick={sacar} style={{ background: '#16a34a', color: '#fff' }}>
                  {enviando ? 'Enviando…' : 'Pedir saque de ' + brl(liberado)}
                </button>
                {!data.pix && <div style={{ marginTop: 8, fontSize: 13, color: '#b45309', fontWeight: 600 }}>Cadastre a chave Pix acima para liberar o botão.</div>}
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--muted2)' }}>
                Quando uma indicação passar 7 dias sem reembolso, o valor aparece aqui para você sacar.
              </div>
            )}
            {msg && <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, color: msg.ok ? '#15803d' : 'var(--red)' }}>{msg.txt}</div>}
          </div>

          {/* Indicados */}
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>👥 Suas indicações</div>
            {data.indicados.length === 0 ? (
              <div style={{ fontSize: 14, color: 'var(--muted2)' }}>Ninguém comprou ainda. Copie seu link e mande para quem quer aprender a vender na internet. 🚀</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.indicados.map(function(i, k) {
                  const st = STATUS[i.status] || STATUS.cadastrou
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 12, background: 'var(--surface2)' }}>
                      <div style={{ fontWeight: 700, flex: '1 1 100px' }}>{i.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{dia(i.quando)}{i.status === 'aguardando' && i.libera_em ? ' · libera em ' + dia(i.libera_em) : ''}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: st.cor, background: st.bg, borderRadius: 999, padding: '3px 10px' }}>{st.txt}</div>
                      {i.status !== 'cadastrou' && i.status !== 'cancelada' && <div style={{ fontWeight: 800, color: '#15803d' }}>{brl(COMISSAO)}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Historico de saques */}
          {data.saques.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>🧾 Seus saques</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.saques.map(function(s) {
                  const pago = s.status === 'pago'
                  const rec = s.status === 'recusado'
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 12, background: 'var(--surface2)' }}>
                      <div style={{ fontWeight: 800, flex: '1 1 100px' }}>{brl(s.valor)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Pedido em {dia(s.quando)}{pago && s.pago_em ? ' · pago em ' + dia(s.pago_em) : ''}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: pago ? '#15803d' : rec ? '#b91c1c' : '#1d4ed8', background: pago ? 'rgba(22,163,74,0.14)' : rec ? 'rgba(220,38,38,0.1)' : 'rgba(37,99,235,0.12)', borderRadius: 999, padding: '3px 10px' }}>
                        {pago ? '🎉 Pix enviado' : rec ? 'Recusado — o valor voltou para o saldo' : '⏳ Em análise'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Regras */}
          <div style={{ ...card, background: 'var(--surface2)', boxShadow: 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Regras do programa</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--muted2)', lineHeight: 1.7 }}>
              <li>Vale para quem comprar a plataforma de R$ {PRECO} (Mentoria Cristão Próspero) pelo seu link.</li>
              <li>Você ganha R$ {COMISSAO} por compra, sem limite de indicações.</li>
              <li>O valor é liberado 7 dias depois da compra, se não houver reembolso.</li>
              <li>Se a pessoa pedir reembolso antes de você sacar, a comissão é cancelada.</li>
              <li>O Pix é enviado pela nossa equipe para a chave que você informar.</li>
              <li>Comprar pelo seu próprio link não gera comissão.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
