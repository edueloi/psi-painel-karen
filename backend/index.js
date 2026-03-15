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

const app = express();
const PORT = process.env.PORT || 3013;

// ---- Middlewares globais ----
app.use(cors({
  origin: true, // permite qualquer origem em dev
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Rotas públicas (sem auth) ----
app.use('/auth', authRoutes);
app.use('/forms', formsRoutes); // tem rotas públicas /forms/public/:hash

// Placeholder — /virtual-rooms/public é tratado abaixo via skip do authMiddleware

// ---- Health check (público) ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ---- Middleware de autenticação para tudo abaixo ----
app.use(authMiddleware);

// ---- Rotas protegidas ----
app.use('/users', usersRoutes);
app.use('/patients', patientsRoutes);
app.use('/appointments', appointmentsRoutes);
app.use('/virtual-rooms', virtualRoomsRoutes);
app.use('/medical-records', medicalRecordsRoutes);
app.use('/pei', peiRoutes);
app.use('/clinical-tools', clinicalToolsRoutes);
app.use('/case-studies', caseStudiesRoutes);
app.use('/services', servicesRoutes);
app.use('/tenants', tenantsRoutes);
app.use('/finance', financeRoutes);
app.use('/doc-generator', docGeneratorRoutes);
app.use('/messages', messagesRoutes);
app.use('/uploads', uploadsRoutes);
app.use('/neuro-assessments', neuroAssessmentsRoutes);
app.use('/plans', plansRoutes);
app.use('/master-users', masterUsersRoutes);
app.use('/master-permissions', masterPermissionsRoutes);

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// ---- Error handler global ----
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend PsiFlux rodando na porta ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
