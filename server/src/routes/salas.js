import '../tz.js';
import { Router } from 'express';
import db from '../db.js';
import { authRequired, soloAdmin } from '../auth.js';
import { malo, RE_HORA, aMinutos, distanciaKm, conImagenes } from '../util.js';

const r = Router();

function traerDisponibilidad(salaId) {
  return db
    .prepare('SELECT dia_semana, hora_inicio, hora_fin FROM disponibilidad WHERE sala_id = ? ORDER BY dia_semana')
    .all(salaId);
}

function conDisponibilidad(sala) {
  return { ...conImagenes(sala), disponibilidad: traerDisponibilidad(sala.id) };
}

/** Normaliza lat/lng opcionales del body. Devuelve string de error o valor. */
function normalizarCoord(v) {
  if (v === undefined) return { omitido: true };
  if (v === null || v === '') return { valor: null };
  const n = Number(v);
  if (!Number.isFinite(n)) return { error: 'Coordenada inválida' };
  return { valor: n };
}

function validarCoords(lat, lng) {
  if (lat !== null && lat !== undefined && (lat < -90 || lat > 90)) return 'Latitud inválida';
  if (lng !== null && lng !== undefined && (lng < -180 || lng > 180)) return 'Longitud inválida';
  return null;
}

function normalizarImagenes(v) {
  if (v === undefined) return { omitido: true };
  if (!Array.isArray(v)) return { error: 'Imágenes inválidas' };
  const limpias = v.filter((x) => typeof x === 'string' && x.length <= 400).slice(0, 8);
  return { valor: JSON.stringify(limpias) };
}

const DISPO_DEFECTO = [
  // lun(1) a sáb(6): 10:00 - 23:00
  [1, '10:00', '23:00'],
  [2, '10:00', '23:00'],
  [3, '10:00', '23:00'],
  [4, '10:00', '23:00'],
  [5, '10:00', '23:00'],
  [6, '10:00', '23:00'],
];

function validarDisponibilidad(lista) {
  if (!Array.isArray(lista)) return 'Disponibilidad inválida';
  const dias = new Set();
  for (const d of lista) {
    if (!Number.isInteger(d.dia_semana) || d.dia_semana < 0 || d.dia_semana > 6) {
      return 'Día de la semana inválido';
    }
    if (dias.has(d.dia_semana)) return 'Día de la semana repetido';
    dias.add(d.dia_semana);
    if (!RE_HORA.test(d.hora_inicio) || !RE_HORA.test(d.hora_fin)) return 'Horarios inválidos';
    if (aMinutos(d.hora_inicio) >= aMinutos(d.hora_fin)) {
      return 'La hora de fin debe ser posterior a la de inicio';
    }
  }
  return null;
}

function guardarDisponibilidad(salaId, lista) {
  const borrar = db.prepare('DELETE FROM disponibilidad WHERE sala_id = ?');
  const insertar = db.prepare(
    'INSERT INTO disponibilidad (sala_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)'
  );
  db.transaction(() => {
    borrar.run(salaId);
    for (const d of lista) {
      insertar.run(salaId, d.dia_semana, d.hora_inicio, d.hora_fin);
    }
  })();
}

// ---------- PÚBLICO ----------

// GET /api/salas?lat=&lng= → opcionalmente ordena por distancia al usuario.
r.get('/', (req, res) => {
  let salas = db
    .prepare('SELECT * FROM salas WHERE activa = 1 ORDER BY nombre')
    .all()
    .map(conDisponibilidad);

  const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;

  if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
    salas = salas
      .map((s) => ({
        ...s,
        distancia_km:
          Number.isFinite(s.lat) && Number.isFinite(s.lng)
            ? Math.round(distanciaKm(lat, lng, s.lat, s.lng) * 10) / 10
            : null,
      }))
      .sort((a, b) => (a.distancia_km ?? 1e9) - (b.distancia_km ?? 1e9));
  }

  res.json(salas);
});

r.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const sala = db.prepare('SELECT * FROM salas WHERE id = ? AND activa = 1').get(id);
  if (!sala) return malo(res, 'Sala no encontrada', 404);
  res.json(conDisponibilidad(sala));
});

r.get('/:id/disponibilidad', (req, res) => {
  const id = Number(req.params.id);
  const sala = db.prepare('SELECT id FROM salas WHERE id = ?').get(id);
  if (!sala) return malo(res, 'Sala no encontrada', 404);
  res.json(traerDisponibilidad(id));
});

// ---------- ADMIN ----------

