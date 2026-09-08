const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ── Auto-migrate: tabelas de termos versionados e aceites ────────────────────
async function ensureTermsSchema() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS terms_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('termos_uso','diretrizes_ia','direitos_autorais') NOT NULL,
        version VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary VARCHAR(500) NULL,
        content LONGTEXT NOT NULL,
        effective_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_type_version (type, version)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS terms_acceptances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        tenant_id INT NOT NULL,
        terms_version_id INT NOT NULL,
        accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(64) NULL,
        user_agent VARCHAR(500) NULL,
        UNIQUE KEY unique_user_version (user_id, terms_version_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (terms_version_id) REFERENCES terms_versions(id) ON DELETE CASCADE
      )
    `);
  } catch (err) {
    console.error('[Terms] Erro ao criar schema:', err.message);
  }

  await seedTermsVersions();
}

// Conteúdo agnóstico de profissão — a Plaelo atende psicólogos, psiquiatras,
// terapeutas ocupacionais, fonoaudiólogos e toda a rede de cuidado em saúde
// mental, não só psicólogos (ao contrário de textos genéricos de mercado que
// citam só CFP/CRP).
const TERMS_SEED = [
  {
    type: 'termos_uso',
    version: '1.0',
    title: 'Termos de Uso',
    summary: 'Natureza da plataforma, LGPD, responsabilidade profissional e uso da IA.',
    effective_at: '2026-01-01 00:00:00',
    content: `TERMOS DE USO DA PLATAFORMA PLAELO
Versão 1.0

Bem-vindo(a) à Plaelo, plataforma de gestão clínica com apoio de Inteligência Artificial para profissionais e clínicas de saúde mental — psicólogos, psiquiatras, terapeutas ocupacionais, fonoaudiólogos, assistentes sociais e demais profissionais da rede de cuidado. A leitura e o aceite destes Termos são obrigatórios para uso do sistema.

1. Natureza da plataforma e da IA
1.1. A Plaelo é uma ferramenta de apoio à atividade clínica do profissional, oferecendo gestão de pacientes, agenda, prontuário, documentos, financeiro e assistência baseada em Inteligência Artificial (IA), identificada na plataforma como "Bia".
1.2. A Bia utiliza modelos de linguagem para auxiliar o profissional em tarefas como resumo de sessões, organização de prontuário e apoio ao raciocínio clínico.
1.3. A IA NÃO SUBSTITUI O PROFISSIONAL. Ela não emite diagnóstico, não prescreve conduta terapêutica e não substitui avaliação clínica humana. Todo conteúdo gerado pela IA é sugestão que precisa ser revisada e validada pelo profissional antes de qualquer uso clínico.
1.4. A qualidade das respostas da IA depende das informações fornecidas. A IA pode produzir respostas incorretas ou incompletas — cabe ao profissional avaliar criticamente cada uso.

2. Responsabilidade profissional
2.1. Toda decisão clínica é de responsabilidade exclusiva do profissional registrado no sistema. A Plaelo é ferramenta de apoio; não se responsabiliza por condutas terapêuticas, diagnósticos ou desfechos clínicos.
2.2. O profissional declara estar devidamente registrado no conselho de classe competente à sua profissão (quando aplicável), em situação regular para exercício profissional.
2.3. O profissional é o único responsável pela guarda do sigilo profissional sobre os dados inseridos na plataforma.

3. Proteção de dados pessoais (LGPD — Lei 13.709/2018)
3.1. A plataforma processa dados pessoais sensíveis de pacientes (dados de saúde). O profissional é o Controlador desses dados; a Plaelo atua como Operadora, tratando dados conforme instruções do Controlador.
3.2. Obrigações do profissional como Controlador: coletar consentimento informado dos pacientes, manter dados atualizados, atender requisições de titulares nos prazos da LGPD.
3.3. Obrigações da Plaelo como Operadora: armazenar dados de forma segura (criptografia em trânsito, isolamento multi-tenant por conta), não utilizar dados de pacientes para finalidades distintas das instruídas pelo Controlador, notificar incidentes de segurança.
3.4. Quando o profissional utiliza modelos de IA de terceiros, trechos relevantes do histórico podem ser enviados ao provedor do modelo exclusivamente para processar a requisição.

