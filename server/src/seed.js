import './tz.js';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { hoyStr, sumarDias } from './util.js';

/** Seed idempotente: solo carga datos si no existen. */
function seedUsuarios() {
  const total = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
  if (total > 0) return;

  const hash = (p) => bcrypt.hashSync(p, 10);
  const insert = db.prepare(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)'
  );
  insert.run('Administrador', 'admin@salas.com', hash('admin123'), 'admin');
  insert.run('Músico Demo', 'musico@demo.com', hash('demo123'), 'musico');
  console.log('→ Usuarios de prueba creados');
}

function seedSalas() {
  const total = db.prepare('SELECT COUNT(*) AS n FROM salas').get().n;
  if (total > 0) return;

  const insertSala = db.prepare(
    'INSERT INTO salas (nombre, descripcion, equipamiento, precio_hora, capacidad, slot_minutos) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertDispo = db.prepare(
    'INSERT INTO disponibilidad (sala_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)'
  );

  const salas = [
    {
      nombre: 'Sala Metrónomo',
      descripcion:
        'Sala principal con excelente aislamiento acústico. Ideal para ensayos de bandas y grabaciones de demos.',
      equipamiento: 'Batería Pearl, 2 amplificadores Marshall, mesa Behringer, parlantes PA, micrófonos',
      precio_hora: 4500,
      capacidad: 6,
      slot: 60,
      // lun(1) a dom(0): 10:00 - 23:00
      dispo: [
        [1, '10:00', '23:00'],
        [2, '10:00', '23:00'],
        [3, '10:00', '23:00'],
        [4, '10:00', '23:00'],
        [5, '10:00', '23:00'],
        [6, '10:00', '23:00'],
        [0, '10:00', '23:00'],
      ],
    },
    {
      nombre: 'Sala Acorde',
      descripcion:
        'Espacio tranquilo pensado para solistas y dúos. Excelente para trabajar teoría, composición y voz.',
      equipamiento: 'Piano Yamaha de cola, órgano, teclado MIDI, afinador, atril con luz',
      precio_hora: 3800,
      capacidad: 3,
      slot: 60,
      // lun a sáb: 09:00 - 22:00 (domingo cerrado)
      dispo: [
        [1, '09:00', '22:00'],
        [2, '09:00', '22:00'],
        [3, '09:00', '22:00'],
        [4, '09:00', '22:00'],
        [5, '09:00', '22:00'],
        [6, '09:00', '22:00'],
      ],
    },
    {
      nombre: 'Sala Distorsión',
      descripcion:
        'Sala insonorizada para tocar fuerte sin molestar. Backline completo listo para enchufar.',
      equipamiento: 'Backline rock, 3 pedales, amplificador Fender, bajería, güiro, hi-hat extra',
      precio_hora: 4200,
      capacidad: 5,
      slot: 90,
      // mar(2) a dom(0): 12:00 - 22:00 (lunes cerrado)
      dispo: [
        [2, '12:00', '22:00'],
        [3, '12:00', '22:00'],
        [4, '12:00', '22:00'],
        [5, '12:00', '22:00'],
        [6, '12:00', '22:00'],
        [0, '12:00', '22:00'],
      ],
    },
    {
      nombre: 'Sala Eco Grande',
      descripcion:
        'La más amplia de la casa: ensayos de bandas completas, clínicas y grabaciones en vivo.',
      equipamiento: 'PA de 8 canales, monitores en escenario, backline doble, atriles, percheros',
      precio_hora: 7500,
      capacidad: 12,
      slot: 120,
      // lun a sáb: 10:00 - 20:00
      dispo: [
        [1, '10:00', '20:00'],
        [2, '10:00', '20:00'],
        [3, '10:00', '20:00'],
        [4, '10:00', '20:00'],
        [5, '10:00', '20:00'],
        [6, '10:00', '20:00'],
      ],
    },
  ];

  for (const s of salas) {
    const info = insertSala.run(s.nombre, s.descripcion, s.equipamiento, s.precio_hora, s.capacidad, s.slot);
    for (const [dia, ini, fin] of s.dispo) insertDispo.run(info.lastInsertRowid, dia, ini, fin);
  }
  console.log('→ Salas de prueba creadas');
}

function seedReservas() {
  const total = db.prepare('SELECT COUNT(*) AS n FROM reservas').get().n;
  if (total > 0) return;

  const admin = db.prepare("SELECT id FROM usuarios WHERE rol = 'admin'").get();
  const musico = db.prepare("SELECT id FROM usuarios WHERE rol = 'musico'").get();
  const sala1 = db.prepare('SELECT id, slot_minutos FROM salas ORDER BY id LIMIT 1').get();
  if (!admin || !musico || !sala1) return;

  const insert = db.prepare(
    "INSERT INTO reservas (sala_id, usuario_id, fecha, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)"
  );
  const finDe = (hora, slot) => {
    const [h, m] = hora.split(':').map(Number);
    const t = h * 60 + m + slot;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };

  const hoy = hoyStr();
  const crear = (usuario, fecha, hora) =>
    insert.run(sala1.id, usuario, fecha, hora, finDe(hora, sala1.slot_minutos));

  crear(musico.id, sumarDias(hoy, 1), '19:00'); // mañana
  crear(admin.id, sumarDias(hoy, 2), '18:00');
  crear(musico.id, sumarDias(hoy, 3), '21:00');
  crear(musico.id, sumarDias(hoy, -5), '20:00'); // histórico pasado
  console.log('→ Reservas de prueba creadas');
}

seedUsuarios();
seedSalas();
seedReservas();
console.log('✅ Base de datos lista (server/data/playr.db)');
