import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { Sala } from '../types';
import { Spinner, Vacio } from '../components/UI';
import { DIAS_LARGOS, fmtHora, fmtPrecio } from '../utils';

export default function SalaDetalle() {
  const { id } = useParams();
  const [sala, setSala] = useState<Sala | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSala(null);
    setError(null);
    api<Sala>(`/api/salas/${id}`)
      .then(setSala)
      .catch((e: ApiError) => setError(e.status === 404 ? 'Sala no encontrada' : e.message));
  }, [id]);

  if (error)
    return (
      <div className="contenedor">
        <Vacio icono="⚠" titulo={error}>
          <Link to="/" className="btn btn-primario">
            Volver al inicio
          </Link>
        </Vacio>
      </div>
    );

  if (!sala) return <Spinner texto="Cargando sala…" />;

  const equipos = sala.equipamiento
    .split(/[,\n]/)
    .map((e) => e.trim())
    .filter(Boolean);

  return (
    <div className="contenedor pagina">
      <Link to="/" className="volver">
        ← Volver a las salas
      </Link>

      <div className="detalle-cab">
        <div>
          <h1>{sala.nombre}</h1>
          {sala.barrio && (
            <span className="chip chip-barrio">
              📍 {sala.barrio}
              {sala.lat != null &&
                sala.lng != null &&
                typeof sala.distancia_km === 'number' &&
                ` · ${sala.distancia_km} km`}
            </span>
          )}
          <p className="detalle-desc">{sala.descripcion}</p>
        </div>
        <div className="detalle-precio">
          <strong>{fmtPrecio(sala.precio_hora)}</strong>
          <span>por hora</span>
        </div>
      </div>

      <div className="detalle-stats">
        <div className="stat">
          <span className="stat-valor">{sala.capacidad}</span>
          <span className="stat-etiqueta">personas</span>
        </div>
        <div className="stat">
          <span className="stat-valor">{sala.slot_minutos}′</span>
          <span className="stat-etiqueta">por turno</span>
        </div>
        <div className="stat">
          <span className="stat-valor">{fmtPrecio(Math.round(sala.precio_hora / 2))}</span>
          <span className="stat-etiqueta">media hora</span>
        </div>
      </div>

      <div className="detalle-cuerpo">
        <section className="card">
          <h3>Equipamiento incluido</h3>
          <div className="equipo-chips">
            {equipos.map((e) => (
              <span key={e} className="chip">
                {e}
              </span>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Horarios de atención</h3>
          <ul className="dispo-lista">
            {DIAS_LARGOS.map((nombre, i) => {
              const d = sala.disponibilidad?.find((x) => x.dia_semana === i);
              return (
                <li key={nombre} className={!d ? 'cerrado' : ''}>
                  <span>{nombre}</span>
                  <span>{d ? `${fmtHora(d.hora_inicio)} a ${fmtHora(d.hora_fin)}` : 'Cerrado'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="detalle-cta">
        <Link to={`/reservar?sala=${sala.id}`} className="btn btn-primario btn-lg">
          Reservar en {sala.nombre}
        </Link>
        <span className="detalle-cta-nota">Elegí el día y el horario en el calendario.</span>
      </div>
    </div>
  );
}
