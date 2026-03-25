const express = require('express');
const router = express.Router();
const db = require('../db');

// Avaliações neuropsicológicas pré-definidas (templates fixos)
// Avaliações neuropsicológicas pré-definidas (templates estruturados)
const ASSESSMENT_TEMPLATES = [
  { 
    id: 1, 
    name: 'CARS-2', 
    description: 'Childhood Autism Rating Scale - 2nd Edition', 
    category: 'autism',
    initial: 'C',
    help_text: 'Soma total: 15-29.5 (Sem Autismo); 30-36.5 (Leve-Mod); 37+ (Grave).',
    fields: [
      { id: 'total_score', label: 'Pontuação Total', type: 'number', placeholder: 'Soma total (15-60)' },
      { id: 'classification', label: 'Classificação', type: 'select', options: ['Mínimo/Sem Autismo', 'Autismo Leve a Moderado', 'Autismo Grave'] },
      { id: 'clinical_notes', label: 'Impressões Clínicas', type: 'text' }
    ]
  },
  { 
    id: 2, 
    name: 'ADOS-2', 
    description: 'Autism Diagnostic Observation Schedule', 
    category: 'autism',
    initial: 'A',
    help_text: 'Considere o ponto de corte do módulo específico aplicado.',
    fields: [
      { id: 'module', label: 'Módulo Aplicado', type: 'select', options: ['Módulo 1', 'Módulo 2', 'Módulo 3', 'Módulo 4', 'Toddler'] },
      { id: 'social_affect', label: 'Afeto Social (SA)', type: 'number' },
      { id: 'rrb', label: 'Comportamento Restrito/Repetitivo (RRB)', type: 'number' },
      { id: 'comparison_score', label: 'Pontuação de Comparação (CSS)', type: 'number', placeholder: '1-10' },
      { id: 'classification', label: 'Classificação ADOS', type: 'select', options: ['Autismo', 'Espectro do Autismo', 'Não-Espectro'] }
    ]
  },
  { 
    id: 3, 
    name: 'Vineland-3', 
    description: 'Vineland Adaptive Behavior Scales - 3rd Edition', 
    category: 'adaptive',
    initial: 'V',
    help_text: 'Standard Score: Média=100, DP=15. Escores abaixo de 70 indicam déficit.',
    fields: [
      { id: 'abc_score', label: 'Índice de Comportamento Adaptativo (ABC)', type: 'number', placeholder: 'Standard Score (M=100, SD=15)' },
      { id: 'communication', label: 'Comunicação (Pontuação Padrão)', type: 'number' },
      { id: 'daily_living', label: 'Habilidades de Vida Diária', type: 'number' },
      { id: 'socialization', label: 'Socialização', type: 'number' },
      { id: 'motor_skills', label: 'Habilidades Motoras (se aplicável)', type: 'number' },
      { id: 'interpretation', label: 'Interpretação qualitativa', type: 'text' }
    ]
  },
  { 
    id: 4, 
    name: 'WISC-V', 
    description: 'Escala de Inteligência Wechsler para Crianças - 5ª Ed.', 
    category: 'intelligence',
    initial: 'W',
    help_text: 'QI 90-109: Médio; 70-79: Limítrofe; <70: Muito Baixo.',
    fields: [
      { id: 'fsiq', label: 'QI Total (FSIQ)', type: 'number' },
      { id: 'vci', label: 'Compreensão Verbal (VCI)', type: 'number' },
      { id: 'vsi', label: 'Visuoespacial (VSI)', type: 'number' },
      { id: 'fri', label: 'Raciocínio Fluido (FRI)', type: 'number' },
      { id: 'wmi', label: 'Memória Operacional (WMI)', type: 'number' },
      { id: 'psi', label: 'Velocidade de Processamento (PSI)', type: 'number' }
    ]
  },
  { 
    id: 5, 
    name: 'SNAP-IV', 
    description: 'Swanson, Nolan e Pelham Questionnaire - TDAH', 
    category: 'adhd',
    initial: 'S',
    help_text: 'Desatenção/Hiperat: Normal <1.2; Limítrofe 1.2-1.6/1.7; Clínico >1.6/1.7.',
    fields: [
      { id: 'inattention_avg', label: 'Média de Desatenção (Itens 1-9)', type: 'number', placeholder: 'Normal < 1.2 / Limite 1.2-1.7' },
      { id: 'hyperactivity_avg', label: 'Média de Hiperat./Impul. (Itens 10-18)', type: 'number', placeholder: 'Normal < 1.2 / Limite 1.2-2.3' },
      { id: 'opposition_avg', label: 'Média Desafio/Oposição (Itens 19-26)', type: 'number' },
      { id: 'interpretation', label: 'Sintomatologia clínica detectada?', type: 'select', options: ['Não', 'Sugestivo de TDAH-I', 'Sugestivo de TDAH-H', 'Sugestivo de TDAH-C', 'Sugestivo de TOD'] }
    ]
  },
  { 
    id: 6, 
    name: 'SDQ', 
    description: 'Questionário de Capacidades e Dificuldades', 
    category: 'behavior',
    initial: 'S',
    help_text: 'Dificuldades totais: 0-13 Normal; 14-16 Limítrofe; 17+ Anormal.',
    fields: [
      { id: 'total_difficulties', label: 'Escore de Dificuldades Totais', type: 'number', placeholder: '0-40' },
      { id: 'emotional_symptoms', label: 'Sintomas Emocionais', type: 'number' },
      { id: 'conduct_problems', label: 'Problemas de Conduta', type: 'number' },
      { id: 'hyperactivity', label: 'Hiperatividade', type: 'number' },
      { id: 'peer_problems', label: 'Problemas com Pares', type: 'number' },
      { id: 'prosocial', label: 'Comportamento Prosocial', type: 'number' },
      { id: 'result_cat', label: 'Classificação Geral', type: 'select', options: ['Normal', 'Limítrofe', 'Anormal'] }
    ]
  },
];

