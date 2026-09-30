import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useToast } from '../toast';
import type { Reserva } from '../types';
import { Badge, Modal, Spinner, Vacio } from '../components/UI';
import { fechaLarga, fechaHora, fmtHora } from '../utils';

export default function MisTurnos() {
  const { avisar } = useToast();
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [aCancelar, setACancelar] = useState<Reserva | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => {
    api<Reserva[]>('/api/reservas?scope=mias')
      .then(setReservas)
      .catch((e: ApiError) => {
        avisar(e.message, 'err');
        setReservas([]);
      });
  }, [avisar]);

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

  if (reservas === null) return <Spinner texto="Cargando tus turnos…" />;

  const ahora = Date.now();
  const futuras = reservas
    .filter((r) => r.estado === 'confirmada' && fechaHora(r.fecha, r.hora_inicio).getTime() >= ahora)
    .sort((a, b) => fechaHora(a.fecha, a.hora_inicio).getTime() - fechaHora(b.fecha, b.hora_inicio).getTime());
  const pasadas = reservas
    .filter((r) => !(r.estado === 'confirmada' && fechaHora(r.fecha, r.hora_inicio).getTime() >= ahora))
    .sort((a, b) => fechaHora(b.fecha, b.hora_inicio).getTime() - fechaHora(a.fecha, a.hora_inicio).getTime());

  return (
    <div className="contenedor pagina">
      <div className="reservar-cab">
        <div>
          <h1>Mis turnos</h1>
          <p className="muted">Tus reservas próximas y tu historial.</p>
        </div>
        <Link to="/reservar" className="btn btn-primario">
          + Reservar otro
        </Link>
      </div>

      <h2 className="subtitulo">Próximos ({futuras.length})</h2>
      {futuras.length === 0 ? (
        <Vacio titulo="No tenés turnos próximos">
          <p>¿Qué tal ensayar esta semana?</p>
          <Link to="/reservar" className="btn btn-primario">
            Ver turnos libres
          </Link>
        </Vacio>
      ) : (
        <div className="lista-turnos">
          {futuras.map((r) => (
            <div key={r.id} className="turno-fila">
              <div className="turno-fecha">
                <span className="turno-dia">{r.fecha.slice(8, 10)}</span>
                <span className="turno-mes">
                  {fechaLarga(r.fecha)
                    .split(' de ')
                    .slice(1, 2)[0]
                    ?.slice(0, 3)}
                </span>
              </div>
              <div className="turno-info">
                <strong>
                  {fmtHora(r.hora_inicio)} – {fmtHora(r.hora_fin)}
                </strong>
                <span className="muted">
                  {r.sala_nombre} · {fechaLarga(r.fecha)}
                </span>
              </div>
              <Badge tono="ok">confirmada</Badge>
              <button className="btn btn-ghost btn-sm" onClick={() => setACancelar(r)}>
                Cancelar
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="subtitulo">Historial ({pasadas.length})</h2>
      {pasadas.length === 0 ? (
        <p className="muted">Todavía no tenés turnos anteriores.</p>
      ) : (
        <div className="lista-turnos">
          {pasadas.map((r) => (
            <div key={r.id} className="turno-fila apagada">
              <div className="turno-fecha">
                <span className="turno-dia">{r.fecha.slice(8, 10)}</span>
                <span className="turno-mes">
                  {fechaLarga(r.fecha)
                    .split(' de ')
                    .slice(1, 2)[0]
                    ?.slice(0, 3)}
                </span>
              </div>
              <div className="turno-info">
                <strong>
                  {fmtHora(r.hora_inicio)} – {fmtHora(r.hora_fin)}
                </strong>
                <span className="muted">
                  {r.sala_nombre} · {fechaLarga(r.fecha)}
                </span>
              </div>
              <Badge tono={r.estado === 'cancelada' ? 'err' : 'nulo'}>
                {r.estado === 'cancelada' ? 'cancelada' : 'finalizada'}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {aCancelar && (
        <Modal
          titulo="Cancelar turno"
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
            Vas a cancelar el turno del <strong>{fechaLarga(aCancelar.fecha)}</strong> a las{' '}
            <strong>{fmtHora(aCancelar.hora_inicio)}</strong> en{' '}
            <strong>{aCancelar.sala_nombre}</strong>.
          </p>
          <p className="muted">Se liberará el horario para otros músicos.</p>
        </Modal>
      )}

    </div>
  );
}
