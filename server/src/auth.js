import './tz.js';
import jwt from 'jsonwebtoken';
import db from './db.js';

const SECRETO = process.env.JWT_SECRET || 'playr-dev-secret-cambiar-en-produccion';

export function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id }, SECRETO, { expiresIn: '7d' });
}

function leerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function usuarioDelToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRETO);
    return (
      db.prepare('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?').get(payload.sub) || null
    );
  } catch {
    return null;
  }
}

/** Adjunta req.user si el token es válido; si no, continúa sin usuario. */
export function authOpcional(req, _res, next) {
  req.user = usuarioDelToken(leerToken(req));
  next();
}

/** Exige un token válido. */
export function authRequired(req, res, next) {
  const usuario = usuarioDelToken(leerToken(req));
  if (!usuario) {
    return res.status(401).json({ error: 'Debes iniciar sesión para continuar' });
  }
  req.user = usuario;
  next();
}

/** Solo administradores. */
export function soloAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'No tenés permisos de administrador' });
  }
  next();
}
