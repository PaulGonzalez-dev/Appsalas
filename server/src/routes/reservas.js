import '../tz.js';
import { Router } from 'express';
import db from '../db.js';
import { authRequired, authOpcional } from '../auth.js';
import {
  malo,
  RE_FECHA,
  RE_HORA,
  aMinutos,
  aHHMM,
  fechaValida,
  diaSemana,
  esPasado,
  conImagenes,
} from '../util.js';

const r = Router();

// Todas las salas ofrecen turnos de 2, 3 y 4 horas; la grilla avanza de a 1 hora.
const DURACIONES = [120, 180, 240];
const PASO_GRILLA = 60;

// GET /api/turnos?fecha=YYYY-MM-DD&sala_id=<opcional>
// Devuelve, por sala, la grilla de turnos del día: libre / ocupado / pasado.
// Cada turno libre trae `libres`: duraciones disponibles en ese inicio (min).
r.get('/api/turnos', authOpcional, (req, res) => {
  const fecha = String(req.query.fecha || '');
  if (!fechaValida(fecha)) return malo(res, 'Fecha inválida. Usá el formato AAAA-MM-DD');

  const salaId = req.query.sala_id ? Number(req.query.sala_id) : null;
  let salas = db.prepare('SELECT * FROM salas WHERE activa = 1 ORDER BY nombre').all();
  if (salaId) salas = salas.filter((s) => s.id === salaId);
  if (salaId && salas.length === 0) return malo(res, 'Sala no encontrada', 404);

  const wd = diaSemana(fecha);
  const stmtDisp = db.prepare(
    'SELECT hora_inicio, hora_fin FROM disponibilidad WHERE sala_id = ? AND dia_semana = ?'
  );
  const stmtRes = db.prepare(
    "SELECT id, usuario_id, hora_inicio, hora_fin FROM reservas WHERE sala_id = ? AND fecha = ? AND estado = 'confirmada'"
  );

  const resultado = salas.map((sala) => {
    const disp = stmtDisp.get(sala.id, wd);
    if (!disp) return { sala: conImagenes(sala), cerrado: true, turnos: [] };

    const reservas = stmtRes.all(sala.id, fecha);
    const desde = aMinutos(disp.hora_inicio);
    const hasta = aMinutos(disp.hora_fin);
    const turnos = [];

    const solapa = (ini, fin) =>
      reservas.some((x) => aMinutos(x.hora_inicio) < fin && aMinutos(x.hora_fin) > ini);

    for (let t = desde; t + Math.min(...DURACIONES) <= hasta; t += PASO_GRILLA) {
      const hi = aHHMM(t);
      const finCelda = t + PASO_GRILLA;

      // Reserva propia que arranca exactamente acá → permite ver/cancelar
      const propia = req.user
        ? reservas.find((x) => x.usuario_id === req.user.id && aMinutos(x.hora_inicio) === t)
        : null;
      if (propia) {
        turnos.push({
          hora_inicio: hi,
          hora_fin: propia.hora_fin,
          estado: 'ocupado',
          es_mia: true,
          reserva_id: propia.id,
          libres: [],
        });
        continue;
      }

      if (solapa(t, finCelda)) {
        turnos.push({ hora_inicio: hi, hora_fin: aHHMM(finCelda), estado: 'ocupado', libres: [] });
        continue;
      }
      if (esPasado(fecha, hi)) {
        turnos.push({ hora_inicio: hi, hora_fin: aHHMM(finCelda), estado: 'pasado', libres: [] });
        continue;
      }

      const libres = DURACIONES.filter((d) => t + d <= hasta && !solapa(t, t + d));
      if (libres.length === 0) {
        // Celda libre pero no entra un turno mínimo de 2 h
        turnos.push({ hora_inicio: hi, hora_fin: aHHMM(finCelda), estado: 'ocupado', libres: [] });
        continue;
      }
      turnos.push({
        hora_inicio: hi,
        hora_fin: aHHMM(finCelda),
        estado: 'libre',
        libres,
      });
    }

    return { sala: conImagenes(sala), cerrado: false, turnos };
  });

  res.json({ fecha, dia_semana: wd, salas: resultado });
});

