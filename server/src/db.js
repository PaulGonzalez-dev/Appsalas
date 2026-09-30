import './tz.js';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.PLAYR_DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'playr.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'musico' CHECK (rol IN ('admin', 'musico')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS salas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  barrio TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  imagenes TEXT NOT NULL DEFAULT '[]',
  descripcion TEXT NOT NULL DEFAULT '',
  equipamiento TEXT NOT NULL DEFAULT '',
  precio_hora REAL NOT NULL DEFAULT 0,
  capacidad INTEGER NOT NULL DEFAULT 10,
  slot_minutos INTEGER NOT NULL DEFAULT 60,
  activa INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disponibilidad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sala_id INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  UNIQUE (sala_id, dia_semana)
);

CREATE TABLE IF NOT EXISTS reservas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sala_id INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'cancelada')),
  nota TEXT NOT NULL DEFAULT '',
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reserva_slot
  ON reservas(sala_id, fecha, hora_inicio)
  WHERE estado = 'confirmada';

CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);
`);

// Migración para bases creadas antes de la versión de "salas cercanas".
function columna(tabla, nombre) {
  return db.prepare(`PRAGMA table_info(${tabla})`).all().some((c) => c.name === nombre);
}
if (!columna('salas', 'barrio')) db.exec("ALTER TABLE salas ADD COLUMN barrio TEXT NOT NULL DEFAULT ''");
if (!columna('salas', 'lat')) db.exec('ALTER TABLE salas ADD COLUMN lat REAL');
if (!columna('salas', 'lng')) db.exec('ALTER TABLE salas ADD COLUMN lng REAL');
if (!columna('salas', 'imagenes')) db.exec("ALTER TABLE salas ADD COLUMN imagenes TEXT NOT NULL DEFAULT '[]'");

export default db;