r.post('/', authRequired, soloAdmin, (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const barrio = String(req.body.barrio || '').trim();
  const descripcion = String(req.body.descripcion || '').trim();
  const equipamiento = String(req.body.equipamiento || '').trim();
  const precio_hora = Number(req.body.precio_hora ?? 0);
  const capacidad = Number(req.body.capacidad ?? 10);
  const slot_minutos = Number(req.body.slot_minutos ?? 60);

  const coordLat = normalizarCoord(req.body.lat);
  const coordLng = normalizarCoord(req.body.lng);
  const imgs = normalizarImagenes(req.body.imagenes);
  if (coordLat.error || coordLng.error || imgs.error) {
    return malo(res, coordLat.error || coordLng.error || imgs.error);
  }
  const lat = coordLat.omitido ? null : coordLat.valor;
  const lng = coordLng.omitido ? null : coordLng.valor;
  const errorCoord = validarCoords(lat, lng);
  if (errorCoord) return malo(res, errorCoord);
  const imagenes = imgs.omitido ? '[]' : imgs.valor;

  if (!nombre) return malo(res, 'El nombre de la sala es obligatorio');
  if (!Number.isFinite(precio_hora) || precio_hora < 0) return malo(res, 'Precio inválido');
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 500) {
    return malo(res, 'Capacidad inválida');
  }
  if (![15, 30, 45, 60, 90, 120, 180, 240].includes(slot_minutos)) {
    return malo(res, 'Duración de turno inválida');
  }

  const info = db
    .prepare(
      'INSERT INTO salas (nombre, barrio, lat, lng, imagenes, descripcion, equipamiento, precio_hora, capacidad, slot_minutos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(nombre, barrio, lat, lng, imagenes, descripcion, equipamiento, precio_hora, capacidad, slot_minutos);
  const id = info.lastInsertRowid;

  // Si no viene disponibilidad (o viene vacía), usamos el horario por defecto lun–sáb 10–23.
  const lista =
    Array.isArray(req.body.disponibilidad) && req.body.disponibilidad.length > 0
      ? req.body.disponibilidad
      : DISPO_DEFECTO;
  const error = validarDisponibilidad(lista);
  if (error) return malo(res, error);
  guardarDisponibilidad(id, lista);

  res.status(201).json(conDisponibilidad(db.prepare('SELECT * FROM salas WHERE id = ?').get(id)));
});

r.put('/:id', authRequired, soloAdmin, (req, res) => {
  const id = Number(req.params.id);
  const sala = db.prepare('SELECT * FROM salas WHERE id = ?').get(id);
  if (!sala) return malo(res, 'Sala no encontrada', 404);

  const actual = {
    nombre: req.body.nombre !== undefined ? String(req.body.nombre).trim() : sala.nombre,
    barrio: req.body.barrio !== undefined ? String(req.body.barrio || '').trim() : sala.barrio,
    descripcion:
      req.body.descripcion !== undefined ? String(req.body.descripcion).trim() : sala.descripcion,
    equipamiento:
      req.body.equipamiento !== undefined ? String(req.body.equipamiento).trim() : sala.equipamiento,
    precio_hora: req.body.precio_hora !== undefined ? Number(req.body.precio_hora) : sala.precio_hora,
    capacidad: req.body.capacidad !== undefined ? Number(req.body.capacidad) : sala.capacidad,
    slot_minutos:
      req.body.slot_minutos !== undefined ? Number(req.body.slot_minutos) : sala.slot_minutos,
    activa: req.body.activa !== undefined ? (req.body.activa ? 1 : 0) : sala.activa,
  };

  const coordLat = normalizarCoord(req.body.lat);
  const coordLng = normalizarCoord(req.body.lng);
  const imgs = normalizarImagenes(req.body.imagenes);
  if (coordLat.error || coordLng.error || imgs.error) {
    return malo(res, coordLat.error || coordLng.error || imgs.error);
  }
  const lat = coordLat.omitido ? sala.lat : coordLat.valor;
  const lng = coordLng.omitido ? sala.lng : coordLng.valor;
  const errorCoord = validarCoords(lat, lng);
  if (errorCoord) return malo(res, errorCoord);
  const imagenes = imgs.omitido ? sala.imagenes : imgs.valor;

  if (!actual.nombre) return malo(res, 'El nombre de la sala es obligatorio');
  if (!Number.isFinite(actual.precio_hora) || actual.precio_hora < 0) {
    return malo(res, 'Precio inválido');
  }
  if (!Number.isInteger(actual.capacidad) || actual.capacidad < 1 || actual.capacidad > 500) {
    return malo(res, 'Capacidad inválida');
  }
  if (![15, 30, 45, 60, 90, 120, 180, 240].includes(actual.slot_minutos)) {
    return malo(res, 'Duración de turno inválida');
  }

  db.prepare(
    'UPDATE salas SET nombre = ?, barrio = ?, lat = ?, lng = ?, imagenes = ?, descripcion = ?, equipamiento = ?, precio_hora = ?, capacidad = ?, slot_minutos = ?, activa = ? WHERE id = ?'
  ).run(
    actual.nombre,
    actual.barrio,
    lat,
    lng,
    imagenes,
    actual.descripcion,
    actual.equipamiento,
    actual.precio_hora,
    actual.capacidad,
    actual.slot_minutos,
    actual.activa,
    id
  );

  res.json(conDisponibilidad(db.prepare('SELECT * FROM salas WHERE id = ?').get(id)));
});

// Baja lógica: mantiene el histórico de reservas.
r.delete('/:id', authRequired, soloAdmin, (req, res) => {
  const id = Number(req.params.id);
  const sala = db.prepare('SELECT * FROM salas WHERE id = ?').get(id);
  if (!sala) return malo(res, 'Sala no encontrada', 404);
  db.prepare('UPDATE salas SET activa = 0 WHERE id = ?').run(id);
  res.json({ ok: true, mensaje: 'Sala dada de baja' });
});

r.put('/:id/disponibilidad', authRequired, soloAdmin, (req, res) => {
  const id = Number(req.params.id);
  const sala = db.prepare('SELECT id FROM salas WHERE id = ?').get(id);
  if (!sala) return malo(res, 'Sala no encontrada', 404);

  const lista = Array.isArray(req.body.disponibilidad) ? req.body.disponibilidad : null;
  if (!lista) return malo(res, 'Falta la lista de disponibilidad');
  const error = validarDisponibilidad(lista);
  if (error) return malo(res, error);

  guardarDisponibilidad(id, lista);
  res.json(traerDisponibilidad(id));
});

export default r;
