const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

/**
 * POST /restore
 * Restaura o sistema completo a partir de um JSON de backup
 * Somente admins podem realizar esta operação crítica
 */
router.post('/restore', authorize('admin', 'super_admin'), async (req, res) => {
    const backup = req.body;
    const tenant_id = req.user.tenant_id;

    if (!backup || !backup.meta || backup.meta.type !== 'FULL_BACKUP_SNAPSHOT') {
        return res.status(400).json({ error: 'Arquivo de backup inválido ou incompatível.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log(`🚀 Iniciando restauração para tenant_id: ${tenant_id}`);

        // Cache de colunas para evitar múltiplas consultas ao banco
        const colCache = {};
        const getCleanData = async (table, data) => {
            if (!colCache[table]) {
                const [rows] = await connection.query(`SHOW COLUMNS FROM ${table}`);
                colCache[table] = rows.map(r => r.Field);
            }
            const filtered = {};
            // IMPORTANTE: Mantermos o ID original permite restaurar as relações entre tabelas
            const keysToIgnore = ['created_at', 'updated_at'];
            Object.keys(data).forEach(k => {
                if (colCache[table].includes(k) && !keysToIgnore.includes(k)) {
                    filtered[k] = data[k];
                }
            });
            return filtered;
        };

        // 1. Limpar dados existentes do tenant (ordem inversa de dependência para evitar FK issues)
        const tablesToClear = [
            'appointments', 'comandas', 'clinical_tools', 'pei', 'pei_plans', 
            'psycho_dreams', 'psycho_free_text', 'psycho_signifiers', 
            'schema_snapshots', 'tcc_rpd', 'tcc_rpd_records', 'tcc_coping_cards',
            'patients', 'services', 'packages', 
            'forms', 'financial_transactions', 'uploads'
        ];
        
        for (const table of tablesToClear) {
            try {
                await connection.query(`DELETE FROM ${table} WHERE tenant_id = ?`, [tenant_id]);
            } catch (e) {
                console.warn(`Aviso ao limpar tabela ${table}:`, e.message);
            }
        }

        // 2. Restaurar Pacientes
        if (backup.patients && Array.isArray(backup.patients)) {
            console.log(`- Restaurando ${backup.patients.length} pacientes...`);
            for (const p of backup.patients) {
                const cleanData = await getCleanData('patients', p);
                // Garantimos que o tenant_id seja o atual por segurança (caso venha de outro)
                cleanData.tenant_id = tenant_id;
                await connection.query('INSERT INTO patients SET ?', [cleanData]);
            }
        }

        // 3. Restaurar Serviços
        if (backup.services && Array.isArray(backup.services)) {
            console.log(`- Restaurando ${backup.services.length} serviços...`);
            for (const s of backup.services) {
                const cleanData = await getCleanData('services', s);
                cleanData.tenant_id = tenant_id;
                await connection.query('INSERT INTO services SET ?', [cleanData]);
            }
        }

        // 4. Restaurar Pacotes
        if (backup.packages && Array.isArray(backup.packages)) {
            console.log(`- Restaurando ${backup.packages.length} pacotes...`);
            for (const pkg of backup.packages) {
                const cleanData = await getCleanData('packages', pkg);
                cleanData.tenant_id = tenant_id;
                await connection.query('INSERT INTO packages SET ?', [cleanData]);
            }
        }

        // 5. Restaurar Agendamentos
        if (backup.appointments && Array.isArray(backup.appointments)) {
            console.log(`- Restaurando ${backup.appointments.length} agendamentos...`);
            for (const apt of backup.appointments) {
                const cleanData = await getCleanData('appointments', apt);
                cleanData.tenant_id = tenant_id;
                
                // Formatar datas para MySQL
                if (cleanData.start_time && typeof cleanData.start_time === 'string') {
                    cleanData.start_time = cleanData.start_time.replace('T', ' ').substring(0, 19);
                }
                if (cleanData.end_time && typeof cleanData.end_time === 'string') {
                    cleanData.end_time = cleanData.end_time.replace('T', ' ').substring(0, 19);
                }
                
                await connection.query('INSERT INTO appointments SET ?', [cleanData]);
            }
        }

        // 6. Restaurar Formulários
        if (backup.forms && Array.isArray(backup.forms)) {
            console.log(`- Restaurando ${backup.forms.length} formulários...`);
            for (const f of backup.forms) {
                const cleanData = await getCleanData('forms', f);
                cleanData.tenant_id = tenant_id;
                cleanData.created_by = req.user.id; // Associado a quem está restaurando
                
                if (cleanData.fields && typeof cleanData.fields === 'object') {
                    cleanData.fields = JSON.stringify(cleanData.fields);
                }
                await connection.query('INSERT INTO forms SET ?', [cleanData]);
            }
        }

        // 7. Restaurar Comandas
        if (backup.comandas && Array.isArray(backup.comandas)) {
            console.log(`- Restaurando ${backup.comandas.length} comandas...`);
            for (const cmd of backup.comandas) {
                const cleanData = await getCleanData('comandas', cmd);
                cleanData.tenant_id = tenant_id;
                
                if (cleanData.items && typeof cleanData.items === 'object') {
                    cleanData.items = JSON.stringify(cleanData.items);
                }
                
                // Formatar datas
                if (cleanData.start_date && typeof cleanData.start_date === 'string') {
                    cleanData.start_date = cleanData.start_date.replace('T', ' ').substring(0, 19);
                }
                
                await connection.query('INSERT INTO comandas SET ?', [cleanData]);
            }
        }

        // 8. Restaurar Transações Financeiras (se houver)
        if (backup.financial_transactions && Array.isArray(backup.financial_transactions)) {
            console.log(`- Restaurando ${backup.financial_transactions.length} transações...`);
            for (const tx of backup.financial_transactions) {
                const cleanData = await getCleanData('financial_transactions', tx);
                cleanData.tenant_id = tenant_id;
                
                if (cleanData.date && typeof cleanData.date === 'string') {
                    cleanData.date = cleanData.date.split('T')[0];
                }
                
                await connection.query('INSERT INTO financial_transactions SET ?', [cleanData]);
            }
        }

        // 9. Restaurar Uploads (metadados dos arquivos)
        if (backup.uploads && Array.isArray(backup.uploads)) {
            console.log(`- Restaurando ${backup.uploads.length} metadados de uploads...`);
            for (const up of backup.uploads) {
                const cleanData = await getCleanData('uploads', up);
                cleanData.tenant_id = tenant_id;
                await connection.query('INSERT INTO uploads SET ?', [cleanData]);
            }
        }

        // 10. Restaurar Perfil e Preferências do Usuário (Opcional, mas melhora a experiência)
        if (backup.profile) {
            console.log('- Restaurando perfil e preferências do usuário...');
            const cleanProfile = await getCleanData('users', backup.profile);
            // IMPORTANTE: Nunca sobrescrever email/id/role do usuário logado durante o restore para não perder acesso
            const { email, role, id, password, ...profileToUpdate } = cleanProfile;
            
            // Tratamento de JSON
            if (profileToUpdate.schedule && typeof profileToUpdate.schedule === 'object') {
                profileToUpdate.schedule = JSON.stringify(profileToUpdate.schedule);
            }
            if (profileToUpdate.ui_preferences && typeof profileToUpdate.ui_preferences === 'object') {
                profileToUpdate.ui_preferences = JSON.stringify(profileToUpdate.ui_preferences);
            }
            if (profileToUpdate.forms_archived && typeof profileToUpdate.forms_archived === 'object') {
                profileToUpdate.forms_archived = JSON.stringify(profileToUpdate.forms_archived);
            }
            if (profileToUpdate.forms_favorites && typeof profileToUpdate.forms_favorites === 'object') {
                profileToUpdate.forms_favorites = JSON.stringify(profileToUpdate.forms_favorites);
            }

            if (Object.keys(profileToUpdate).length > 0) {
                await connection.query('UPDATE users SET ? WHERE id = ?', [profileToUpdate, req.user.id]);
            }
        }

        await connection.commit();
        console.log(`✅ Restauração concluída para tenant_id: ${tenant_id}`);
        res.json({ success: true, message: 'Sistema restaurado com sucesso!' });

    } catch (err) {
        await connection.rollback();
        console.error('❌ Erro na restauração:', err);
        res.status(500).json({ error: 'Falha crítica na restauração dos dados.', details: err.message });
    } finally {
        connection.release();
    }
});

/**
 * GET /export
 * Gera o backup completo em uma única chamada (Opcional, já temos no front, mas é melhor aqui)
 */
router.get('/export', authorize('admin', 'super_admin'), async (req, res) => {
    const tenant_id = req.user.tenant_id;
    try {
        const [patients] = await db.query('SELECT * FROM patients WHERE tenant_id = ?', [tenant_id]);
        const [services] = await db.query('SELECT * FROM services WHERE tenant_id = ?', [tenant_id]);
        const [appointments] = await db.query('SELECT * FROM appointments WHERE tenant_id = ?', [tenant_id]);
        const [comandas] = await db.query('SELECT * FROM comandas WHERE tenant_id = ?', [tenant_id]);
        const [packages] = await db.query('SELECT * FROM packages WHERE tenant_id = ?', [tenant_id]);

        const backup = {
            meta: {
                version: 'Gold v3.4',
                type: 'FULL_BACKUP_SNAPSHOT',
                exportedAt: new Date().toISOString(),
                tenant_id
            },
            patients,
            services,
            appointments,
            comandas,
            packages
        };

        res.json(backup);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao gerar exportação.' });
    }
});

module.exports = router;
