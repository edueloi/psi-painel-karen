import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Sem isto, qualquer exceção não tratada durante o render (ex: acessar uma
// propriedade de um paciente/profissional que não foi encontrado em uma
// lista local) derruba a árvore inteira do React e deixa a tela em branco,
// sem nenhuma mensagem — o usuário só vê uma página branca e precisa
// recarregar às cegas. Isolando o erro aqui, o resto do app permanece de pé
// e a pessoa recebe uma tela com o que fazer.
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro não tratado na aplicação:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: 24, textAlign: 'center', background: '#F8F6FF',
          fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#EFE9FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#120C2E', margin: 0 }}>
            Algo deu errado nesta tela
          </h1>
          <p style={{ fontSize: 14, color: '#5B5470', margin: 0, maxWidth: 380 }}>
            Ocorreu um erro inesperado. Recarregue a página para continuar — se o problema persistir, entre em contato com o suporte.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: 8, padding: '10px 22px', borderRadius: 12, border: 'none',
              background: '#6D42F5', color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
