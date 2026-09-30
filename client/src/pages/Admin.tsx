import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { useToast } from '../toast';
import type { Reserva, Sala } from '../types';
import { Badge, Modal, Spinner, Vacio } from '../components/UI';
import {
  DIAS_LARGOS,
  fechaCorta,
  fmtHora,
  fmtPrecio,
  hoyStr,
} from '../utils';

type Pestana = 'salas' | 'disponibilidad' | 'reservas';

const SLOTS_DURACION = [15, 30, 45, 60, 90, 120, 180, 240];
const HORAS_VALIDAS: string[] = [];
for (let h = 6; h <= 23; h++) {
  HORAS_VALIDAS.push(`${String(h).padStart(2, '0')}:00`);
  HORAS_VALIDAS.push(`${String(h).padStart(2, '0')}:30`);
}

interface FormSala {
  id?: number;
  nombre: string;
  barrio: string;
  descripcion: string;
  equipamiento: string;
  precio_hora: number;
  capacidad: number;
  slot_minutos: number;
  lat: string;
  lng: string;
  imagenes: string;
  activa: number;
}

const vacia = (): FormSala => ({
  nombre: '',
  barrio: '',
  descripcion: '',
  equipamiento: '',
  precio_hora: 4000,
  capacidad: 6,
  slot_minutos: 60,
  lat: '',
  lng: '',
  imagenes: '',
  activa: 1,
});

