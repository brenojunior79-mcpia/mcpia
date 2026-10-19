'use client'
import { useEffect, useRef, useState } from 'react'
import styles from '../admin.module.css'

const SEGMENTOS = [
  { k: 'todos', nome: 'Todos os alunos' },
  { k: 'sem_plano', nome: 'Quem não tem plano' },
  { k: 'plano', nome: 'Quem tem plano ativo' },
  { k: 'deixaram_de_pagar', nome: 'Deixaram de pagar (cancelados ou em atraso)' },
]

// Modelos prontos: avisos/lembretes e recuperar quem nao pagou. Sem acento de proposito (cabe mais letras no SMS).
const MODELOS = [
  { nome: 'Lembrete: aula ao vivo', seg: 'todos', texto: 'Oi {{nome}}, tem aula ao vivo na plataforma Cristao Prospero. Entre em mcpia.site e participe. Deus abencoe!' },
  { nome: 'Aviso: novidade na plataforma', seg: 'todos', texto: 'Oi {{nome}}, tem novidade na sua plataforma Cristao Prospero. Acesse mcpia.site e confira. Deus abencoe!' },
  { nome: 'Recuperar: voltar a assinar', seg: 'deixaram_de_pagar', texto: 'Oi {{nome}}, sentimos sua falta na Cristao Prospero. Seu acesso esta te esperando. Volte em mcpia.site/dashboard/planos' },
  { nome: 'Recuperar: quem nao tem plano', seg: 'sem_plano', texto: 'Oi {{nome}}, voce ja viu os planos da Cristao Prospero? Veja em mcpia.site/dashboard/planos e comece hoje. Duvidas, responda aqui.' },
]

function partes(len: number) { return len === 0 ? 0 : len <= 160 ? 1 : Math.ceil(len / 153) }
function semAcentos(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x20-\x7E\n]/g, '')
}
function dataBR(iso: string) { try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch (e) { return '' } }