4. Conta e credenciais
4.1. O profissional é responsável pela guarda de sua senha e por toda atividade realizada sob sua conta.
4.2. A plataforma é multi-tenant: dados de uma conta nunca são acessíveis a outra.

5. Modificações dos Termos
5.1. Estes Termos podem ser atualizados. Mudanças relevantes exigirão reaceite.

6. Lei aplicável
6.1. Estes Termos são regidos pela legislação brasileira, em especial a LGPD e o Código de Defesa do Consumidor, quando aplicável.

Ao aceitar, o profissional declara que leu integralmente estes Termos e os aceita de forma livre, informada e inequívoca. O aceite fica registrado (data/hora, versão, conta) para fins de trilha de auditoria.`,
  },
  {
    type: 'diretrizes_ia',
    version: '1.0',
    title: 'Diretrizes Éticas da IA',
    summary: 'Papel da Bia, limites de uso e responsabilidade profissional.',
    effective_at: '2026-01-01 00:00:00',
    content: `DIRETRIZES ÉTICAS DA IA NA PLAELO
Versão 1.0

Estas Diretrizes delimitam a postura ética da plataforma e do profissional frente ao uso da assistente de IA (Bia) na prática clínica.

1. A IA não substitui o profissional
A Bia é uma ferramenta de apoio — nunca um profissional substituto. Ela organiza informação, sugere hipóteses e auxilia na escrita, mas não possui julgamento clínico, vínculo terapêutico ou responsabilidade profissional. Toda decisão permanece do profissional humano.

2. Responsabilidade profissional exclusiva
Qualquer documento, resumo ou sugestão gerada com apoio da Bia é de responsabilidade integral do profissional que a utiliza e revisa.

3. Papel da IA
Organizar (estruturar prontuário e documentos), sugerir (hipóteses e caminhos revisáveis), apoiar (sistematização de dados) e auxiliar na escrita (rascunhos e reformulações revisados pelo profissional).

4. O que a IA nunca deve fazer
Emitir diagnóstico autônomo, prescrever conduta terapêutica sem revisão humana, gerar laudos sem revisão integral, substituir a escuta clínica ou conduzir atendimento de forma autônoma.

5. Situações de risco de vida
Ao identificar sinais de risco iminente ao paciente ou terceiros, o profissional deve agir imediatamente conforme os protocolos e canais de emergência aplicáveis (CVV 188, CAPS, SAMU 192, UBS). A IA não substitui esse protocolo.

6. Sigilo e proteção de dados
Todo dado do paciente é isolado por conta e protegido por sigilo profissional, nos termos da LGPD.

7. Limites da IA
Modelos de linguagem podem errar informações, gerar respostas incompletas ou reproduzir vieses. Toda saída da IA exige revisão crítica antes de uso clínico.

8. Transparência com o paciente
O profissional deve comunicar ao paciente, quando aplicável, que a Plaelo utiliza IA como apoio ao raciocínio clínico e à organização de documentos.

Ao aceitar estas Diretrizes, o profissional declara compreender que a IA é apoio, não substituta da sua atuação, e assume a responsabilidade técnica e ética pelas decisões tomadas com seu suporte. Este aceite é distinto e complementar ao aceite dos Termos de Uso.`,
  },
  {
    type: 'direitos_autorais',
    version: '1.0',
    title: 'Termo de Direitos Autorais',
    summary: 'Declaração de titularidade sobre materiais enviados à plataforma.',
    effective_at: '2026-01-01 00:00:00',
    content: `TERMO DE DIREITOS AUTORAIS — MATERIAIS ENVIADOS À PLATAFORMA
Versão 1.0

Este Termo regula o envio de materiais (documentos, protocolos, instrumentos, imagens e outros conteúdos) à Plaelo.

1. Declaração de titularidade ou licença
Ao enviar qualquer material, o profissional declara que é autor do material, possui licença/autorização para uso, o material está em domínio público, ou o uso se enquadra nas limitações legais de direitos autorais (Lei 9.610/98).

2. Uso estritamente pessoal e profissional
Os materiais enviados ficam vinculados à conta do profissional que os enviou, sem redistribuição para outras contas ou para o público.

3. Limites ao uso
O profissional se compromete a não utilizar a plataforma para reproduzir obras protegidas fora das hipóteses legais, nem compartilhar materiais com terceiros não autorizados pelo titular dos direitos.

