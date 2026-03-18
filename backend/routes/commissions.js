const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /commissions/users/:userId - Retorna todas as regras atreladas ao profissional
router.get('/users/:userId', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.query(
      `
        SELECT 
           c.id, c.user_id, c.service_id, c.type, c.value, 
           s.name AS service_name, s.price AS service_price
        FROM professional_commissions c
        LEFT JOIN tenant_services s ON c.service_id = s.id
        WHERE c.tenant_id = ? AND c.user_id = ?
        ORDER BY c.service_id IS NOT NULL, s.name ASC
      `,
      [req.user.tenant_id, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar comissões.' });
  }
});

// PUT /commissions/users/:userId - Sobrescreve todas as regras de comissão
router.put('/users/:userId', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const rules = req.body; // Array de { id?: number, service_id: number | null, type: 'percentage'|'fixed', value: number }
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    const conn = await db.getConnection();
    
    try {
      await conn.beginTransaction();
      
      // Limpa tudo e os recria (estratégia simples)
      await conn.query('DELETE FROM professional_commissions WHERE tenant_id = ? AND user_id = ?', [req.user.tenant_id, userId]);

      for (const rule of rules) {
        if (!rule.type || typeof rule.value !== 'number') continue;
        
        await conn.query(
          `INSERT INTO professional_commissions (tenant_id, user_id, service_id, type, value)
           VALUES (?, ?, ?, ?, ?)`,
          [
            req.user.tenant_id, 
            userId, 
            rule.service_id || null, 
            rule.type, 
            rule.value
          ]
        );
      }

      await conn.commit();
      
      // Busca atualizados
      const [newRows] = await conn.query(
        `SELECT 
           c.id, c.user_id, c.service_id, c.type, c.value, 
           s.name AS service_name, s.price AS service_price
        FROM professional_commissions c
        LEFT JOIN tenant_services s ON c.service_id = s.id
        WHERE c.tenant_id = ? AND c.user_id = ?
        ORDER BY c.service_id IS NOT NULL, s.name ASC`,
        [req.user.tenant_id, userId]
      );
      
      res.json(newRows);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar regras de comissão.' });
  }
});

module.exports = router;