export default function SmsPage() {
  const [info, setInfo] = useState<any>(null)
  const [erroCarga, setErroCarga] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [segmento, setSegmento] = useState('todos')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [rodando, setRodando] = useState<{ id: string; enviados: number; falhas: number; faltam: number; total: number } | null>(null)
  const [optTexto, setOptTexto] = useState('')
  const parar = useRef(false)

  async function carregar() {
    try {
      const r = await fetch('/api/sms', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) { setErroCarga(j.error || 'Não consegui carregar.'); return }
      setInfo(j); setErroCarga('')
    } catch (e) { setErroCarga('Sem conexão. Tente de novo.') }
  }
  useEffect(function() { carregar() }, [])

  const limpa = semAcentos(mensagem)
  const total = info?.publico?.porSegmento?.[segmento] ?? 0
  const nPartes = partes(limpa.length)

  async function loteAteAcabar(id: string, totalGeral: number) {
    parar.current = false
    let enviados = 0, falhas = 0
    for (let guarda = 0; guarda < 400; guarda++) {
      if (parar.current) break
      let j: any
      try {
        const r = await fetch('/api/sms/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
        j = await r.json()
        if (!r.ok) { setAviso({ tipo: 'erro', texto: j.error || 'Erro ao enviar.' }); break }
      } catch (e) { setAviso({ tipo: 'erro', texto: 'A conexão caiu. Clique em "Continuar" no histórico para seguir de onde parou.' }); break }
      const c = j.contagem || {}
      enviados = c.sent || 0; falhas = c.failed || 0
      const faltam = (c.pending || 0) + (c.sending || 0)
      setRodando({ id, enviados, falhas, faltam, total: totalGeral })
      if (j.status === 'pausado') { setAviso({ tipo: 'erro', texto: 'Disparo pausado: ' + (j.motivo || 'erro na Zenvia') + '. Corrija e clique em "Continuar" no histórico.' }); break }
      if (j.status === 'concluido' || j.status === 'cancelado') {
        setAviso({ tipo: 'ok', texto: 'Disparo terminado: ' + enviados + ' enviados' + (falhas ? ', ' + falhas + ' com erro' : '') + '.' })
        break
      }
    }
    setRodando(null); setOcupado(false); carregar()
  }

  async function enviarTeste() {
    if (!limpa.trim()) { setAviso({ tipo: 'erro', texto: 'Escreva a mensagem primeiro.' }); return }
    setOcupado(true); setAviso(null)
    const r = await fetch('/api/sms/enviar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem, teste: true }) })
    const j = await r.json().catch(function() { return {} })
    setOcupado(false)
    setAviso(r.ok ? { tipo: 'ok', texto: 'Teste enviado para o seu celular (final ' + (j.para || '') + '). Confira se chegou.' } : { tipo: 'erro', texto: j.error || 'Não consegui enviar o teste.' })
  }

  async function enviar() {
    if (!limpa.trim()) { setAviso({ tipo: 'erro', texto: 'Escreva a mensagem primeiro.' }); return }
    if (total === 0) { setAviso({ tipo: 'erro', texto: 'Ninguém nesse público.' }); return }
    const nome = SEGMENTOS.find(function(s) { return s.k === segmento })?.nome
    if (!window.confirm('Enviar este SMS para ' + total + ' pessoas (' + nome + ')?\n\n' + limpa + '\n\nIsso gasta ' + (total * nPartes) + ' SMS do seu saldo na Zenvia e não dá para desfazer.')) return
    setOcupado(true); setAviso(null)
    const r = await fetch('/api/sms/enviar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem, segmento }) })
    const j = await r.json().catch(function() { return {} })
    if (!r.ok) { setOcupado(false); setAviso({ tipo: 'erro', texto: j.error || 'Não consegui criar o disparo.' }); return }
    setRodando({ id: j.id, enviados: 0, falhas: 0, faltam: j.total, total: j.total })
    loteAteAcabar(j.id, j.total)
  }

  async function continuar(h: any) {
    setOcupado(true); setAviso(null)
    setRodando({ id: h.id, enviados: h.sent, falhas: h.failed, faltam: h.pending, total: h.total })
    loteAteAcabar(h.id, h.total)
  }
  async function cancelar(id: string) {
    parar.current = true
    await fetch('/api/sms/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, cancelar: true }) })
    setAviso({ tipo: 'ok', texto: 'Disparo cancelado. Quem já recebeu não é afetado.' })
    setRodando(null); setOcupado(false); carregar()
  }
  async function addOptout() {
    const r = await fetch('/api/sms/optout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numeros: optTexto }) })
    const j = await r.json().catch(function() { return {} })
    if (r.ok) { setOptTexto(''); setAviso({ tipo: 'ok', texto: j.total + ' número(s) não vão mais receber SMS.' }); carregar() }
    else setAviso({ tipo: 'erro', texto: j.error || 'Erro.' })
  }
  async function tirarOptout(phone: string) {
    await fetch('/api/sms/optout?phone=' + encodeURIComponent(phone), { method: 'DELETE' })
    carregar()
  }

  const caixa: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }
  const botao: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }
  const botao2: React.CSSProperties = { ...botao, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border2)' }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.title}>SMS</div>
        <div className={styles.sub}>Envie avisos, lembretes e recuperação para o celular dos alunos (Zenvia)</div>
      </div>
      <div className={styles.content}>
        {erroCarga && <div className={styles.apiErr} style={{ marginBottom: 16 }}>{erroCarga}</div>}

        {info && !info.configurado && (
          <div className={styles.tableCard} style={{ padding: 16, marginBottom: 18, borderColor: 'var(--amber)' }}>
            <b>A Zenvia ainda não está conectada.</b>
            <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 6 }}>
              No painel da Vercel (projeto mcpia, Settings, Environment Variables) adicione: <b>{(info.faltando || []).join(' e ')}</b>. Depois faça um novo deploy (Redeploy). ZENVIA_API_TOKEN é a chave de API da Zenvia e ZENVIA_SMS_FROM é o remetente (código curto ou nome) aprovado por eles.
            </div>
          </div>
        )}

        {aviso && (
          <div className={styles.tableCard} style={{ padding: 14, marginBottom: 18, borderColor: aviso.tipo === 'ok' ? 'var(--green)' : 'var(--red)', fontSize: 14 }}>{aviso.texto}</div>
        )}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Alunos com celular</div>
            <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{info?.publico?.porSegmento?.todos ?? '-'}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>{info?.publico?.semNumero ?? 0} sem celular válido</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Pediram para sair</div>
            <div className={styles.statValue}>{info?.publico?.optout ?? 0}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>nunca recebem SMS</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Disparos recentes</div>
            <div className={styles.statValue}>{info?.historico?.length ?? 0}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>veja abaixo</div>
          </div>
        </div>

        <div className={styles.tableCard} style={{ padding: 20, marginBottom: 18 }}>
          <div className={styles.tableTitle} style={{ marginBottom: 14 }}>Novo SMS</div>

          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 6 }}>Modelos prontos (você pode editar):</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {MODELOS.map(function(m) {
              return <button key={m.nome} type="button" style={{ ...botao2, padding: '6px 12px', fontSize: 12 }} onClick={function() { setMensagem(m.texto); setSegmento(m.seg) }}>{m.nome}</button>
            })}
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 6 }}>Para quem</div>
          <select value={segmento} onChange={function(e) { setSegmento(e.target.value) }} style={{ ...caixa, marginBottom: 14 }}>
            {SEGMENTOS.map(function(s) { return <option key={s.k} value={s.k}>{s.nome} ({info?.publico?.porSegmento?.[s.k] ?? '-'})</option> })}
          </select>

          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 6 }}>Mensagem (use {'{{nome}}'} para colocar o primeiro nome)</div>
          <textarea value={mensagem} onChange={function(e) { setMensagem(e.target.value) }} rows={4} maxLength={600} style={caixa} placeholder="Oi {{nome}}, ..." />
          <div style={{ fontSize: 12, color: limpa.length > 160 ? 'var(--amber)' : 'var(--muted2)', margin: '6px 0 14px' }}>
            {limpa.length} letras = {nPartes} SMS por pessoa. Os acentos são tirados automaticamente para caber mais texto (160 letras por SMS). Para {total} pessoas: {total * nPartes} SMS no total.
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" style={botao2} disabled={ocupado || !info?.configurado} onClick={enviarTeste}>Enviar teste para mim</button>
            <button type="button" style={{ ...botao, opacity: ocupado || !info?.configurado ? 0.6 : 1 }} disabled={ocupado || !info?.configurado} onClick={enviar}>Enviar para {total} pessoas</button>
          </div>

          {rodando && (
            <div style={{ marginTop: 16 }}>
              <div className={styles.apiBar}><div className={styles.apiBarFill} style={{ width: Math.round(((rodando.total - rodando.faltam) / Math.max(1, rodando.total)) * 100) + '%', background: 'var(--accent)' }} /></div>
              <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 6 }}>Enviando... {rodando.enviados} enviados, {rodando.falhas} com erro, faltam {rodando.faltam}. Não feche esta página.</div>
              <button type="button" style={{ ...botao2, marginTop: 8, padding: '6px 12px', fontSize: 12 }} onClick={function() { cancelar(rodando.id) }}>Cancelar disparo</button>
            </div>
          )}
        </div>

        <div className={styles.tableCard} style={{ marginBottom: 18 }}>
          <div className={styles.tableHeader}><div className={styles.tableTitle}>Últimos disparos</div></div>
          {(!info?.historico || info.historico.length === 0) ? <div className={styles.empty}>Nenhum disparo ainda.</div> : (
            <table className={styles.table}>
              <thead><tr><th>Quando</th><th>Mensagem</th><th>Enviados</th><th>Erros</th><th>Situação</th></tr></thead>
              <tbody>
                {info.historico.map(function(h: any) {
                  const parado = h.status === 'pausado' || (h.status === 'rodando' && h.pending > 0)
                  return (
                    <tr key={h.id}>
                      <td>{dataBR(h.created_at)}</td>
                      <td style={{ maxWidth: 320 }}>{String(h.message).slice(0, 90)}</td>
                      <td>{h.sent}/{h.total}</td>
                      <td>{h.failed}</td>
                      <td>
                        {h.status}
                        {h.pause_reason ? <div style={{ fontSize: 11, color: 'var(--red)' }}>{h.pause_reason}</div> : null}
                        {parado && !ocupado ? <div><button type="button" style={{ ...botao2, padding: '4px 10px', fontSize: 11, marginTop: 4 }} onClick={function() { continuar(h) }}>Continuar</button></div> : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.tableCard} style={{ padding: 20 }}>
          <div className={styles.tableTitle} style={{ marginBottom: 12 }}>Quem pediu para não receber</div>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 8 }}>Cole um ou mais números (com DDD). Eles nunca mais entram nos disparos.</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={optTexto} onChange={function(e) { setOptTexto(e.target.value) }} placeholder="(11) 91234-5678" style={{ ...caixa, flex: 1, minWidth: 200 }} />
            <button type="button" style={botao2} onClick={addOptout}>Adicionar</button>
          </div>
          {info?.optout?.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {info.optout.map(function(o: any) {
                return <span key={o.phone} style={{ fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '4px 8px' }}>{o.phone} <a style={{ cursor: 'pointer', color: 'var(--red)', marginLeft: 6 }} onClick={function() { tirarOptout(o.phone) }}>remover</a></span>
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
