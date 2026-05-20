/**
 * room-ws.js — WebSocket de sinalização para salas virtuais
 *
 * Protocolo (JSON):
 *   Cliente → Servidor:
 *     { type: "join",  roomId: string, token?: string }   — entrar na sala
 *     { type: "event", event_type: string, payload: any } — enviar evento
 *
 *   Servidor → Cliente:
 *     { type: "event", id: number, event_type: string, payload_json: string, created_at: string }
 *     { type: "joined", roomId: string }
 *     { type: "error",  message: string }
 *
 * Ao receber um evento via WS, o servidor:
 *   1. Persiste no eventsMap (mesma memória do polling HTTP)
 *   2. Faz broadcast para todos os outros clientes da mesma sala
 *
 * Isso garante retrocompatibilidade: quem não suportar WS continua usando polling.
 */

const WebSocket = require('ws');

// Importa os maps compartilhados do virtual-rooms
// Para evitar acoplamento circular, reexportamos as funções necessárias via
// um módulo de estado compartilhado.
let _pushItem = null;
let _nextId   = null;
let _eventsMap = null;

function injectRoomState({ pushItem, nextId, eventsMap }) {
  _pushItem  = pushItem;
  _nextId    = nextId;
  _eventsMap = eventsMap;
}

function purgeWebrtcEvents(roomId) {
  if (!_eventsMap || !_eventsMap.has(roomId)) return;
  const list = _eventsMap.get(roomId);
  _eventsMap.set(roomId, list.filter(e => !e.event_type.startsWith('webrtc_') && e.event_type !== 'request_renegotiation'));
}

// roomId → Set<WebSocket>
const roomClients = new Map();

function joinRoom(ws, roomId) {
  if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
  roomClients.get(roomId).add(ws);
  ws._roomId = roomId;
}

function leaveRoom(ws) {
  const roomId = ws._roomId;
  if (!roomId) return;
  const set = roomClients.get(roomId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) roomClients.delete(roomId);
  }
}

function broadcast(roomId, data, exclude) {
  const set = roomClients.get(roomId);
  if (!set) return;
  const msg = JSON.stringify(data);
  for (const client of set) {
    if (client === exclude) continue;
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

/**
 * Retorna quantos clientes WS estão conectados numa sala (útil para debug).
 */
function roomSize(roomId) {
  return roomClients.get(roomId)?.size ?? 0;
}

/**
 * Envia evento para todos os clientes WS de uma sala.
 * Chamado pelo virtual-rooms.js quando um evento chega via HTTP POST,
 * garantindo que clientes WS recebam imediatamente sem esperar o próximo poll.
 */
function broadcastEventToRoom(roomId, item) {
  broadcast(roomId, { type: 'event', ...item }, null);
}

/**
 * Anexa o servidor WebSocket ao httpServer do Express.
 * Path: /ws/room/:roomId
 */
function attachRoomWebSocket(httpServer) {
  const wss = new WebSocket.Server({ noServer: true });

  // Upgrade apenas em /ws/room/
  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/ws/room/')) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    // Extrai roomId da URL: /ws/room/<roomId>
    const roomId = req.url.replace('/ws/room/', '').split('?')[0].toLowerCase().trim();
    if (!roomId) { ws.close(4000, 'roomId obrigatório'); return; }

    joinRoom(ws, roomId);
    ws.send(JSON.stringify({ type: 'joined', roomId }));

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === 'event') {
        const { event_type, payload } = msg;
        if (!event_type) return;

        // Persiste no map em memória (mesmo usado pelo polling HTTP)
        if (event_type === 'webrtc_offer') purgeWebrtcEvents(roomId);
        let item = null;
        if (_pushItem && _nextId && _eventsMap) {
          item = _pushItem(_eventsMap, roomId, {
            id: _nextId(),
            event_type,
            payload_json: payload ? JSON.stringify(payload) : null,
            created_at: new Date().toISOString(),
          });
        } else {
          // Fallback se injectRoomState não foi chamado ainda
          item = {
            id: Date.now(),
            event_type,
            payload_json: payload ? JSON.stringify(payload) : null,
            created_at: new Date().toISOString(),
          };
        }

        // Broadcast para outros na sala (não para quem enviou)
        broadcast(roomId, { type: 'event', ...item }, ws);

        // Confirma ao remetente com o ID gerado
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ack', id: item.id, event_type }));
        }
      }
    });

    ws.on('close', () => leaveRoom(ws));
    ws.on('error', () => leaveRoom(ws));

    // Ping/pong a cada 25s para manter conexão viva em mobile (redes 4G fecham idle)
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 25000);
    ws.on('close', () => clearInterval(pingInterval));
  });

  console.log('[RoomWS] WebSocket de sinalização inicializado.');
  return wss;
}

module.exports = { attachRoomWebSocket, injectRoomState, broadcastEventToRoom, roomSize };
