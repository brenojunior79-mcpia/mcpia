// Aparece na hora em que o aluno toca num menu, enquanto a tela nova chega do servidor.
// Antes nao havia nada: o toque parecia "travado" por meio segundo ou mais.
export default function Carregando() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted2)', fontSize: 14 }}>
      <i className="ti ti-loader" style={{ fontSize: 30, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      Abrindo…
    </div>
  )
}
