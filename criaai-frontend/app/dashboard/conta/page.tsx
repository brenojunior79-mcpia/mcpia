'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

const cartao: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)' }
const titulo: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, margin: '0 0 14px' }
const campo: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }
const botao: React.CSSProperties = { cursor: 'pointer', border: 0, borderRadius: 10, padding: '11px 18px', fontWeight: 800, fontSize: 14, background: 'var(--accent)', color: '#fff' }

function Numero({ icone, valor, rotulo }: { icone: string; valor: number | null; rotulo: string }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '14px 14px' }}>
      <i className={'ti ' + icone} style={{ fontSize: 20, color: 'var(--accent)' }} />
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, marginTop: 4 }}>{valor === null ? '…' : valor.toLocaleString('pt-BR')}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>{rotulo}</div>
    </div>
  )
}

function Barra({ usados, limite }: { usados: number; limite: number }) {
  const pct = limite > 0 ? Math.min(100, Math.round((usados / limite) * 100)) : 0
  return (
    <div style={{ height: 8, borderRadius: 99, background: 'var(--surface3)', overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)' }} />
    </div>
  )
}

export default function ContaPage() {
  const supabase = createClient()
  const [perfil, setPerfil] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [resumo, setResumo] = useState<any>(null)
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(function() {
    supabase.auth.getUser().then(function(r) {
      const u = r.data.user
      if (!u) return
      setEmail(u.email || '')
      supabase.from('profiles').select('*, plans(name, credits_videos, credits_ebooks, is_unlimited)').eq('id', u.id).single().then(function(p) { setPerfil(p.data) })
    })
    fetch('/api/conta/resumo').then(function(r) { return r.json() }).then(function(j) { if (!j.error) setResumo(j) }).catch(function() {})
  }, [])

  async function trocarSenha() {
    setMsg(null)
    if (nova.length < 6) { setMsg({ ok: false, texto: 'A senha precisa ter pelo menos 6 caracteres.' }); return }
    if (nova !== confirma) { setMsg({ ok: false, texto: 'As duas senhas não são iguais.' }); return }
    setSalvando(true)
    const r = await supabase.auth.updateUser({ password: nova })
    setSalvando(false)
    if (r.error) { setMsg({ ok: false, texto: 'Não foi possível trocar a senha. Saia e entre de novo e tente outra vez.' }); return }
    setNova(''); setConfirma('')
    setMsg({ ok: true, texto: 'Senha alterada com sucesso!' })
  }

  async function sair() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const plano = perfil?.plans
  const ilimitado = !!plano?.is_unlimited
  const videosLimite = (plano?.credits_videos || 0) + (perfil?.credits_videos_extra || 0)
  const videosUsados = perfil?.credits_videos_used || 0
  const ebooksLimite = (plano?.credits_ebooks || 0) + (perfil?.credits_ebooks_extra || 0)
  const ebooksUsados = perfil?.credits_ebooks_used || 0
  const criadoEm = perfil?.created_at ? new Date(perfil.created_at) : null
  const novoAluno = !perfil?.is_admin && !!criadoEm && (Date.now() - criadoEm.getTime()) < 7 * 24 * 60 * 60 * 1000
  const temPlano = perfil?.subscription_status === 'active' || perfil?.subscription_status === 'trialing'
  const esconderPlanos = novoAluno && !temPlano

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>Minha conta</div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 2 }}>Seu perfil, senha, plano, créditos e tudo o que você já fez na plataforma</div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 760, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={cartao}>
          <h2 style={titulo}>👤 Meu perfil</h2>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{(perfil?.full_name || '').trim() || 'Aluno'}</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted2)', marginTop: 2, wordBreak: 'break-all' }}>{email}</div>
          {criadoEm && <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 6 }}>Na plataforma desde {criadoEm.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
        </div>

        {!esconderPlanos && (
          <div style={cartao}>
            <h2 style={titulo}>💳 Plano e créditos</h2>
            <div style={{ fontSize: 14, marginBottom: 14 }}>Plano atual: <b>{plano?.name || 'Starter'}</b></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>Créditos de vídeo</span><b>{ilimitado ? '∞' : Math.max(0, videosLimite - videosUsados) + ' restantes'}</b></div>
                {!ilimitado && <Barra usados={videosUsados} limite={videosLimite} />}
                {!ilimitado && <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>{videosUsados} usados de {videosLimite}</div>}
              </div>
              <div>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>Créditos de ebook</span><b>{ilimitado ? '∞' : Math.max(0, ebooksLimite - ebooksUsados) + ' restantes'}</b></div>
                {!ilimitado && <Barra usados={ebooksUsados} limite={ebooksLimite} />}
                {!ilimitado && <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>{ebooksUsados} usados de {ebooksLimite}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              <Link href="/dashboard/planos" style={{ ...botao, textDecoration: 'none', display: 'inline-block' }}>Ver planos</Link>
              <Link href="/dashboard/creditos" style={{ ...botao, textDecoration: 'none', display: 'inline-block', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border2)' }}>Comprar créditos</Link>
            </div>
          </div>
        )}

        <div style={cartao}>
          <h2 style={titulo}>📊 Resumo do que você já fez</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <Numero icone="ti-book-2" valor={resumo ? resumo.ebooks : null} rotulo="Ebooks criados" />
            <Numero icone="ti-layout" valor={resumo ? resumo.sites : null} rotulo="Sites criados" />
            <Numero icone="ti-eye" valor={resumo ? resumo.visitas : null} rotulo="Visitas nos seus sites" />
            <Numero icone="ti-message-circle" valor={resumo ? resumo.perguntas : null} rotulo="Perguntas ao Assistente IA" />
            <Numero icone="ti-sparkles" valor={resumo ? resumo.roteiros : null} rotulo="Roteiros de criativo" />
            <Numero icone="ti-chart-bar" valor={resumo ? resumo.analises : null} rotulo="Análises de métricas" />
            <Numero icone="ti-video" valor={resumo ? resumo.criativos : null} rotulo="Vídeos gerados" />
          </div>
        </div>

        <div style={cartao}>
          <h2 style={titulo}>🔒 Trocar senha</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
            <input type="password" placeholder="Nova senha" value={nova} onChange={function(e) { setNova(e.target.value) }} autoComplete="new-password" style={campo} />
            <input type="password" placeholder="Repita a nova senha" value={confirma} onChange={function(e) { setConfirma(e.target.value) }} autoComplete="new-password" style={campo} />
            <div><button onClick={trocarSenha} disabled={salvando || !nova} style={{ ...botao, opacity: salvando || !nova ? 0.6 : 1 }}>{salvando ? 'Salvando...' : 'Salvar nova senha'}</button></div>
            {msg && <div style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.texto}</div>}
          </div>
        </div>

        <div>
          <button onClick={sair} style={{ ...botao, background: 'transparent', color: 'var(--red)', border: '1px solid var(--border2)' }}><i className="ti ti-logout" /> Sair da conta</button>
        </div>
      </div>
    </div>
  )
}
