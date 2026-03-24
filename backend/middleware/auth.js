const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 * Extrai tenant_id, user_id e role do token
 */
// Paths that don't require authentication
const PUBLIC_PATHS = ['/virtual-rooms/public'];

async function authMiddleware(req, res, next) {
  // Allow public virtual-room guest routes without a token
  if (PUBLIC_PATHS.some(p => req.path.startsWith(p))) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, tenant_id, role, email, name, tokenId }

    // Session check
    if (decoded.tokenId) {
        const db = require('../db');
        const [session] = await db.query(
            'SELECT id FROM user_sessions WHERE token_id = ? AND user_id = ? AND (expires_at > NOW() OR expires_at IS NULL)',
            [decoded.tokenId, decoded.id]
        );

        if (session.length === 0) {
            return res.status(401).json({ error: 'Sessão revogada ou expirada' });
        }
        
        // Update last_active (async, don't wait)
        db.query('UPDATE user_sessions SET last_active = NOW() WHERE token_id = ?', [decoded.tokenId]).catch(console.error);
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Middleware de autorização por roles
 * Uso: authorize('admin', 'super_admin')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    next();
  };
}

/**
 * Middleware de autorização por permissão granular
 * Uso: checkPermission('view_patients')
 */
function checkPermission(permissionKey) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Bypass para super_admin ou Administrador (root / dono)
    if (req.user.role === 'super_admin' || req.user.role === 'Administrador' || req.user.role === 'admin') {
      return next();
    }

    try {
      const db = require('../db');
      const [profiles] = await db.query(
        'SELECT permissions FROM tenant_permission_profiles WHERE tenant_id = ? AND name = ? LIMIT 1',
        [req.user.tenant_id, req.user.role]
      );

      if (profiles.length === 0) {
        return res.status(403).json({ error: 'Perfil de acesso não encontrado' });
      }

      let permissions = {};
      try {
        permissions = typeof profiles[0].permissions === 'string' 
          ? JSON.parse(profiles[0].permissions) 
          : (profiles[0].permissions || {});
      } catch (e) {
        console.error('Erro ao parsear permissões:', e);
      }

      if (permissions[permissionKey] === true) {
        return next();
      }

      res.status(403).json({ error: `Sem permissão para esta ação (${permissionKey})` });
    } catch (err) {
      console.error('Erro ao verificar permissão:', err);
      res.status(500).json({ error: 'Erro interno ao validar permissão' });
    }
  };
}

module.exports = { authMiddleware, authorize, checkPermission };