// GET /neuro-assessments - Lista instrumentos disponíveis
router.get('/', async (req, res) => {
  res.json(ASSESSMENT_TEMPLATES);
});

// GET /neuro-assessments/:id/results - Resultados de um paciente
router.get('/:id/results', async (req, res) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ error: 'patient_id é obrigatório' });

    const scopeKey = `neuro_${req.params.id}_${patient_id}`;

    const [rows] = await db.query(
      'SELECT id, data, created_at, updated_at FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ? ORDER BY created_at DESC',
      [scopeKey, 'neuro/assessment', req.user.tenant_id]
    );

    const formattedRows = rows.map(r => {
      try { return { ...r, data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data }; }
      catch { return r; }
    });

    res.json(formattedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resultados' });
  }
});

// POST /neuro-assessments/:id/results - Salvar resultado
router.post('/:id/results', async (req, res) => {
  try {
    const { patient_id, data } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id é obrigatório' });

    const scopeKey = `neuro_${req.params.id}_${patient_id}`;
    const fullType = 'neuro/assessment';
    const dataStr = JSON.stringify(data || {});

    // Sempre inserimos um novo registro para manter o histórico
    await db.query(
      'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, patient_id, req.user.id, scopeKey, fullType, dataStr]
    );

    res.json({ ok: true, assessment_id: req.params.id, patient_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar resultado' });
  }
});

// PUT /neuro-assessments/results/:resultId - Atualizar resultado
router.put('/results/:resultId', async (req, res) => {
  try {
    const { data } = req.body;
    const dataStr = JSON.stringify(data || {});

    await db.query(
      'UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
      [dataStr, req.params.resultId, req.user.tenant_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar resultado' });
  }
});

// DELETE /neuro-assessments/results/:resultId - Deletar resultado
router.delete('/results/:resultId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM clinical_tools WHERE id = ? AND tenant_id = ?',
      [req.params.resultId, req.user.tenant_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar resultado' });
  }
});

module.exports = router;
