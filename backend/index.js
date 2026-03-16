const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { authMiddleware } = require('./middleware/auth');

// Rotas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const patientsRoutes = require('./routes/patients');
const appointmentsRoutes = require('./routes/appointments');
const virtualRoomsRoutes = require('./routes/virtual-rooms');
const medicalRecordsRoutes = require('./routes/medical-records');
const peiRoutes = require('./routes/pei');
const clinicalToolsRoutes = require('./routes/clinical-tools');
const caseStudiesRoutes = require('./routes/case-studies');
const formsRoutes = require('./routes/forms');
const servicesRoutes = require('./routes/services');
const tenantsRoutes = require('./routes/tenants');
const financeRoutes = require('./routes/finance');
const docGeneratorRoutes = require('./routes/doc-generator');
const messagesRoutes = require('./routes/messages');
const uploadsRoutes = require('./routes/uploads');
const neuroAssessmentsRoutes = require('./routes/neuro-assessments');
const plansRoutes = require('./routes/plans');
const masterUsersRoutes = require('./routes/master-users');
const masterPermissionsRoutes = require('./routes/master-permissions');
const notesRoutes = require('./routes/notes');
const documentsRoutes = require('./routes/documents');
const aiRoutes = require('./routes/ai');

const path = require('path');
const app = express();
const PORT = process.env.PORT || 3013;

function mountApiRoutes(prefix = '') {
  app.use(`${prefix}/uploads-static`, express.static(path.join(__dirname, 'public/uploads')));

  // ---- Rotas publicas (sem auth) ----
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/forms`, formsRoutes);

  // ---- Health check (publico) ----
  app.get(`${prefix}/health`, (req, res) => {
    res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
  });

  // ---- Middleware de autenticacao para tudo abaixo ----
  app.use(prefix || '/', authMiddleware);

  // ---- Rotas protegidas ----
  app.use(`${prefix}/users`, usersRoutes);
  app.use(`${prefix}/patients`, patientsRoutes);
  app.use(`${prefix}/appointments`, appointmentsRoutes);
  app.use(`${prefix}/virtual-rooms`, virtualRoomsRoutes);
  app.use(`${prefix}/medical-records`, medicalRecordsRoutes);
  app.use(`${prefix}/pei`, peiRoutes);
  app.use(`${prefix}/clinical-tools`, clinicalToolsRoutes);
  app.use(`${prefix}/case-studies`, caseStudiesRoutes);
  app.use(`${prefix}/services`, servicesRoutes);
  app.use(`${prefix}/tenants`, tenantsRoutes);
  app.use(`${prefix}/finance`, financeRoutes);
  app.use(`${prefix}/doc-generator`, docGeneratorRoutes);
  app.use(`${prefix}/messages`, messagesRoutes);
  app.use(`${prefix}/uploads`, uploadsRoutes);
  app.use(`${prefix}/neuro-assessments`, neuroAssessmentsRoutes);
  app.use(`${prefix}/plans`, plansRoutes);
  app.use(`${prefix}/master-users`, masterUsersRoutes);
  app.use(`${prefix}/master-permissions`, masterPermissionsRoutes);
  app.use(`${prefix}/notes`, notesRoutes);
  app.use(`${prefix}/documents`, documentsRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
}

// ---- Middlewares globais ----
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Aceita deploys com e sem prefixo /api no proxy reverso.
mountApiRoutes('/api');
mountApiRoutes('');

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ error: `Rota nao encontrada: ${req.method} ${req.path}` });
});

// ---- Error handler global ----
app.use((err, req, res, next) => {
  console.error('Erro nao tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Backend PsiFlux rodando na porta ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