export default function Admin() {
  const [pestana, setPestana] = useState<Pestana>('salas');

  return (
    <div className="contenedor pagina">
      <div className="reservar-cab">
        <div>
          <h1>Administración</h1>
          <p className="muted">Gestioná salas, disponibilidad y reservas.</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {(
          [
            ['salas', 'Salas'],
            ['disponibilidad', 'Disponibilidad'],
            ['reservas', 'Reservas'],
          ] as [Pestana, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={pestana === id}
            className={`tab${pestana === id ? ' activa' : ''}`}
            onClick={() => setPestana(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {pestana === 'salas' && <TabSalas />}
      {pestana === 'disponibilidad' && <TabDisponibilidad />}
      {pestana === 'reservas' && <TabReservas />}
    </div>
  );
}

/* ------------------------------- SALAS ------------------------------- */

function TabSalas() {
  const { avisar } = useToast();
  const [salas, setSalas] = useState<Sala[] | null>(null);
  const [editando, setEditando] = useState<null | 'nuevo' | 'editar'>(null);
  const [form, setForm] = useState<ReturnType<typeof vacia>>(vacia());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Incluye inactivas para poder reactivar
  const cargar = useCallback(() => {
    api<Sala[]>('/api/salas')
      .then(setSalas)
      .catch((e: ApiError) => avisar(e.message, 'err'));
  }, [avisar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirNuevo() {
    setForm(vacia());
    setError(null);
    setEditando('nuevo');
  }

  function abrirEdicion(s: Sala) {
    setForm({
      id: s.id,
      nombre: s.nombre,
      barrio: s.barrio || '',
      descripcion: s.descripcion,
      equipamiento: s.equipamiento,
      precio_hora: s.precio_hora,
      capacidad: s.capacidad,
      slot_minutos: s.slot_minutos,
      lat: s.lat != null ? String(s.lat) : '',
      lng: s.lng != null ? String(s.lng) : '',
      imagenes: (s.imagenes || []).join('\n'),
      activa: s.activa,
    });
    setError(null);
    setEditando('editar');
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setEnviando(true);
    setError(null);
    try {
      const cuerpo = {
        ...form,
        lat: form.lat === '' ? null : Number(form.lat),
        lng: form.lng === '' ? null : Number(form.lng),
        imagenes: form.imagenes
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
      };
      if (form.id) {
        await api(`/api/salas/${form.id}`, { method: 'PUT', body: cuerpo });
        avisar('Sala actualizada');
      } else {
        await api('/api/salas', { method: 'POST', body: cuerpo });
        avisar('Sala creada');
      }
      setEditando(null);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setEnviando(false);
    }
  }

  async function baja(s: Sala) {
    try {
      await api(`/api/salas/${s.id}`, { method: 'DELETE' });
      avisar(`"${s.nombre}" dada de baja`);
      cargar();
    } catch (err) {
      avisar(err instanceof ApiError ? err.message : 'No se pudo dar de baja', 'err');
    }
  }

  if (salas === null) return <Spinner texto="Cargando salas…" />;

  return (
    <div>
      <div className="barra-acciones">
        <span className="muted">{salas.length} sala(s) cargadas</span>
        <button className="btn btn-primario" onClick={abrirNuevo}>
          + Nueva sala
        </button>
      </div>

      {salas.length === 0 ? (
        <Vacio titulo="Todavía no hay salas">
          <p>Creá la primera para empezar a recibir reservas.</p>
        </Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Sala</th>
                <th>Precio/hora</th>
                <th>Capacidad</th>
                <th>Turno</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {salas.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.nombre}</strong>
                    <div className="muted t-dato">{s.descripcion.slice(0, 60)}</div>
                  </td>
                  <td>{fmtPrecio(s.precio_hora)}</td>
                  <td>{s.capacidad} pers.</td>
                  <td>{s.slot_minutos}′</td>
                  <td>
                    <Badge tono={s.activa ? 'ok' : 'nulo'}>
                      {s.activa ? 'activa' : 'baja'}
                    </Badge>
                  </td>
                  <td className="t-acciones">
                    <button className="btn btn-ghost btn-sm" onClick={() => abrirEdicion(s)}>
                      Editar
                    </button>
                    {s.activa === 1 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => baja(s)}>
                        Dar de baja
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <Modal
          titulo={form.id ? 'Editar sala' : 'Nueva sala'}
          onClose={() => setEditando(null)}
          ancho={520}
          pie={
            <>
              <button className="btn btn-ghost" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primario"
                type="submit"
                form="form-sala"
                disabled={enviando}
              >
                {enviando ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          }
        >
          <form onSubmit={guardar} id="form-sala">
            {error && <div className="alerta alerta-err">{error}</div>}
            <label className="field">
              <span>Nombre *</span>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Barrio</span>
              <input
                value={form.barrio}
                onChange={(e) => setForm({ ...form, barrio: e.target.value })}
                placeholder="Ej: Güemes"
              />
            </label>
            <label className="field">
              <span>Descripción</span>
              <textarea
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Equipamiento (separado por comas)</span>
              <textarea
                rows={2}
                value={form.equipamiento}
                onChange={(e) => setForm({ ...form, equipamiento: e.target.value })}
              />
            </label>
            <div className="campo-fila">
              <label className="field">
                <span>Precio por hora</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={form.precio_hora}
                  onChange={(e) => setForm({ ...form, precio_hora: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Capacidad</span>
                <input
                  type="number"
                  min={1}
                  value={form.capacidad}
                  onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Duración (min)</span>
                <select
                  value={form.slot_minutos}
                  onChange={(e) => setForm({ ...form, slot_minutos: Number(e.target.value) })}
                >
                  {SLOTS_DURACION.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="campo-fila">
              <label className="field">
                <span>Latitud</span>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  placeholder="-31.42"
                />
              </label>
              <label className="field">
                <span>Longitud</span>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  placeholder="-64.18"
                />
              </label>
            </div>
            <label className="field">
              <span>Imágenes (URLs, una por línea)</span>
              <textarea
                rows={2}
                value={form.imagenes}
                onChange={(e) => setForm({ ...form, imagenes: e.target.value })}
                placeholder={"/img/metronomo-1.jpg\n/img/metronomo-2.jpg"}
              />
            </label>
            {!form.id && (
              <p className="muted chico">
                Se creará con horarios lun a sáb de 10:00 a 23:00; después podés ajustarlos en la
                pestaña «Disponibilidad».
              </p>
            )}
            <button type="submit" className="oculto" />
          </form>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------- DISPONIBILIDAD -------------------------- */

interface FilaDispo {
  activo: boolean;
  hora_inicio: string;
  hora_fin: string;
}

function TabDisponibilidad() {
  const { avisar } = useToast();
  const [salas, setSalas] = useState<Sala[] | null>(null);
  const [salaId, setSalaId] = useState<number | null>(null);
  const [filas, setFilas] = useState<FilaDispo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api<Sala[]>('/api/salas')
      .then((lista) => {
        setSalas(lista);
        setSalaId(lista[0]?.id ?? null);
      })
      .catch((e: ApiError) => {
        avisar(e.message, 'err');
        setSalas([]);
      });
  }, [avisar]);

  const cargar = useCallback(() => {
    if (!salaId) return;
    setCargando(true);
    api<{ dia_semana: number; hora_inicio: string; hora_fin: string }[]>(
      `/api/salas/${salaId}/disponibilidad`
    )
      .then((disp) => {
        const nuevas: FilaDispo[] = [];
        for (let d = 0; d < 7; d++) {
          const fila = disp.find((x) => x.dia_semana === d);
          nuevas.push(
            fila
              ? { activo: true, hora_inicio: fila.hora_inicio, hora_fin: fila.hora_fin }
              : { activo: false, hora_inicio: '10:00', hora_fin: '22:00' }
          );
        }
        setFilas(nuevas);
      })
      .catch((e: ApiError) => avisar(e.message, 'err'))
      .finally(() => setCargando(false));
  }, [salaId, avisar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cambiar(d: number, cambio: Partial<FilaDispo>) {
    setFilas((f) => f.map((x, i) => (i === d ? { ...x, ...cambio } : x)));
  }

  async function guardar() {
    if (!salaId) return;
    const disponibilidad = filas
      .map((f, d) => ({ dia_semana: d, hora_inicio: f.hora_inicio, hora_fin: f.hora_fin }))
      .filter((_, i) => filas[i].activo);
    setEnviando(true);
    try {
      await api(`/api/salas/${salaId}/disponibilidad`, {
        method: 'PUT',
        body: { disponibilidad },
      });
      avisar('Disponibilidad guardada');
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo guardar', 'err');
    } finally {
      setEnviando(false);
    }
  }

  if (salas === null) return <Spinner texto="Cargando salas…" />;
  if (salas.length === 0)
    return (
      <Vacio titulo="Creá una sala primero">
        <p>Necesitás al menos una sala para configurar su disponibilidad.</p>
      </Vacio>
    );

  return (
    <div className="card">
      <div className="barra-acciones">
        <label className="field">
          <span>Sala</span>
          <select value={salaId ?? ''} onChange={(e) => setSalaId(Number(e.target.value))}>
            {salas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primario" onClick={guardar} disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar disponibilidad'}
        </button>
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Día</th>
                <th>Abierto</th>
                <th>Desde</th>
                <th>Hasta</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, d) => (
                <tr key={d} className={!f.activo ? 'apagada' : ''}>
                  <td>{DIAS_LARGOS[d]}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={f.activo}
                      onChange={(e) => cambiar(d, { activo: e.target.checked })}
                      aria-label={`Abrir ${DIAS_LARGOS[d]}`}
                    />
                  </td>
                  <td>
                    <select
                      value={f.hora_inicio}
                      disabled={!f.activo}
                      onChange={(e) => cambiar(d, { hora_inicio: e.target.value })}
                    >
                      {HORAS_VALIDAS.slice(0, -1).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={f.hora_fin}
                      disabled={!f.activo}
                      onChange={(e) => cambiar(d, { hora_fin: e.target.value })}
                    >
                      {HORAS_VALIDAS.slice(1).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted chico">
        Los turnos se generan automáticamente dentro de este rango, de acuerdo a la duración de cada
        sala.
      </p>
    </div>
  );
}

/* ----------------------------- RESERVAS ----------------------------- */

function TabReservas() {
  const { avisar } = useToast();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [desde, setDesde] = useState(() => hoyStr());
  const [hasta, setHasta] = useState('');
  const [salaId, setSalaId] = useState('');
  const [estado, setEstado] = useState('');
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [aCancelar, setACancelar] = useState<Reserva | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api<Sala[]>('/api/salas').then(setSalas).catch(() => setSalas([]));
  }, []);

  const cargar = useCallback(async () => {
    setReservas(null);
    const q = new URLSearchParams({ scope: 'todas' });
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    if (salaId) q.set('sala_id', salaId);
    if (estado) q.set('estado', estado);
    try {
      setReservas(await api<Reserva[]>(`/api/reservas?${q}`));
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'Error al cargar', 'err');
      setReservas([]);
    }
  }, [desde, hasta, salaId, estado, avisar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cancelar() {
    if (!aCancelar) return;
    setEnviando(true);
    try {
      await api(`/api/reservas/${aCancelar.id}`, { method: 'DELETE' });
      avisar('Reserva cancelada');
      setACancelar(null);
      cargar();
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo cancelar', 'err');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="card filtros">
        <label className="field">
          <span>Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="field">
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <label className="field">
          <span>Sala</span>
          <select value={salaId} onChange={(e) => setSalaId(e.target.value)}>
            <option value="">Todas</option>
            {salas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="confirmada">Confirmadas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </label>
      </div>

      {reservas === null ? (
        <Spinner texto="Cargando reservas…" />
      ) : reservas.length === 0 ? (
        <Vacio titulo="No hay reservas con esos filtros">
          <p>Probá ampliar el rango de fechas.</p>
        </Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Sala</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id} className={r.estado === 'cancelada' ? 'apagada' : ''}>
                  <td>{fechaCorta(r.fecha)}</td>
                  <td>
                    {fmtHora(r.hora_inicio)} – {fmtHora(r.hora_fin)}
                  </td>
                  <td>{r.sala_nombre}</td>
                  <td>{r.usuario_nombre}</td>
                  <td>
                    <Badge tono={r.estado === 'confirmada' ? 'ok' : 'err'}>
                      {r.estado === 'confirmada' ? 'confirmada' : 'cancelada'}
                    </Badge>
                  </td>
                  <td className="t-acciones">
                    {r.estado === 'confirmada' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setACancelar(r)}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aCancelar && (
        <Modal
          titulo="Cancelar reserva"
          onClose={() => setACancelar(null)}
          pie={
            <>
              <button className="btn btn-ghost" onClick={() => setACancelar(null)}>
                Volver
              </button>
              <button className="btn btn-peligro" onClick={cancelar} disabled={enviando}>
                {enviando ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </>
          }
        >
          <p>
            {aCancelar.usuario_nombre} · {fechaCorta(aCancelar.fecha)} ·{' '}
            {fmtHora(aCancelar.hora_inicio)} · {aCancelar.sala_nombre}
          </p>
          <p className="muted">Se notificará al usuario… cuando tengamos notificaciones 😉.</p>
        </Modal>
      )}
    </div>
  );
}
