
# Integração Backend - PsiManager Pro

Este diretório contém a documentação técnica necessária para implementar o servidor real que suportará as funcionalidades de **Vídeo Chamada (WebRTC)** e **Lousa Interativa em Tempo Real (WebSockets)**.

## Stack Recomendada

Para manter a compatibilidade com o Frontend (React/TypeScript), recomenda-se a seguinte stack:

1.  **Linguagem/Runtime:** Node.js.
2.  **WebSockets:** Socket.io (para sinalização do vídeo e eventos da lousa).
3.  **Banco de Dados:** PostgreSQL (dados relacionais) + Redis (para gerenciar sessões de socket e performance).
4.  **Infraestrutura de Vídeo:**
    *   Para 1-on-1 (P2P): Servidor STUN/TURN (Recomendado: Coturn).
    *   Para Grupos grandes (opcional): SFU (Mediasoup ou Jitsi).

## Estrutura da Documentação

1.  [Arquitetura e Fluxo de Usuários](./ARQUITETURA_USUARIOS.md) - Como criar usuários, autenticar e gerar salas.
2.  [Sala Virtual (WebRTC)](./SALA_VIRTUAL_WEBRTC.md) - Protocolo de sinalização para vídeo e áudio.
3.  [Lousa Interativa](./LOUSA_COLLAB.md) - Protocolo de eventos para desenho colaborativo.
