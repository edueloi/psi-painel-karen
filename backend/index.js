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
const discRoutes = require('./routes/disc');
const servicesRoutes = require('./routes/services');
const tenantsRoutes = require('./routes/tenants');
const financeRoutes = require('./routes/finance');
const docGeneratorRoutes = require('./routes/doc-generator');
const alertsRoutes = require('./routes/alerts');
const { ensureAlertSchema } = require('./routes/alerts');
const messagesRoutes = require('./routes/messages');
const uploadsRoutes = require('./routes/uploads');
const neuroAssessmentsRoutes = require('./routes/neuro-assessments');
const plansRoutes = require('./routes/plans');
const masterUsersRoutes = require('./routes/master-users');
const permissionsRoutes = require('./routes/master-permissions');
const notesRoutes = require('./routes/notes');
const documentsRoutes = require('./routes/documents');
const vaultRoutes = require('./routes/vault');
const aiRoutes = require('./routes/ai');
const profileRoutes = require('./routes/profile');
const productsRoutes = require('./routes/products');
const packagesRoutes = require('./routes/packages');
const permissionProfilesRoutes = require('./routes/permission-profiles');
const commissionsRoutes = require('./routes/commissions');
const notificationsRoutes = require('./routes/notifications');
const whatsappRoutes = require('./routes/whatsapp');
const wppService = require('./services/whatsappService');
const { startCronJobs } = require('./services/cronJobs');
const { provisionFormsForAllTenants } = require('./services/provisionForms');
const db = require('./db');
const fs = require('fs');

const path = require('path');
const app = express();
const PORT = process.env.PORT || 3013;

