/**
 * realtimeService.js — canal de sincronização em tempo real entre dispositivos.
 *
 * Path: /ws/sync?token=<jwt>
 *
 * Quando uma rota autenticada cria/edita/exclui um registro (agendamento,
 * paciente, lançamento financeiro, etc.), ela chama broadcast(tenantId, event)
 * e todos os outros clientes conectados do mesmo tenant recebem o evento
 * imediatamente, evitando a necessidade de dar F5 para ver a mudança.
 *
 * Segue o mesmo padrão de transporte de backend/routes/room-ws.js (WebSocket
 * "noServer" + dispatch manual no evento 'upgrade' do httpServer), mas com
 * autenticação por JWT e escopo por tenant_id em vez de por sala.
 */

const WebSocket = require('ws');

class RealtimeService {
  constructor() {
    this.wss = null;
    this.clientsByTenant = new Map(); // tenant_id -> Set<WebSocket>
  }

  _addClient(tenantId, ws) {
    if (!this.clientsByTenant.has(tenantId)) this.clientsByTenant.set(tenantId, new Set());
    this.clientsByTenant.get(tenantId).add(ws);
    ws._tenantId = tenantId;
  }

  _removeClient(ws) {
    const tenantId = ws._tenantId;
    if (tenantId == null) return;
    const set = this.clientsByTenant.get(tenantId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) this.clientsByTenant.delete(tenantId);
    }
  }

  /** Envia um evento para todos os clientes conectados de um tenant. */
  broadcast(tenantId, event) {
    const set = this.clientsByTenant.get(tenantId);
    if (!set || set.size === 0) return;
    const msg = JSON.stringify(event);
    for (const client of set) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
  }

  /** Anexa o servidor WebSocket ao httpServer do Express, path /ws/sync. */
  attach(httpServer) {
    const wss = new WebSocket.Server({ noServer: true });
    this.wss = wss;

    httpServer.on('upgrade', (req, socket, head) => {
      const urlPath = req.url.split('?')[0];
      if (urlPath !== '/ws/sync') return; // não é rota nossa, deixa outro listener tratar
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });

    wss.on('connection', async (ws, req) => {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) { ws.close(4401, 'Token obrigatório'); return; }

      let user;
      try {
        const { verifyToken } = require('../middleware/auth');
        user = await verifyToken(token);
      } catch (err) {
        ws.close(4401, 'Token inválido ou expirado');
        return;
      }

      this._addClient(user.tenant_id, ws);
      ws.send(JSON.stringify({ type: 'connected' }));

      ws.on('close', () => this._removeClient(ws));
      ws.on('error', () => this._removeClient(ws));

      // Ping/pong a cada 25s para manter a conexão viva em redes móveis
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }, 25000);
      ws.on('close', () => clearInterval(pingInterval));
    });

    console.log('[RealtimeSync] WebSocket de sincronização inicializado.');
    return wss;
  }
}

module.exports = new RealtimeService();
