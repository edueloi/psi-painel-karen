const express = require('express');
const router = express.Router();
const { AccessToken, RoomServiceClient, WebhookReceiver } = require('livekit-server-sdk');
const { authMiddleware } = require('../middleware/auth');

// POST /livekit/token
// Body: { roomName: string, participantName: string, isHost?: boolean }
router.post('/token', authMiddleware, async (req, res) => {
  try {
    const { roomName, participantName, isHost = false } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName e participantName são obrigatórios' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LiveKit não configurado no servidor' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
    });

    const token = await at.toJwt();

    res.json({
      token,
      url: process.env.LIVEKIT_URL,
    });
  } catch (err) {
    console.error('[LiveKit] Erro ao gerar token:', err);
    res.status(500).json({ error: 'Erro ao gerar token LiveKit' });
  }
});

// GET /livekit/token?roomName=...&participantName=...&isHost=...  (para guests sem auth)
router.get('/token-guest', async (req, res) => {
  try {
    const { roomName, participantName, token: guestToken } = req.query;

    if (!roomName || !participantName || !guestToken) {
      return res.status(400).json({ error: 'roomName, participantName e token são obrigatórios' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LiveKit não configurado no servidor' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: false,
    });

    const token = await at.toJwt();

    res.json({
      token,
      url: process.env.LIVEKIT_URL,
    });
  } catch (err) {
    console.error('[LiveKit] Erro ao gerar token guest:', err);
    res.status(500).json({ error: 'Erro ao gerar token LiveKit' });
  }
});

// DELETE /livekit/room/:roomName — host encerra sala (expulsa todos)
router.delete('/room/:roomName', authMiddleware, async (req, res) => {
  try {
    const { roomName } = req.params;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return res.status(500).json({ error: 'LiveKit não configurado no servidor' });
    }

    const svc = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    await svc.deleteRoom(roomName);

    res.json({ ok: true });
  } catch (err) {
    console.error('[LiveKit] Erro ao encerrar sala:', err);
    // Mesmo com erro (sala já não existe) retorna ok pro frontend prosseguir
    res.json({ ok: true });
  }
});

// GET /livekit/diag/:roomName — lista participantes e tracks ao vivo (diagnóstico)
router.get('/diag/:roomName', authMiddleware, async (req, res) => {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;
    const svc = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    const participants = await svc.listParticipants(req.params.roomName);
    const result = participants.map(p => ({
      identity: p.identity,
      name: p.name,
      state: p.state,
      tracks: p.tracks.map(t => ({
        sid: t.sid,
        type: t.type, // 0=audio,1=video,2=data
        source: t.source, // 0=unknown,1=camera,2=microphone,3=screen
        muted: t.muted,
        width: t.width,
        height: t.height,
      })),
    }));
    console.log('[LiveKit-DIAG]', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error('[LiveKit-DIAG] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /livekit/webhook — recebe eventos do servidor LiveKit e loga no PM2
router.post('/webhook', express.raw({ type: 'application/webhook+json' }), async (req, res) => {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    const event = await receiver.receive(req.body, req.headers['authorization']);
    const { event: evtType, room, participant, track } = event;
    console.log(`[LiveKit-WEBHOOK] ${evtType}`, JSON.stringify({
      room: room?.name,
      participant: participant?.identity,
      track: track ? { sid: track.sid, type: track.type, source: track.source, muted: track.muted } : undefined,
    }));
    res.status(200).send();
  } catch (err) {
    console.error('[LiveKit-WEBHOOK] erro ao processar:', err.message);
    res.status(400).send();
  }
});

module.exports = router;