function mountApiRoutes(prefix = '') {
  app.use(`${prefix}/uploads-static`, express.static(path.join(__dirname, 'public/uploads')));

  // ---- Rotas publicas (sem auth) ----
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/forms`, formsRoutes);
  app.use(`${prefix}/disc`, discRoutes);
  app.use(`${prefix}/public-profile`, require('./routes/public-profile'));

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
  app.use(`${prefix}/master-permissions`, permissionsRoutes);
  app.use(`${prefix}/notes`, notesRoutes);
  app.use(`${prefix}/documents`, documentsRoutes);
  app.use(`${prefix}/vault`, vaultRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
  app.use(`${prefix}/profile`, profileRoutes);
  app.use(`${prefix}/products`, productsRoutes);
  app.use(`${prefix}/packages`, packagesRoutes);
  app.use(`${prefix}/permission-profiles`, permissionProfilesRoutes);
  app.use(`${prefix}/commissions`, commissionsRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
  app.use(`${prefix}/whatsapp`, whatsappRoutes);
  app.use(`${prefix}/backup`, require('./routes/backup'));
}

// ---- Middlewares globais ----
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Rota pública /f/:hash — OG meta tags para compartilhamento social ----
// DEVE ficar ANTES de mountApiRoutes para não ser bloqueada pelo authMiddleware.
app.get('/f/:hash', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://psiflux.com.br';
  const distIndexPath = path.join(__dirname, '../dist/index.html');

  try {
    const { parseShareToken } = require('./utils/shareToken');
    const resolveUserId = (u) => {
      if (!u) return null;
      const fromToken = parseShareToken(u);
      if (fromToken) return fromToken;
      const asInt = parseInt(u, 10);
      return Number.isFinite(asInt) && asInt > 0 ? asInt : null;
    };
    const userId = resolveUserId(req.query.u);

    // Instrumentos clínicos fixos (não estão na tabela forms)
    const CLINICAL_TOOL_LABELS = {
      'dass-21': { title: 'DASS-21', description: 'Escala de Depressão, Ansiedade e Estresse (DASS-21). Avaliação clínica enviada pelo seu psicólogo(a). Clique para responder.' },
      'disc': { title: 'DISC Avaliativo', description: 'Mapeamento de Perfil Comportamental DISC (Marston). Avaliação clínica enviada pelo seu psicólogo(a). Clique para responder.' },
      'bdi-ii': { title: 'BDI-II', description: 'Inventário de Depressão de Beck (BDI-II). Avaliação de sintomas depressivos enviada pelo seu psicólogo(a). Clique para responder.' },
      'bai': { title: 'BAI', description: 'Inventário de Ansiedade de Beck (BAI). Avaliação de sintomas de ansiedade enviada pelo seu psicólogo(a). Clique para responder.' },
      'snap-iv': { title: 'SNAP-IV', description: 'Escala SNAP-IV de avaliação de TDAH e oposição/desafio. Instrumento enviado pelo psicólogo(a). Clique para responder.' },
      'm-chat-r': { title: 'M-CHAT-R/F', description: 'Instrumento de triagem para sinais de autismo em crianças pequenas (M-CHAT-R/F). Enviado pelo psicólogo(a). Clique para responder.' },
    };

    const hash = req.params.hash?.toLowerCase();

    if (hash && hash in CLINICAL_TOOL_LABELS) {
      const tool = CLINICAL_TOOL_LABELS[hash];
      let prof = null;

      // Busca dados do profissional com proteção a falha de DB
      if (userId) {
        try {
          const [[p]] = await db.query(
            'SELECT name, specialty, crp, company_name, clinic_logo_url, avatar_url FROM users WHERE id = ?',
            [userId]
          );
          prof = p || null;
        } catch (dbErr) {
          console.warn('[/f/:hash] Falha ao buscar profissional:', dbErr.message);
        }
      }

      const profName = prof?.name || '';
      const specialty = prof?.specialty || '';
      const crp = prof?.crp || '';
      const clinic = prof?.company_name || 'PsiFlux';
      const descParts = [profName, specialty, crp ? `CRP ${crp}` : ''].filter(Boolean);
      const profLine = descParts.join(' • ');

      const ogTitle = profName ? `${tool.title} — ${clinic}` : `${tool.title} | PsiFlux`;
      const ogDesc = profLine
        ? tool.description.replace('pelo seu psicólogo(a)', `por ${profName}`).replace('pelo psicólogo(a)', `por ${profName}`)
        : tool.description;

      const toPublicUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('/uploads-static/')) return `${FRONTEND_URL}/api${url}`;
        return `${FRONTEND_URL}${url}`;
      };

      const logoUrl = toPublicUrl(prof?.clinic_logo_url) || toPublicUrl(prof?.avatar_url) || `${FRONTEND_URL}/images/logo-psiflux.png`;
      const pageUrl = `${FRONTEND_URL}/f/${req.params.hash}?u=${req.query.u || ''}&p=${req.query.p || ''}`;

      const ogTags = `
    <title>${ogTitle}</title>
    <meta name="description" content="${ogDesc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    <meta property="og:image" content="${logoUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="${clinic}" />
    <meta property="og:locale" content="pt_BR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
    <meta name="twitter:image" content="${logoUrl}" />`;

      // Tenta injetar as OG tags no HTML; se o dist não existir, serve o fallback padrão
      try {
        if (!fs.existsSync(distIndexPath)) throw new Error('dist/index.html not found');
        let html = fs.readFileSync(distIndexPath, 'utf8');
        html = html.replace(/<title>.*?<\/title>/is, '');
        html = html.replace(/<meta\s+[^>]*name=["']description["'][^>]*>/gi, '');
        html = html.replace(/<meta\s+[^>]*property=["']og:[^"']*["'][^>]*>/gi, '');
        html = html.replace(/<meta\s+[^>]*name=["']twitter:[^"']*["'][^>]*>/gi, '');
        html = html.replace(/<meta\s+[^>]*property=["']twitter:[^"']*["'][^>]*>/gi, '');
        html = html.replace('<head>', `<head>${ogTags}`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=30');
        return res.send(html);
      } catch (htmlErr) {
        console.warn('[/f/:hash] Fallback: nao conseguiu injetar OG tags:', htmlErr.message);
        // Fallback: redireciona o browser para a URL correta (o JS fará o carregamento)
        if (fs.existsSync(distIndexPath)) return res.sendFile(distIndexPath);
        return res.redirect(`${FRONTEND_URL}/f/${req.params.hash}${req._parsedUrl.search || ''}`);
      }
    }

    const [forms] = await db.query(
      `SELECT f.title, f.description, f.hash,
              u.name as professional_name, u.specialty as professional_specialty,
              u.crp as professional_crp, u.company_name, u.clinic_logo_url, u.avatar_url
       FROM forms f
       LEFT JOIN users u ON u.id = COALESCE(?, f.created_by)
       WHERE f.hash = ? AND (f.is_public = true OR f.is_global = true)`,
      [userId, req.params.hash]
    );

    if (forms.length === 0 || !fs.existsSync(distIndexPath)) {
      return res.sendFile(distIndexPath);
    }

    const form = forms[0];
    const formUrl = `${FRONTEND_URL}/f/${form.hash}`;
    const profName = form.professional_name || '';
    const specialty = form.professional_specialty || '';
    const crp = form.professional_crp || '';
    const clinic = form.company_name || 'PsiFlux';
    const formTitle = form.title || 'Formulário Clínico';

    const descParts = [];
    if (profName) descParts.push(profName);
    if (specialty) descParts.push(specialty);
    if (crp) descParts.push(`CRP ${crp}`);
    const profLine = descParts.join(' • ');

    const ogDesc = form.description
      ? `${form.description.substring(0, 130)}${profLine ? ` — ${profLine}` : ''}`
      : profLine
        ? `Formulário clínico enviado por ${profLine}. Clique para responder.`
        : 'Formulário clínico. Clique para responder.';

    // Helper: converte URL do logo para URL pública acessível pelo Nginx
    // /uploads-static/... → /api/uploads-static/... (rota que passa pelo proxy Nginx)
    const toPublicUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      if (url.startsWith('/uploads-static/')) return `${FRONTEND_URL}/api${url}`;
      return `${FRONTEND_URL}${url}`;
    };

    const logoUrl = toPublicUrl(form.clinic_logo_url)
      || toPublicUrl(form.avatar_url)
      || null; // sem fallback para não exibir imagem genérica

    const ogTitle = `${formTitle} — ${clinic}`;

    const ogTags = `
    <title>${ogTitle}</title>
    <meta name="description" content="${ogDesc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${formUrl}" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    ${logoUrl ? `<meta property="og:image" content="${logoUrl}" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />` : ''}
    <meta property="og:site_name" content="${clinic}" />
    <meta property="og:locale" content="pt_BR" />
    <meta name="twitter:card" content="${logoUrl ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
    ${logoUrl ? `<meta name="twitter:image" content="${logoUrl}" />` : ''}`;

    let html = fs.readFileSync(distIndexPath, 'utf8');
    // Remove tags que serão substituídas pelas do formulário
    html = html.replace(/<title>.*?<\/title>/is, '');
    html = html.replace(/<meta\s+[^>]*name=["']description["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+[^>]*property=["']og:[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+[^>]*name=["']twitter:[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+[^>]*property=["']twitter:[^"']*["'][^>]*>/gi, '');
    // Injeta os OG tags corretos logo após o <head>
    html = html.replace('<head>', `<head>${ogTags}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.send(html);
  } catch (err) {
    console.error('OG /f/:hash error:', err);
    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
      return res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
    return res.status(500).send('Erro ao carregar formulário.');
  }
});

