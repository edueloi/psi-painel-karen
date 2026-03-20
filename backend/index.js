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
const alertsRoutes = require('./routes/alerts');
const messagesRoutes = require('./routes/messages');
const uploadsRoutes = require('./routes/uploads');
const neuroAssessmentsRoutes = require('./routes/neuro-assessments');
const plansRoutes = require('./routes/plans');
const masterUsersRoutes = require('./routes/master-users');
const masterPermissionsRoutes = require('./routes/master-permissions');
const notesRoutes = require('./routes/notes');
const documentsRoutes = require('./routes/documents');
const aiRoutes = require('./routes/ai');
const profileRoutes = require('./routes/profile');
const productsRoutes = require('./routes/products');
const packagesRoutes = require('./routes/packages');
const permissionProfilesRoutes = require('./routes/permission-profiles');
const commissionsRoutes = require('./routes/commissions');
const notificationsRoutes = require('./routes/notifications');
const whatsappRoutes = require('./routes/whatsapp');
const { startCronJobs } = require('./services/cronJobs');

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
  app.use(`${prefix}/alerts`, alertsRoutes);
  app.use(`${prefix}/messages`, messagesRoutes);
  app.use(`${prefix}/uploads`, uploadsRoutes);
  app.use(`${prefix}/neuro-assessments`, neuroAssessmentsRoutes);
  app.use(`${prefix}/plans`, plansRoutes);
  app.use(`${prefix}/master-users`, masterUsersRoutes);
  app.use(`${prefix}/master-permissions`, masterPermissionsRoutes);
  app.use(`${prefix}/notes`, notesRoutes);
  app.use(`${prefix}/documents`, documentsRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
  app.use(`${prefix}/profile`, profileRoutes);
  app.use(`${prefix}/products`, productsRoutes);
  app.use(`${prefix}/packages`, packagesRoutes);
  app.use(`${prefix}/permission-profiles`, permissionProfilesRoutes);
  app.use(`${prefix}/commissions`, commissionsRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
  app.use(`${prefix}/whatsapp`, whatsappRoutes);
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

// ---- Rota /f/:hash — OG meta tags para compartilhamento social ----
// O Nginx redireciona psiflux.com.br/f/:hash para cá.
// Bots (WhatsApp, Telegram, etc.) recebem HTML com OG tags corretos.
// Navegadores reais são redirecionados para o SPA.
const db = require('./db');
app.get('/f/:hash', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://psiflux.com.br';
  const formUrl = `${FRONTEND_URL}/f/${req.params.hash}`;

  const ua = req.headers['user-agent'] || '';
  const isCrawler = /whatsapp|telegram|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|googlebot|bingbot|embedly|vkshare|pinterest|pocket|flipboard|curl|wget/i.test(ua);

  if (!isCrawler) {
    // Navegador real → SPA
    return res.redirect(302, formUrl);
  }

  try {
    const [forms] = await db.query(
      `SELECT f.title, f.description, f.hash,
              u.name as professional_name, u.specialty as professional_specialty,
              u.crp as professional_crp, u.company_name, u.clinic_logo_url, u.avatar_url
       FROM forms f
       LEFT JOIN users u ON u.id = f.created_by
       WHERE f.hash = ? AND (f.is_public = true OR f.is_global = true)`,
      [req.params.hash]
    );

    if (forms.length === 0) return res.redirect(302, formUrl);

    const form = forms[0];
    const profName = form.professional_name || '';
    const specialty = form.professional_specialty || '';
    const crp = form.professional_crp || '';
    const clinic = form.company_name || 'PsiFlux';
    const formTitle = form.title || 'Formulário Clínico';

    // Descrição: nome do formulário + profissional + especialidade + CRP
    let descParts = [];
    if (profName) descParts.push(profName);
    if (specialty) descParts.push(specialty);
    if (crp) descParts.push(`CRP ${crp}`);
    const profLine = descParts.join(' • ');

    const ogDesc = form.description
      ? `${form.description.substring(0, 120)}${profLine ? ` — ${profLine}` : ''}`
      : profLine
        ? `Formulário clínico de ${profLine}. Clique para responder.`
        : 'Formulário clínico. Clique para responder.';

    const logoUrl = form.clinic_logo_url
      ? (form.clinic_logo_url.startsWith('http') ? form.clinic_logo_url : `${FRONTEND_URL}${form.clinic_logo_url}`)
      : form.avatar_url
        ? (form.avatar_url.startsWith('http') ? form.avatar_url : `${FRONTEND_URL}${form.avatar_url}`)
        : `${FRONTEND_URL}/og-default.png`;

    const ogTitle = `${formTitle} — ${clinic}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${ogTitle}</title>
  <meta name="description" content="${ogDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${formUrl}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDesc}" />
  <meta property="og:image" content="${logoUrl}" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:site_name" content="${clinic}" />
  <meta property="og:locale" content="pt_BR" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDesc}" />
  <meta name="twitter:image" content="${logoUrl}" />
  <meta http-equiv="refresh" content="0;url=${formUrl}" />
</head>
<body>
  <p>Redirecionando...</p>
  <script>window.location.href=${JSON.stringify(formUrl)};</script>
</body>
</html>`);
  } catch (err) {
    console.error('OG /f/:hash error:', err);
    return res.redirect(302, formUrl);
  }
});

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
  startCronJobs();
});
