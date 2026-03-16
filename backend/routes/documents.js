const express = require('express');
const router = express.Router();

// GET /documents?patient_id=X
router.get('/', async (req, res) => {
  res.json([]);
});

// POST /documents
router.post('/', async (req, res) => {
  res.status(201).json({ id: null, message: 'Not yet implemented' });
});

module.exports = router;