// ---- Rota pública /p/:slug — OG meta tags para o perfil público ----
app.get('/p/:slug', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://psiflux.com.br';
  const distIndexPath = path.join(__dirname, '../dist/index.html');

  try {
    const [users] = await db.query(
      `SELECT name, specialty, bio, avatar_url, public_slug, company_name, profile_theme
       FROM users 
       WHERE public_slug = ? AND public_profile_enabled = true`,
      [req.params.slug]
    );

    if (users.length === 0 || !fs.existsSync(distIndexPath)) {
      return res.sendFile(distIndexPath);
    }

    const u = users[0];
    const profileUrl = `${FRONTEND_URL}/p/${u.public_slug}`;
    
    let theme = {};
    try { theme = typeof u.profile_theme === 'string' ? JSON.parse(u.profile_theme) : u.profile_theme || {}; } catch(e) {}

    const name = theme.public_name || u.name || 'Profissional de Saúde';
    const specialty = u.specialty || '';
    const clinic = u.company_name || 'PsiFlux';
    
    const ogTitle = `${name}${specialty ? ` — ${specialty}` : ''}`;
    const ogDesc = u.bio 
      ? u.bio.substring(0, 160) 
      : `Conheça o perfil profissional de ${name}. Atendimento humanizado e especializado em ${specialty || 'saúde mental'}.`;

    const toPublicUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      if (url.startsWith('/uploads-static/')) return `${FRONTEND_URL}/api${url}`;
      return `${FRONTEND_URL}${url}`;
    };

    const imageUrl = toPublicUrl(u.avatar_url);

    const ogTags = `
    <title>${ogTitle}</title>
    <meta name="description" content="${ogDesc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${profileUrl}" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="600" />
    <meta property="og:image:height" content="600" />` : ''}
    <meta property="og:site_name" content="${clinic}" />
    <meta property="og:locale" content="pt_BR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
    ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : ''}`;

    let html = fs.readFileSync(distIndexPath, 'utf8');
    html = html.replace(/<title>.*?<\/title>/is, '');
    html = html.replace(/<meta\s+[^>]*name=["']description["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+[^>]*property=["']og:[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+[^>]*name=["']twitter:[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+[^>]*property=["']twitter:[^"']*["'][^>]*>/gi, '');
    html = html.replace('<head>', `<head>${ogTags}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.send(html);
  } catch (err) {
    console.error('OG /p/:slug error:', err);
    if (fs.existsSync(distIndexPath)) {
      return res.sendFile(distIndexPath);
    }
    return res.status(500).send('Erro ao carregar perfil.');
  }
});

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
  startCronJobs();
  ensureAlertSchema().catch(e => console.warn('⚠️  system_alerts schema:', e.message));
  provisionFormsForAllTenants().catch(e => console.warn('⚠️  provisionForms:', e.message));

  // Recupera conexões do WhatsApp de todos os tenants ativos
  console.log('🔄 Verificando sessões do WhatsApp para recuperar...');
  wppService.recoverActiveSessions();
}); // Fecha o bloco do app.listen
