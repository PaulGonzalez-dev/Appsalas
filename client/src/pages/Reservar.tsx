import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import type { RespuestaTurnos, Sala, Turno } from '../types';
import CalendarioMes from '../components/CalendarioMes';
import { Modal, Spinner, Vacio } from '../components/UI';
import { aFechaStr, fechaLarga, fmtHora, fmtPrecio, hoyStr, parseFechaStr } from '../utils';

export default function Reservar() {
  const { user } = useAuth();
  const { avisar } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [salas, setSalas] = useState<Sala[] | null>(null);
  const [salaId, setSalaId] = useState<number | null>(null);
  const [mes, setMes] = useState(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });
  const [fecha, setFecha] = useState(() => hoyStr());
  const [datos, setDatos] = useState<RespuestaTurnos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState<Turno | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Carga de salas
  useEffect(() => {
    api<Sala[]>('/api/salas')
      .then((lista) => {
        setSalas(lista);
        const q = Number(params.get('sala'));
        const elegida = lista.find((s) => s.id === q) ?? lista[0];
        setSalaId(elegida ? elegida.id : null);
      })
      .catch(() => {
        setSalas([]);
        avisar('No se pudieron cargar las salas', 'err');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carga de turnos del día/selección
  const recargar = useCallback(() => {
    if (!salaId) {
      setDatos(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    api<RespuestaTurnos>(`/api/turnos?fecha=${fecha}&sala_id=${salaId}`)
      .then(setDatos)
      .catch((e: ApiError) => avisar(e.message, 'err'))
      .finally(() => setCargando(false));
  }, [salaId, fecha, avisar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function elegirDia(f: string) {
    setFecha(f);
    setSel(null);
  }

  function clicTurno(t: Turno) {
    if (t.estado === 'ocupado' && t.es_mia) {
      setSel(t);
      return;
    }
    if (t.estado !== 'libre') return;
    setSel(t);
  }

  async function confirmarReserva() {
    if (!sel || !salaId) return;
    setEnviando(true);
    try {
      await api('/api/reservas', {
        method: 'POST',
        body: { sala_id: salaId, fecha, hora_inicio: sel.hora_inicio },
      });
      avisar(`Turno reservado: ${fechaLarga(fecha)} a las ${fmtHora(sel.hora_inicio)}`);
      setSel(null);
      recargar();
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo reservar', 'err');
    } finally {
      setEnviando(false);
    }
  }

  async function cancelarReserva() {
    if (!sel?.reserva_id) return;
    setEnviando(true);
    try {
      await api(`/api/reservas/${sel.reserva_id}`, { method: 'DELETE' });
      avisar('Turno cancelado');
      setSel(null);
      recargar();
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo cancelar', 'err');
    } finally {
      setEnviando(false);
    }
  }

  if (salas === null) return <Spinner texto="Cargando salas…" />;

  if (salas.length === 0) {
    return (
      <div className="contenedor">
        <Vacio titulo="No hay salas disponibles">
          <p>Consultale al administrador para cargar salas.</p>
        </Vacio>
      </div>
    );
  }

  const salaActual = salas.find((s) => s.id === salaId);
  const dato = datos?.salas.find((x) => x.sala.id === salaId);
  const precioTurno = salaActual
    ? Math.round((salaActual.precio_hora * salaActual.slot_minutos) / 60)
    : 0;

  return (
    <div className="contenedor pagina">
      <div className="reservar-cab">
        <div>
          <h1>Reservar un turno</h1>
          <p className="muted">
            Elegí la sala, el día en el calendario y luego el horario que quieras.
          </p>
        </div>
        <label className="field field-derecha">
          <span>Sala</span>
          <select value={salaId ?? ''} onChange={(e) => setSalaId(Number(e.target.value))}>
            {salas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} · {s.slot_minutos}′ · {fmtPrecio(s.precio_hora)}/h
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="reservar-grilla">
        <div className="card">
          <CalendarioMes mes={mes} onMes={setMes} seleccion={fecha} onSeleccion={elegirDia} />
          <div className="leyenda">
            <span>
              <i className="pt-libre" /> Libre
            </span>
            <span>
              <i className="pt-ocupado" /> Ocupado
            </span>
            <span>
              <i className="pt-mio" /> Tu turno
            </span>
            <span>
              <i className="pt-pasado" /> Pasado
            </span>
          </div>
        </div>

        <div className="card turnos-panel">
          <div className="turnos-cab">
            <h3>{fechaLarga(fecha)}</h3>
            {salaActual && <span className="chip">{salaActual.nombre}</span>}
          </div>

          {cargando ? (
            <Spinner texto="Calculando turnos…" />
          ) : dato?.cerrado ? (
            <Vacio icono="🔒" titulo="La sala está cerrada ese día">
              <p>Probá con otra fecha u otra sala.</p>
            </Vacio>
          ) : dato && dato.turnos.length === 0 ? (
            <Vacio titulo="Sin turnos disponibles ese día">
              <p>La franja horaria no tiene turnos.</p>
            </Vacio>
          ) : (
            <div className="slots">
              {dato?.turnos.map((t) => {
                const cls =
                  t.estado === 'ocupado'
                    ? t.es_mia
                      ? ' mio'
                      : ' ocupado'
                    : t.estado === 'pasado'
                      ? ' pasado'
                      : ' libre';
                return (
                  <button
                    key={t.hora_inicio}
                    type="button"
                    className={`slot${cls}`}
                    disabled={t.estado === 'pasado' || (t.estado === 'ocupado' && !t.es_mia)}
                    onClick={() => clicTurno(t)}
                  >
                    <strong>
                      {fmtHora(t.hora_inicio)} – {fmtHora(t.hora_fin)}
                    </strong>
                    <span>
                      {t.estado === 'ocupado'
                        ? t.es_mia
                          ? 'Tu turno ✓'
                          : 'Ocupado'
                        : t.estado === 'pasado'
                          ? 'Pasado'
                          : 'Libre'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: turno propio */}
      {sel && sel.estado === 'ocupado' && sel.es_mia && (
        <Modal
          titulo="Este es tu turno"
          onClose={() => setSel(null)}
          pie={
            <>
              <button className="btn btn-ghost" onClick={() => setSel(null)}>
                Cerrar
              </button>
              <button className="btn btn-peligro" onClick={cancelarReserva} disabled={enviando}>
                {enviando ? 'Cancelando…' : 'Cancelar turno'}
              </button>
            </>
          }
        >
          <p>
            <strong>{fechaLarga(fecha)}</strong>
          </p>
          <p>
            {fmtHora(sel.hora_inicio)} a {fmtHora(sel.hora_fin)} · {salaActual?.nombre}
          </p>
          <p className="muted">Si no podés asistir, cancelalo para liberar el horario.</p>
        </Modal>
      )}

      {/* Modal: libre sin sesión */}
      {sel && sel.estado === 'libre' && !user && (
        <Modal
          titulo="Iniciá sesión para reservar"
          onClose={() => setSel(null)}
          pie={
            <>
              <button className="btn btn-ghost" onClick={() => setSel(null)}>
                Ahora no
              </button>
              <button
                className="btn btn-primario"
                onClick={() =>
                  navigate(`/login?next=${encodeURIComponent(`/reservar?sala=${salaId}`)}`)
                }
              >
                Ingresar
              </button>
            </>
          }
        >
          <p>
            El turno del <strong>{fechaLarga(fecha)}</strong> a las{' '}
            <strong>{fmtHora(sel.hora_inicio)}</strong> está libre.
          </p>
          <p className="muted">Necesitás una cuenta para reservar. ¡Registro gratis!</p>
        </Modal>
      )}

      {/* Modal: confirmar reserva */}
      {sel && sel.estado === 'libre' && user && (
        <Modal
          titulo="Confirmar reserva"
          onClose={() => setSel(null)}
          pie={
            <>
              <button className="btn btn-ghost" onClick={() => setSel(null)}>
                Volver
              </button>
              <button className="btn btn-primario" onClick={confirmarReserva} disabled={enviando}>
                {enviando ? 'Reservando…' : 'Confirmar reserva'}
              </button>
            </>
          }
        >
          <p>
            <strong>{salaActual?.nombre}</strong>
          </p>
          <p>
            {fechaLarga(fecha)}
            <br />
            {fmtHora(sel.hora_inicio)} a {fmtHora(sel.hora_fin)}
          </p>
          <p className="precio-modal">
            {fmtPrecio(precioTurno)} <span className="muted">total del turno</span>
          </p>
          <p className="muted">
            Podés cancelar sin costo desde <Link to="/mis-turnos">Mis turnos</Link>.
          </p>
        </Modal>
      )}
    </div>
  );
}