4. Responsabilidade exclusiva
A Plaelo não audita os materiais enviados quanto à legalidade ou aos direitos autorais — a verificação é de responsabilidade exclusiva do profissional. Em caso de notificação de violação de direitos autorais, a plataforma poderá remover o material e comunicará o responsável.

5. Reconhecimento do aceite
O aceite deste Termo é versionado e registrado (versão, data/hora, conta) para fins de trilha de auditoria.

Ao aceitar, o profissional declara que leu integralmente este Termo e assume, de forma livre e informada, a responsabilidade pela legalidade de todos os materiais que enviar à plataforma.`,
  },
];

async function seedTermsVersions() {
  for (const t of TERMS_SEED) {
    try {
      await db.query(
        `INSERT INTO terms_versions (type, version, title, summary, content, effective_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = title`,
        [t.type, t.version, t.title, t.summary, t.content, t.effective_at]
      );
    } catch (err) {
      console.error(`[Terms] Erro ao semear versão ${t.type} ${t.version}:`, err.message);
    }
  }
}

ensureTermsSchema();

// Retorna, por tipo, sempre a versão mais recente vigente (maior effective_at)
async function getLatestVersions() {
  const [rows] = await db.query(
    `SELECT tv.* FROM terms_versions tv
     INNER JOIN (
       SELECT type, MAX(effective_at) AS max_effective
       FROM terms_versions
       WHERE effective_at <= NOW()
       GROUP BY type
     ) latest ON latest.type = tv.type AND latest.max_effective = tv.effective_at`
  );
  return rows;
}

// GET /terms/pending-status — usado pelo gate do frontend para saber se há
// termos pendentes de aceite pelo usuário logado.
router.get('/pending-status', authMiddleware, async (req, res) => {
  try {
    const latest = await getLatestVersions();
    const [accepted] = await db.query(
      'SELECT terms_version_id FROM terms_acceptances WHERE user_id = ?',
      [req.user.id]
    );
    const acceptedIds = new Set(accepted.map(a => a.terms_version_id));
    const pending = latest.filter(t => !acceptedIds.has(t.id));

    res.json({
      has_pending: pending.length > 0,
      pending_terms: pending.map(t => ({
        id: t.id, type: t.type, version: t.version, title: t.title, summary: t.summary, content: t.content,
      })),
    });
  } catch (err) {
    console.error('[Terms] Erro ao verificar pendências:', err);
    res.status(500).json({ error: 'Erro ao verificar termos pendentes.' });
  }
});

// POST /terms/:versionId/accept — registra o aceite de uma versão específica
router.post('/:versionId/accept', authMiddleware, async (req, res) => {
  try {
    const { versionId } = req.params;
    const [[version]] = await db.query('SELECT id FROM terms_versions WHERE id = ?', [versionId]);
    if (!version) return res.status(404).json({ error: 'Versão de termo não encontrada.' });

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().slice(0, 64);
    const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 500);

    await db.query(
      `INSERT INTO terms_acceptances (user_id, tenant_id, terms_version_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE accepted_at = accepted_at`,
      [req.user.id, req.user.tenant_id, versionId, ip, userAgent]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Terms] Erro ao registrar aceite:', err);
    res.status(500).json({ error: 'Erro ao registrar aceite.' });
  }
});

// GET /terms/my-history — trilha de aceites do usuário logado, para a tela de
// "Conformidade ética e legal" em Configurações.
router.get('/my-history', authMiddleware, async (req, res) => {
  try {
    const latest = await getLatestVersions();
    const [accepted] = await db.query(
      `SELECT ta.terms_version_id, ta.accepted_at, tv.type, tv.version
       FROM terms_acceptances ta
       JOIN terms_versions tv ON tv.id = ta.terms_version_id
       WHERE ta.user_id = ?`,
      [req.user.id]
    );
    const acceptedByVersionId = new Map(accepted.map(a => [a.terms_version_id, a.accepted_at]));

    const items = latest.map(t => ({
      id: t.id,
      type: t.type,
      version: t.version,
      title: t.title,
      summary: t.summary,
      content: t.content,
      accepted_at: acceptedByVersionId.get(t.id) || null,
    }));

    res.json({ items });
  } catch (err) {
    console.error('[Terms] Erro ao buscar histórico:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de aceites.' });
  }
});

module.exports = router;
