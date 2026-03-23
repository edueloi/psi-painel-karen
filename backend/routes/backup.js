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

        // 1. Limpar dados existentes (Opcional, mas recomendado para "carregar completo")
        // Aqui limpamos apenas o que o backup vai repovoar
        const tablesToClear = [
            'appointments', 'comandas', 'patients', 'services', 'packages', 
            'form_responses', 'financial_transactions'
        ];
        
        for (const table of tablesToClear) {
            await connection.query(`DELETE FROM ${table} WHERE tenant_id = ?`, [tenant_id]);
        }

        // 2. Restaurar Pacientes
        if (backup.patients && Array.isArray(backup.patients)) {
            for (const p of backup.patients) {
                const { id, created_at, ...patientData } = p;
                patientData.tenant_id = tenant_id;
                await connection.query('INSERT INTO patients SET ?', [patientData]);
            }
        }

        // 3. Restaurar Serviços
        if (backup.services && Array.isArray(backup.services)) {
            for (const s of backup.services) {
                const { id, created_at, ...serviceData } = s;
                serviceData.tenant_id = tenant_id;
                await connection.query('INSERT INTO services SET ?', [serviceData]);
            }
        }

        // 4. Restaurar Pacotes (Simplificado: assume que serviços já estão no lugar ou IDs batem)
        if (backup.packages && Array.isArray(backup.packages)) {
            for (const pkg of backup.packages) {
                const { id, created_at, ...pkgData } = pkg;
                pkgData.tenant_id = tenant_id;
                await connection.query('INSERT INTO packages SET ?', [pkgData]);
            }
        }

        // 5. Restaurar Agendamentos
        if (backup.appointments && Array.isArray(backup.appointments)) {
            for (const apt of backup.appointments) {
                const { id, created_at, ...aptData } = apt;
                aptData.tenant_id = tenant_id;
                // Converter strings de data ISO para o formato MySQL se necessário
                if (aptData.start_time) aptData.start_time = aptData.start_time.replace('T', ' ').replace('Z', '');
                if (aptData.end_time) aptData.end_time = aptData.end_time.replace('T', ' ').replace('Z', '');
                await connection.query('INSERT INTO appointments SET ?', [aptData]);
            }
        }

        // 6. Restaurar Comandas
        if (backup.comandas && Array.isArray(backup.comandas)) {
            for (const cmd of backup.comandas) {
                const { id, created_at, updated_at, ...cmdData } = cmd;
                cmdData.tenant_id = tenant_id;
                if (cmdData.items && typeof cmdData.items === 'object') {
                    cmdData.items = JSON.stringify(cmdData.items);
                }
                await connection.query('INSERT INTO comandas SET ?', [cmdData]);
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
