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

// Dados do DISC inline (independente do default_forms_data.js)
const DISC_OPTIONS = [
  { label: 'Nunca', value: 1 },
  { label: 'Raramente', value: 2 },
  { label: 'Às vezes', value: 3 },
  { label: 'Frequentemente', value: 4 },
  { label: 'Quase sempre', value: 5 },
];
function qb(id, text, block) {
  return { id, text, type: 'radio', options: DISC_OPTIONS, required: true, block };
}
const DISC_FORM = {
  title: 'DISC Adaptado para TCC',
  description:
    'Identifica tendências de comportamento, tomada de decisão, relação com pessoas, ritmo de ação e organização. ' +
    'Leia cada frase e marque o quanto ela combina com você: 1 = Nunca · 2 = Raramente · 3 = Às vezes · 4 = Frequentemente · 5 = Quase sempre',
  questions: [
    qb('q1',  'Gosto de resolver as coisas rapidamente.', 'D'),
    qb('q2',  'Fico incomodado(a) quando percebo lentidão ou indecisão nos outros.', 'D'),
    qb('q3',  'Costumo assumir a liderança quando ninguém toma iniciativa.', 'D'),
    qb('q4',  'Prefiro agir logo do que pensar por muito tempo.', 'D'),
    qb('q5',  'Sinto necessidade de ter controle sobre o que está acontecendo.', 'D'),
    qb('q6',  'Tenho facilidade para confrontar situações difíceis.', 'D'),
    qb('q7',  'Fico frustrado(a) quando as coisas não saem como planejei.', 'D'),
    qb('q8',  'Em conflitos, costumo me posicionar de forma direta.', 'D'),
    qb('q9',  'Gosto de conversar e me conectar com pessoas.', 'I'),
    qb('q10', 'Sinto-me motivado(a) quando recebo atenção ou reconhecimento.', 'I'),
    qb('q11', 'Tenho facilidade para entusiasmar outras pessoas.', 'I'),
    qb('q12', 'Gosto de ambientes leves, dinâmicos e com interação.', 'I'),
    qb('q13', 'Costumo expressar com facilidade o que penso e sinto.', 'I'),
    qb('q14', 'Gosto de ser visto(a) como alguém agradável e inspirador(a).', 'I'),
    qb('q15', 'Fico mais animado(a) quando estou em grupo do que sozinho(a).', 'I'),
    qb('q16', 'Valorizo ambientes calmos, previsíveis e harmoniosos.', 'S'),
    qb('q17', 'Mudanças bruscas costumam me deixar desconfortável.', 'S'),
    qb('q18', 'Prefiro manter uma rotina estável.', 'S'),
    qb('q19', 'Costumo evitar conflitos para preservar a paz.', 'S'),
    qb('q20', 'Sou uma pessoa paciente e constante.', 'S'),
    qb('q21', 'Gosto de ajudar os outros de forma acolhedora.', 'S'),
    qb('q22', 'Preciso de um tempo maior para me adaptar a novidades.', 'S'),
    qb('q23', 'Sou detalhista e gosto das coisas bem feitas.', 'C'),
    qb('q24', 'Costumo analisar bastante antes de tomar decisões.', 'C'),
    qb('q25', 'Fico incomodado(a) quando percebo erros, desorganização ou falta de critério.', 'C'),
    qb('q26', 'Gosto de regras claras e orientações bem definidas.', 'C'),
    qb('q27', 'Tenho tendência a cobrar muito de mim mesmo(a).', 'C'),
    qb('q28', 'Prefiro ter certeza antes de agir.', 'C'),
    qb('q29', 'Valorizo precisão, lógica e planejamento.', 'C'),
    qb('q30', 'Reviso mentalmente o que fiz para ver se poderia ter feito melhor.', 'C'),
  ],
  interpretations: [
    { id: 'i1', minScore: 30,  maxScore: 89,  resultTitle: 'Perfil Equilibrado',            description: 'Todos os traços apresentam-se em níveis baixos a moderados. Avaliar respostas por bloco para identificar nuances.', color: '#22c55e' },
    { id: 'i2', minScore: 90,  maxScore: 119, resultTitle: 'Traços Destacados',             description: 'A pontuação total indica que pelo menos um fator DISC se apresenta com intensidade moderada a alta. Veja a análise por bloco.', color: '#eab308' },
    { id: 'i3', minScore: 120, maxScore: 150, resultTitle: 'Perfil Intenso',                description: 'Alta pontuação global — um ou mais traços estão muito presentes. A análise por bloco é essencial para identificar os fatores predominantes.', color: '#ef4444' },
  ],
};

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
