const db = require('./db');

async function seed() {
  console.log('🌱 Semeando modelos de documentos por área...');

  try {
    // Pegar todos os tenants para semear em todos
    const [tenants] = await db.query('SELECT id FROM tenants');
    const tenantIds = tenants.length > 0 ? tenants.map(t => t.id) : [1];

    for (const tenantId of tenantIds) {
      console.log(`   Semeando para Tenant ID: ${tenantId}...`);
      
      // 1. Categorias por Área
      const categories = [
        'Laudos (Psicologia)', 'Atestados (Psicologia)',
        'Laudos (Medicina)', 'Atestados (Medicina)',
        'Laudos (Psicopedagogia)', 'Atestados (Psicopedagogia)',
        'Laudos (Fisioterapia)', 'Atestados (Fisioterapia)',
        'Relatórios e Declarações'
      ];

      for (const catName of categories) {
        const [existing] = await db.query('SELECT id FROM doc_categories WHERE name = ? AND tenant_id = ?', [catName, tenantId]);
        if (existing.length === 0) {
          await db.query('INSERT INTO doc_categories (name, tenant_id) VALUES (?, ?)', [catName, tenantId]);
        }
      }

      const [catRows] = await db.query('SELECT * FROM doc_categories WHERE tenant_id = ?', [tenantId]);
      const catMap = {};
      catRows.forEach(c => catMap[c.name] = c.id);

      const defaultTemplates = [
        // MEDICINA
        {
          title: 'Atestado Médico (CRM)',
          category_id: catMap['Atestados (Medicina)'],
          doc_type: 'atestado',
          template_body: `ATESTADO MÉDICO
__________________________________________________________________

Atesto, para fins de {{service_name}}, que o(a) paciente {{patient_name}}, CPF {{patient_cpf}}, foi atendido(a) nesta unidade.

Necessita de afastamento por _____ dias a partir desta data.

CID: __________

{{city}}, {{date}}`
        },
        // PSICOLOGIA
        {
          title: 'Atestado Psicológico (CRP)',
          category_id: catMap['Atestados (Psicologia)'],
          doc_type: 'atestado',
          template_body: `ATESTADO PSICOLÓGICO
__________________________________________________________________

Atesto que o(a) Sr(a). {{patient_name}} encontra-se em acompanhamento psicológico nesta data.

O presente documento visa comprovar o comparecimento para fins de {{service_name}}.

{{city}}, {{date}}`
        },
        // PSICOPEDAGOGIA
        {
          title: 'Laudo de Avaliação (ABPp)',
          category_id: catMap['Laudos (Psicopedagogia)'],
          doc_type: 'laudo',
          template_body: `LAUDO DE AVALIAÇÃO PSICOPEDAGÓGICA
__________________________________________________________________

Paciente: {{patient_name}}
Idade: {{patient_age}} anos

1. SÍNTESE DO CASO:
O paciente apresenta dificuldades em...

2. INSTRUMENTOS:
Provas operatórias, EOCA...

3. CONCLUSÃO:
Hipótese diagnóstica de...

{{city}}, {{date}}`
        },
        // FISIOTERAPIA
        {
          title: 'Relatório Fisioterapêutico',
          category_id: catMap['Laudos (Fisioterapia)'],
          doc_type: 'laudo',
          template_body: `RELATÓRIO DE EVOLUÇÃO FISIOTERAPÊUTICA
__________________________________________________________________

Paciente: {{patient_name}}

O paciente realiza tratamento para {{service_name}}.
Apresenta melhora na amplitude de movimento e redução de quadro álgico.

Sessões realizadas no período: {{time_start}} às {{time_end}}.

{{city}}, {{date}}`
        },
        // RELATÓRIO GERAL
        {
          title: 'Recibo de Pagamento (Geral)',
          category_id: catMap['Relatórios e Declarações'],
          doc_type: 'outros',
          template_body: `RECIBO DE PAGAMENTO
__________________________________________________________________

Recebi de {{patient_name}} a importância de R$ {{amount}} ({{amount_text}}), referente aos serviços de {{service_name}} prestados.

{{city}}, {{date}}`
        }
      ];

      for (const tpl of defaultTemplates) {
        const [existing] = await db.query('SELECT id FROM doc_templates WHERE title = ? AND tenant_id = ?', [tpl.title, tenantId]);
        if (existing.length === 0) {
          await db.query(
            'INSERT INTO doc_templates (title, category_id, doc_type, template_body, tenant_id) VALUES (?, ?, ?, ?, ?)',
            [tpl.title, tpl.category_id, tpl.doc_type, tpl.template_body, tenantId]
          );
        }
      }
    }

    console.log('✅ Modelos por área semeados para todos os tenants!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

seed();
