import '../tz.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { firmarToken, authRequired } from '../auth.js';
import { malo, RE_FECHA, RE_HORA } from '../util.js';

const r = Router();

function datosPublicos(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
}

r.post('/registro', (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!nombre) return malo(res, 'Ingresá tu nombre');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return malo(res, 'Ingresá un email válido');
  if (password.length < 6) return malo(res, 'La contraseña debe tener al menos 6 caracteres');

  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) return malo(res, 'Ya existe una cuenta con ese email', 409);

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, 'musico')")
    .run(nombre, email, hash);

  const usuario = db
    .prepare('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json({ token: firmarToken(usuario), user: datosPublicos(usuario) });
});

r.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
    return malo(res, 'Email o contraseña incorrectos', 401);
  }

  res.json({ token: firmarToken(usuario), user: datosPublicos(usuario) });
});

r.get('/me', authRequired, (req, res) => {
  res.json(datosPublicos(req.user));
});

export default r;
