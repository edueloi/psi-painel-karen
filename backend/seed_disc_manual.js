/**
 * Seed: DISC Adaptado para TCC — formulário + manual nos documentos
 *
 * Execute: node seed_disc_manual.js
 *
 * O que faz:
 *  1. Insere o formulário DISC (via DEFAULT_FORMS) para todos os tenants, se não existir
 *  2. Cria categoria "Manuais e Instrumentos" em doc_categories
 *  3. Insere o manual completo do DISC como modelo de documento (área geral)
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

const { DEFAULT_FORMS } = require('./default_forms_data');
const DISC_FORM = DEFAULT_FORMS.find(f => f.title === 'DISC Adaptado para TCC');

function generateHash() {
  return crypto.randomBytes(8).toString('hex');
}

const DISC_MANUAL = `MANUAL DE USO — DISC ADAPTADO PARA TCC
════════════════════════════════════════════════════════════════

OBJETIVO
--------
Identificar tendências de comportamento, tomada de decisão, relação com pessoas,
ritmo de ação e organização, para ajudar na compreensão de padrões cognitivos e
comportamentais do paciente no contexto da Terapia Cognitivo-Comportamental (TCC).

INSTRUÇÕES PARA O PACIENTE
---------------------------
Leia cada frase e marque o quanto ela combina com você:

  1 = Nunca
  2 = Raramente
  3 = Às vezes
  4 = Frequentemente
  5 = Quase sempre

Não há resposta certa ou errada. Responda com base no seu comportamento habitual.


SISTEMA DE PONTUAÇÃO
--------------------
Cada resposta vale exatamente o número marcado (1 a 5).

Calcule a MÉDIA de cada fator (não a soma), pois os blocos têm tamanhos diferentes:

  DOMINÂNCIA (D)    → Questões 1 a 8   → Média D = Soma ÷ 8
  INFLUÊNCIA (I)    → Questões 9 a 15  → Média I = Soma ÷ 7
  ESTABILIDADE (S)  → Questões 16 a 22 → Média S = Soma ÷ 7
  CONFORMIDADE (C)  → Questões 23 a 30 → Média C = Soma ÷ 8

FAIXAS DE INTERPRETAÇÃO POR MÉDIA
----------------------------------
  1,0 – 2,4 → Traço pouco presente
  2,5 – 3,4 → Traço moderado
  3,5 – 5,0 → Traço forte / predominante

Observe os 2 fatores com maior média — eles formam o perfil combinado do paciente.


LEITURA DOS FATORES
════════════════════════════════════════════════════════════════

D ALTO — Dominância
-------------------
Pessoa mais direta, assertiva, rápida, orientada a resultado e ação.
Na TCC, pode aparecer como: impaciência, necessidade de controle, baixa tolerância
à frustração, pensamento rígido em situações de atraso, erro ou oposição.

Crenças/pensamentos comuns:
  • "Preciso resolver isso agora."
  • "Se eu não assumir, nada vai funcionar."
  • "Demonstrar fraqueza é perigoso."

Pontos de atenção clínicos:
  → Irritabilidade · Impulsividade · Autocobrança por desempenho · Conflito interpessoal


I ALTO — Influência
--------------------
Pessoa comunicativa, calorosa, persuasiva e conectada com pessoas.
Na TCC, pode aparecer como: busca de validação, necessidade de aprovação,
sensibilidade à rejeição, dificuldade com solidão ou silêncio emocional.

Crenças/pensamentos comuns:
  • "Preciso ser aceito(a)."
  • "Se não gostarem de mim, há algo errado comigo."
  • "Preciso manter o clima bom."

Pontos de atenção clínicos:
  → Dependência de validação externa · Dificuldade em colocar limites · Oscilação emocional


S ALTO — Estabilidade
----------------------
Pessoa estável, acolhedora, paciente e mais resistente a mudanças.
Na TCC, pode aparecer como: evitação de conflito, medo de ruptura, dificuldade de
mudança comportamental, tendência a suportar demais para manter segurança.

Crenças/pensamentos comuns:
  • "É melhor evitar problema."
  • "Mudanças podem dar errado."
  • "Preciso manter tudo em paz."

Pontos de atenção clínicos:
  → Passividade · Medo de desagradar · Permanência em contextos ruins por segurança


C ALTO — Conformidade
----------------------
Pessoa analítica, cuidadosa, organizada e crítica.
Na TCC, pode aparecer como: perfeccionismo, excesso de análise, medo de errar,
procrastinação por querer fazer tudo certo.

Crenças/pensamentos comuns:
  • "Não posso errar."
  • "Preciso ter certeza antes."
  • "Só posso agir quando estiver perfeito."

Pontos de atenção clínicos:
  → Ansiedade · Ruminação · Padrões inflexíveis · Autocrítica elevada


PERFIS COMBINADOS
════════════════════════════════════════════════════════════════

D + I  → Pessoa ativa, persuasiva, intensa, rápida e social.
         Pode ter impulsividade, forte presença e dificuldade em desacelerar.

D + C  → Pessoa exigente, estratégica, controladora e focada em alto padrão.
         Pode ter perfeccionismo, rigidez e intolerância a falhas.

I + S  → Pessoa acolhedora, sociável, gentil e relacional.
         Pode se anular para agradar e evitar conflito.

I + C  → Pessoa comunicativa, mas sensível à crítica e preocupada com imagem.
         Pode oscilar entre espontaneidade e autocensura.

S + C  → Pessoa cuidadosa, estável, organizada e reservada.
         Pode ter dificuldade com mudanças, excesso de cautela e medo de errar.

D + S  → Pessoa firme, protetora e constante.
         Pode assumir responsabilidades demais e sofrer com sobrecarga.


COMO COMPARTILHAR O FORMULÁRIO
════════════════════════════════════════════════════════════════
1. Vá em Formulários → encontre "DISC Adaptado para TCC"
2. Clique no botão Compartilhar (ícone de link)
3. Selecione o paciente e copie o link gerado
4. Envie o link por WhatsApp ou email direto ao paciente
5. Quando o paciente responder, você recebe:
   → Alerta no sino do sistema (sino no topo da tela)
   → Email automático com análise completa por fator D/I/S/C


MODELO DE DEVOLUTIVA NA SESSÃO
════════════════════════════════════════════════════════════════

"Seu resultado sugere predominância em [fatores mais altos]. Isso pode indicar um
padrão de funcionamento em que você tende a [descrever o perfil]. Na TCC, isso nos
ajuda a entender como certos pensamentos, emoções e comportamentos se repetem em
situações de pressão, conflito, exigência, vínculo ou mudança."

Exemplo:
"Seu resultado mostrou predominância em C e S. Isso sugere uma tendência a buscar
segurança, organização, previsibilidade e controle. Na prática, isso pode ajudar
muito em responsabilidade e constância, mas também pode gerar ansiedade, autocobrança,
dificuldade com mudanças e medo de errar."


ROTEIRO DE EXPLORAÇÃO NA SESSÃO
════════════════════════════════════════════════════════════════

1. SITUAÇÕES-GATILHO
   Em quais situações esse traço aparece mais? No trabalho? Nos relacionamentos?
   Em decisões? Em conflitos?

2. PENSAMENTOS AUTOMÁTICOS
   O que você pensa quando isso acontece? O que teme que aconteça?
   O que sente que precisa provar, evitar ou controlar?

3. EMOÇÕES ASSOCIADAS
   Ansiedade · Frustração · Culpa · Medo · Raiva · Vergonha

4. COMPORTAMENTOS TÍPICOS
   Confronta · Evita · Agrada · Se cala · Controla · Analisa demais
   Procrastina · Acelera

5. REESTRUTURAÇÃO COGNITIVA
   → Esse padrão está me ajudando ou me desgastando?
   → O que estou prevendo que pode nem acontecer?
   → Que outra forma mais equilibrada existe?
   → O que eu faria se não estivesse tentando controlar tudo?


FICHA DE RESULTADO (para preencher na sessão)
════════════════════════════════════════════════════════════════

Nome: ___________________________  Data: __________  Idade: ____

Pontuações por fator:
  D = ___  (média: ___)    I = ___  (média: ___)
  S = ___  (média: ___)    C = ___  (média: ___)

Fatores predominantes: _______________________________________
Situações em que isso mais aparece: _________________________
Pensamentos automáticos associados: _________________________
Comportamentos que isso gera: _______________________________
Metas terapêuticas: _________________________________________


OBSERVAÇÃO ÉTICA
════════════════════════════════════════════════════════════════
Apresentar este instrumento ao paciente como:
  "Instrumento de apoio para autoconhecimento e compreensão de padrões comportamentais"

NÃO apresentar como teste psicológico formal ou diagnóstico de personalidade.
O DISC adaptado é um recurso auxiliar de avaliação qualitativa, não um instrumento
padronizado com normas populacionais brasileiras.

════════════════════════════════════════════════════════════════
PsiFlux · Manual interno — uso clínico restrito
`;

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux',
  });

  console.log('🚀 Seed DISC — formulário + manual...\n');

  // Busca tenants
  const [tenants] = await conn.query('SELECT id FROM tenants WHERE active = true OR active IS NULL');
  if (tenants.length === 0) {
    console.warn('⚠️  Nenhum tenant encontrado.');
    await conn.end(); return;
  }

  for (const { id: tenantId } of tenants) {
    console.log(`📦 Tenant ${tenantId}:`);

    // Busca admin do tenant
    const [[adminUser]] = await conn.query(
      `SELECT id FROM users WHERE tenant_id = ? ORDER BY id ASC LIMIT 1`,
      [tenantId]
    );
    const adminId = adminUser?.id || null;

    // ── 1. Formulário DISC ──────────────────────────────────────────
    if (DISC_FORM) {
      const [existing] = await conn.query(
        'SELECT id FROM forms WHERE tenant_id = ? AND title = ?',
        [tenantId, DISC_FORM.title]
      );
      if (existing.length > 0) {
        console.log('   ⏭  Formulário DISC já existe — pulando.');
      } else {
        const fields = JSON.stringify({
          questions: DISC_FORM.questions,
          interpretations: DISC_FORM.interpretations || [],
          theme: null,
        });
        await conn.query(
          'INSERT INTO forms (tenant_id, title, description, fields, is_public, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [tenantId, DISC_FORM.title, DISC_FORM.description || null, fields, 1, generateHash(), adminId]
        );
        console.log('   ✅ Formulário DISC criado.');
      }
    }

    // ── 2. Categoria "Manuais e Instrumentos" ──────────────────────
    let catId;
    const [existingCat] = await conn.query(
      'SELECT id FROM doc_categories WHERE name = ? AND tenant_id = ?',
      ['Manuais e Instrumentos', tenantId]
    );
    if (existingCat.length > 0) {
      catId = existingCat[0].id;
      console.log(`   ℹ️  Categoria "Manuais e Instrumentos" já existe (id=${catId}).`);
    } else {
      const [catResult] = await conn.query(
        'INSERT INTO doc_categories (name, tenant_id) VALUES (?, ?)',
        ['Manuais e Instrumentos', tenantId]
      );
      catId = catResult.insertId;
      console.log(`   ✅ Categoria "Manuais e Instrumentos" criada (id=${catId}).`);
    }

    // ── 3. Manual DISC como documento ──────────────────────────────
    const [existingDoc] = await conn.query(
      'SELECT id FROM doc_templates WHERE title = ? AND tenant_id = ?',
      ['Manual DISC Adaptado para TCC', tenantId]
    );
    if (existingDoc.length > 0) {
      console.log('   ⏭  Manual DISC já existe — pulando.');
    } else {
      await conn.query(
        `INSERT INTO doc_templates (tenant_id, title, category_id, doc_type, template_body, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenantId, 'Manual DISC Adaptado para TCC', catId, 'manual', DISC_MANUAL, adminId]
      ).catch(async () => {
        // Tenta sem created_by (coluna opcional)
        await conn.query(
          `INSERT INTO doc_templates (tenant_id, title, category_id, doc_type, template_body)
           VALUES (?, ?, ?, ?, ?)`,
          [tenantId, 'Manual DISC Adaptado para TCC', catId, 'manual', DISC_MANUAL]
        );
      });
      console.log('   ✅ Manual DISC criado nos documentos.');
    }

    console.log('');
  }

  await conn.end();
  console.log('🏁 Seed DISC concluído!');
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
