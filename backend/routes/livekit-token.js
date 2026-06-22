const express = require('express');
const router = express.Router();
const { AccessToken } = require('livekit-server-sdk');
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

module.exports = router;
