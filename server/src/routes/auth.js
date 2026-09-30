import '../tz.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { firmarToken, authRequired } from '../auth.js';
import { malo, RE_FECHA, RE_HORA } from '../util.js';

const r = Router();

export function datosPublicos(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    foto: u.foto || '',
  };
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
    .prepare('SELECT id, nombre, email, rol, foto FROM usuarios WHERE id = ?')
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

// ---------- MI PERFIL ----------

const RE_FOTO = /^data:image\/(jpeg|png|webp);base64,/;

function perfilCompleto(usuarioId) {
  const u = db
    .prepare('SELECT id, nombre, email, rol, foto, telefono, bio FROM usuarios WHERE id = ?')
    .get(usuarioId);
  const bandas = db
    .prepare('SELECT id, nombre, instrumento FROM bandas WHERE usuario_id = ? ORDER BY nombre')
    .all(usuarioId);
  return { ...datosPublicos(u), telefono: u.telefono || '', bio: u.bio || '', bandas };
}

r.get('/perfil', authRequired, (req, res) => {
  res.json(perfilCompleto(req.user.id));
});

r.put('/perfil', authRequired, (req, res) => {
  const campos = [];
  const valores = [];

  if (req.body.nombre !== undefined) {
    const nombre = String(req.body.nombre).trim();
    if (!nombre) return malo(res, 'El nombre no puede quedar vacío');
    campos.push('nombre = ?');
    valores.push(nombre);
  }
  if (req.body.telefono !== undefined) {
    campos.push('telefono = ?');
    valores.push(String(req.body.telefono).trim().slice(0, 40));
  }
  if (req.body.bio !== undefined) {
    campos.push('bio = ?');
    valores.push(String(req.body.bio).trim().slice(0, 500));
  }
  if (req.body.foto !== undefined) {
    const foto = String(req.body.foto);
    if (foto !== '') {
      if (!RE_FOTO.test(foto)) return malo(res, 'La imagen debe ser JPEG, PNG o WebP');
      if (foto.length > 400_000) return malo(res, 'La imagen es muy pesada (máx. ~300 KB)');
    }
    campos.push('foto = ?');
    valores.push(foto);
  }

  if (campos.length === 0) return malo(res, 'No hay datos para actualizar');

  db.prepare(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`).run(
    ...valores,
    req.user.id
  );

  res.json(perfilCompleto(req.user.id));
});

r.put('/bandas', authRequired, (req, res) => {
  const lista = Array.isArray(req.body.bandas) ? req.body.bandas : null;
  if (!lista) return malo(res, 'Falta la lista de bandas');
  if (lista.length > 20) return malo(res, 'Máximo 20 bandas');

  const limpias = lista
    .map((b) => ({
      nombre: String(b?.nombre || '').trim().slice(0, 60),
      instrumento: String(b?.instrumento || '').trim().slice(0, 60),
    }))
    .filter((b) => b.nombre);

  if (lista.length > 0 && limpias.length === 0) {
    return malo(res, 'Cada banda necesita un nombre');
  }

  const borrar = db.prepare('DELETE FROM bandas WHERE usuario_id = ?');
  const insertar = db.prepare(
    'INSERT INTO bandas (usuario_id, nombre, instrumento) VALUES (?, ?, ?)'
  );
  db.transaction(() => {
    borrar.run(req.user.id);
    for (const b of limpias) insertar.run(req.user.id, b.nombre, b.instrumento);
  })();

  res.json(
    db
      .prepare('SELECT id, nombre, instrumento FROM bandas WHERE usuario_id = ? ORDER BY nombre')
      .all(req.user.id)
  );
});

export default r;
