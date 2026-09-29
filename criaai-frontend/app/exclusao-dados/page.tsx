export default function ExclusaoDadosPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f7', padding: '48px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', borderRadius: 16, padding: '40px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#0f0f1a' }}>Instruções de Exclusão de Dados</h1>
        <p style={{ fontSize: 13, color: '#6b6a7e', marginBottom: 32 }}>Última atualização: 27 de setembro de 2026</p>

        <p style={{ marginBottom: 20, lineHeight: 1.7, color: '#333' }}>
          Você tem o direito de solicitar a exclusão dos seus dados pessoais armazenados na <strong>Plataforma do Cristão Próspero</strong> a qualquer momento.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 10, color: '#0f0f1a' }}>Como solicitar a exclusão dos seus dados</h2>
        <p style={{ marginBottom: 16, lineHeight: 1.7, color: '#333' }}>
          Para solicitar a exclusão completa da sua conta e dos dados associados a ela, envie um e-mail para:
        </p>
        <p style={{ marginBottom: 20, lineHeight: 1.7, color: '#333', fontWeight: 700 }}>
          cristaoprosperooficiall@gmail.com
        </p>
        <p style={{ marginBottom: 20, lineHeight: 1.7, color: '#333' }}>
          com o assunto <strong>"Solicitação de exclusão de dados"</strong>, informando o e-mail cadastrado na Plataforma.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 10, color: '#0f0f1a' }}>O que é excluído</h2>
        <ul style={{ marginBottom: 20, lineHeight: 1.9, color: '#333', paddingLeft: 22 }}>
          <li>Dados de cadastro (nome, e-mail, informações de conta).</li>
          <li>Histórico de conteúdos gerados na Plataforma (vídeos, ebooks, sites e criativos).</li>
          <li>Tokens de acesso a integrações conectadas (como contas de anúncios do Facebook/Meta, quando aplicável).</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 10, color: '#0f0f1a' }}>Prazo</h2>
        <p style={{ marginBottom: 20, lineHeight: 1.7, color: '#333' }}>
          Processaremos sua solicitação em até 30 dias corridos, e enviaremos uma confirmação por e-mail assim que a exclusão for concluída.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 10, color: '#0f0f1a' }}>Observação</h2>
        <p style={{ lineHeight: 1.7, color: '#333' }}>
          Alguns dados podem ser retidos por período adicional quando exigido por obrigações legais, fiscais ou contratuais (por exemplo, registros de pagamento exigidos por lei).
        </p>
      </div>
    </div>
  )
}
