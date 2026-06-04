# Correções — Sala Virtual (WebRTC)

## Problema: Vídeo não conectava entre dispositivos em redes diferentes

**Data:** 2026-06-04  
**Status:** ✅ Resolvido

---

### Sintoma
- Host entrava na sala com câmera ativa
- Guest entrava (celular ou outro browser) e ficava preso em "Conectando vídeo..."
- Console do Host mostrava `Host: enviando offer` mas nunca recebia o answer
- Vídeo nunca estabelecia entre os dois lados

---

### Causa Raiz: Race Condition na Sinalização WebRTC

O fluxo WebRTC usa dois canais em paralelo:
- **WebSocket (WS):** tempo real, preferido para sinalização
- **HTTP Polling:** fallback a cada 1.5s

O problema tinha **3 camadas**:

#### 1. Offer perdido por timing do WebSocket
O Host detectava o Guest via polling de participantes e enviava o `webrtc_offer` via WS broadcast. Mas o Guest ainda não havia terminado de conectar seu WebSocket no momento do broadcast — o offer ia para o vácuo.

#### 2. Polling bloqueado para sinalização quando WS ativo
```js
// CÓDIGO PROBLEMÁTICO (removido)
if (signalingEvent && !shouldUsePollingForSignaling) return;
```
Quando o WS estava conectado, o polling ignorava **todos** os eventos de sinalização (offer, answer, ICE). Se o offer chegou via WS e foi perdido por timing, o offer ficava no `eventsMap` sem nunca ser processado pelo polling.

#### 3. Answer reprocessado em loop pelo polling
Após aceitar o answer, ele permanecia no `eventsMap`. O polling continuava entregando o mesmo answer para o Host, que descartava como duplicado mas causava instabilidade no ICE. Combinado com o timeout agressivo de `disconnected` (5s), a conexão reiniciava continuamente.

---

### Correções Aplicadas

#### `pages/MeetingRoom.tsx`

**1. Sinal `guest_ready` — Guest avisa Host quando WebSocket conecta**
```js
ws.onopen = () => {
  roomWsReadyRef.current = true;
  if (isGuest && !guestReadySent) {
    guestReadySent = true;
    ws?.send(JSON.stringify({ type: 'event', event_type: 'guest_ready', payload: {} }));
  }
};
```

**2. Host reage ao `guest_ready` reenviando o offer**
```js
} else if (evt.event_type === "guest_ready") {
  if (!isGuest && !isCompanionMode) {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed' || pc.connectionState === 'closed') {
      hardResetHostConnection(200);
    } else {
      requestHostRenegotiation("guest_ready");
    }
  }
}
```

**3. Polling processa todos os eventos (guard removido)**
```js
// ANTES (bloqueava sinalização quando WS ativo):
if (signalingEvent && !shouldUsePollingForSignaling) return;

// DEPOIS (removido — lastEventId garante deduplicação):
// Polling processa todos os eventos normalmente
```

**4. Fila de retry para eventos WS que chegam antes do processador estar pronto**
```js
if (processRoomEventRef.current) {
  processRoomEventRef.current(evt);
} else if (isSignaling) {
  // Tenta processar a cada 100ms por até 2s
  const retry = setInterval(() => {
    if (processRoomEventRef.current) {
      clearInterval(retry);
      processRoomEventRef.current(evt);
    }
  }, 100);
}
```

**5. Timeout de `disconnected` aumentado (5s → 15s) no Host e Guest**

ICE `disconnected` é temporário em redes móveis (4G oscila). Reiniciar em 5s causava loop de reconexão desnecessário.

```js
// Host
iceRestartTimer = setTimeout(() => {
  if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
    hardResetHostConnection(500);
  }
}, 15000); // era 5000

// Guest
guestIceRestartTimer = setTimeout(() => {
  sendRoomEventRef.current?.('request_renegotiation', {});
}, 15000); // era 5000
```

**6. `onconnectionstatechange` não remove vídeo em `disconnected`**
```js
// ANTES — removia vídeo em disconnected (muito agressivo):
if (['disconnected', 'failed', 'closed'].includes(pc.connectionState))

// DEPOIS — só remove em falha definitiva:
if (['failed', 'closed'].includes(pc.connectionState))
```

---

#### `backend/routes/room-ws.js`

**7. `guest_ready` não persiste no `eventsMap`**

Evita que o Host receba o próprio sinal via polling e entre em loop.

```js
const skipPersist = event_type === 'guest_ready';
```

**8. `webrtc_answer` purga eventos antigos do `eventsMap`**

Evita que o polling reentregue o answer aceito repetidamente.

```js
// ANTES:
if (event_type === 'webrtc_offer') purgeWebrtcEvents(roomId);

// DEPOIS:
if (event_type === 'webrtc_offer' || event_type === 'webrtc_answer') purgeWebrtcEvents(roomId);
```

---

### Fluxo Correto Após Correção

```
Host entra na sala
  ↓
Guest entra → WebSocket conecta → envia guest_ready
  ↓
Host recebe guest_ready → cria PeerConnection → envia webrtc_offer (WS + eventsMap)
  ↓
Guest recebe offer (WS direto OU polling como fallback)
  ↓
Guest cria answer → envia webrtc_answer (WS + eventsMap purgado)
  ↓
Host recebe answer → setRemoteDescription → ICE checking → connected
  ↓
Vídeo/áudio estabelecido ✅
  ↓
Se ICE ficar disconnected temporariamente → aguarda 15s antes de reiniciar
```

---

### Infraestrutura Confirmada Funcionando
- **TURN Server:** coturn rodando em `72.62.8.195:3478` (TCP + UDP) ✅
- **WebSocket:** Nginx fazendo proxy correto de `/ws/room/` com headers `Upgrade` ✅
- **Candidatos relay:** `typ relay` gerados corretamente pelo TURN ✅