// POST /api/reservas  { sala_id, fecha, hora_inicio, duracion (120|180|240), nota? }
r.post('/api/reservas', authRequired, (req, res) => {
  const sala_id = Number(req.body.sala_id);
  const fecha = String(req.body.fecha || '');
  const hora_inicio = String(req.body.hora_inicio || '');
  const duracion = Number(req.body.duracion ?? 120);
  const nota = String(req.body.nota || '').slice(0, 300);

  if (!Number.isInteger(sala_id)) return malo(res, 'Sala inválida');
  if (!fechaValida(fecha)) return malo(res, 'Fecha inválida');
  if (!RE_HORA.test(hora_inicio)) return malo(res, 'Hora de inicio inválida');
  if (!DURACIONES.includes(duracion)) {
    return malo(res, 'Duración inválida: los turnos son de 2, 3 o 4 horas');
  }

  const sala = db.prepare('SELECT * FROM salas WHERE id = ? AND activa = 1').get(sala_id);
  if (!sala) return malo(res, 'Sala no encontrada', 404);

  const wd = diaSemana(fecha);
  const disp = db
    .prepare('SELECT hora_inicio, hora_fin FROM disponibilidad WHERE sala_id = ? AND dia_semana = ?')
    .get(sala_id, wd);
  if (!disp) return malo(res, 'La sala no abre ese día');

  const ini = aMinutos(hora_inicio);
  const fin = ini + duracion;
  const limIni = aMinutos(disp.hora_inicio);
  const limFin = aMinutos(disp.hora_fin);

  if (ini < limIni || fin > limFin) {
    return malo(res, 'Ese horario no está disponible en la franja de la sala');
  }
  if ((ini - limIni) % PASO_GRILLA !== 0) {
    return malo(res, 'Ese horario no está disponible');
  }
  if (esPasado(fecha, hora_inicio)) {
    return malo(res, 'Ese turno ya pasó');
  }

  const hora_fin = aHHMM(fin);
  const conflicto = db
    .prepare(
      "SELECT id FROM reservas WHERE sala_id = ? AND fecha = ? AND estado = 'confirmada' AND hora_inicio < ? AND hora_fin > ?"
    )
    .get(sala_id, fecha, hora_fin, hora_inicio);
  if (conflicto) return malo(res, 'Ese turno ya está reservado', 409);

  try {
    const info = db
      .prepare(
        "INSERT INTO reservas (sala_id, usuario_id, fecha, hora_inicio, hora_fin, nota) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(sala_id, req.user.id, fecha, hora_inicio, hora_fin, nota);

    const reserva = db
      .prepare(
        `SELECT r.*, s.nombre AS sala_nombre, s.precio_hora, s.slot_minutos, u.nombre AS usuario_nombre
         FROM reservas r
         JOIN salas s ON s.id = r.sala_id
         JOIN usuarios u ON u.id = r.usuario_id
         WHERE r.id = ?`
      )
      .get(info.lastInsertRowid);

    res.status(201).json(reserva);
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) {
      return malo(res, 'Ese turno ya está reservado', 409);
    }
    throw e;
  }
});

// GET /api/reservas?scope=mias|todas&desde=&hasta=&sala_id=&estado=
r.get('/api/reservas', authRequired, (req, res) => {
  const scope = req.query.scope || 'mias';
  if (scope !== 'mias' && scope !== 'todas') return malo(res, 'Scope inválido');
  if (scope === 'todas' && req.user.rol !== 'admin') {
    return malo(res, 'No tenés permisos para ver todas las reservas', 403);
  }

  let sql = `
    SELECT r.*, s.nombre AS sala_nombre, s.precio_hora, s.slot_minutos, u.nombre AS usuario_nombre
    FROM reservas r
    JOIN salas s ON s.id = r.sala_id
    JOIN usuarios u ON u.id = r.usuario_id
    WHERE 1 = 1`;
  const params = [];

  if (scope === 'mias') {
    sql += ' AND r.usuario_id = ?';
    params.push(req.user.id);
  }
  if (req.query.desde !== undefined) {
    if (!fechaValida(String(req.query.desde))) return malo(res, 'Fecha "desde" inválida');
    sql += ' AND r.fecha >= ?';
    params.push(req.query.desde);
  }
  if (req.query.hasta !== undefined) {
    if (!fechaValida(String(req.query.hasta))) return malo(res, 'Fecha "hasta" inválida');
    sql += ' AND r.fecha <= ?';
    params.push(req.query.hasta);
  }
  if (req.query.sala_id !== undefined) {
    sql += ' AND r.sala_id = ?';
    params.push(Number(req.query.sala_id));
  }
  if (req.query.estado !== undefined) {
    const estado = String(req.query.estado);
    if (estado !== 'confirmada' && estado !== 'cancelada') {
      return malo(res, 'Estado inválido');
    }
    sql += ' AND r.estado = ?';
    params.push(estado);
  }

  sql += ' ORDER BY r.fecha DESC, r.hora_inicio DESC LIMIT 500';
  res.json(db.prepare(sql).all(...params));
});

// DELETE /api/reservas/:id  → cancelación (dueño o admin)
r.delete('/api/reservas/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const reserva = db.prepare('SELECT * FROM reservas WHERE id = ?').get(id);
  if (!reserva) return malo(res, 'Reserva no encontrada', 404);
  if (reserva.estado === 'cancelada') return malo(res, 'La reserva ya estaba cancelada');

  const esDuenio = reserva.usuario_id === req.user.id;
  if (!esDuenio && req.user.rol !== 'admin') {
    return malo(res, 'No podés cancelar una reserva de otro usuario', 403);
  }

  db.prepare("UPDATE reservas SET estado = 'cancelada' WHERE id = ?").run(id);

  const actualizada = db
    .prepare(
      `SELECT r.*, s.nombre AS sala_nombre, s.precio_hora, s.slot_minutos, u.nombre AS usuario_nombre
       FROM reservas r
       JOIN salas s ON s.id = r.sala_id
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.id = ?`
    )
    .get(id);

  res.json({ ok: true, reserva: actualizada });
});

export default r;
