
# Protocolo de Vídeo Chamada (WebRTC)

Como o WebRTC é Peer-to-Peer (P2P), o backend atua apenas como um **Servidor de Sinalização** (Signaling Server). Ele troca as informações de conexão entre os dois navegadores.

## 1. Infraestrutura STUN/TURN

Para que o vídeo funcione entre redes diferentes (ex: 4G do celular e Wi-Fi da casa), é **obrigatório** configurar servidores ICE:

*   **STUN:** Google fornece públicos (`stun:stun.l.google.com:19302`). Resolve o IP público.
*   **TURN:** Necessário pagar ou hospedar (ex: Coturn). Serve de "relay" quando o P2P direto falha por causa de Firewall/NAT estrito.

**Configuração no Frontend:**
O Backend deve fornecer uma rota `GET /api/ice-servers` que retorna as credenciais temporárias do TURN para o frontend usar no `RTCPeerConnection`.

## 2. Eventos Socket.io (Sinalização)

O backend deve escutar e repassar os seguintes eventos.

### Eventos de Conexão
*   **Client envia:** `join-room` { roomId, userId, name }
*   **Server faz:** `socket.join(roomId)`
*   **Server emite (para outros na sala):** `user-connected` { userId, name }

### Eventos de Handshake WebRTC (SDP)
Todo evento enviado por A deve ser repassado para B (exceto para o remetente).

1.  **Offer (Oferta):**
    *   *Client A:* `signal-offer` { target: userIdB, sdp: description }
    *   *Server:* Repassa para User B.

2.  **Answer (Resposta):**
    *   *Client B:* `signal-answer` { target: userIdA, sdp: description }
    *   *Server:* Repassa para User A.

3.  **ICE Candidates (Caminhos de Rede):**
    *   *Client A/B:* `ice-candidate` { target: otherUserId, candidate: candidateData }
    *   *Server:* Repassa para o alvo.

## 3. Funcionalidades de Controle

*   **Mute Remoto:** O Host pode enviar `mute-participant` { targetId }. O backend repassa, e o frontend do alvo desativa a track de áudio localmente.
*   **Encerrar Chamada:** O Host envia `close-room`. O backend desconecta todos os sockets daquela sala.

## Diagrama de Sequência Simplificado

```
[Paciente]        [Servidor]        [Psicólogo]
    |                 |                  |
    |-- join-room --->|                  |
    |                 |-- user-connected ->|
    |                 |                  |
    |                 |<-- signal-offer ---| (Psicólogo inicia conexão)
    |<-- signal-offer-|                  |
    |                 |                  |
    |-- signal-answer ->|                  |
    |                 |-- signal-answer -->|
    |                 |                  |
    |<-- P2P STREAM ESTABELECIDO --------->|
```
