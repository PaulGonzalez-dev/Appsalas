import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Sala } from '../types';
import { Spinner, Vacio } from '../components/UI';
import { DIAS_CORTOS, fmtPrecio } from '../utils';
import SalasCercanas from '../components/SalasCercanas';

function horarioDe(sala: Sala, dia: number): string {
  const d = sala.disponibilidad?.find((x) => x.dia_semana === dia);
  return d ? `${d.hora_inicio}–${d.hora_fin}` : 'Cerrado';
}

export default function Home() {
  const [salas, setSalas] = useState<Sala[] | null>(null);

  useEffect(() => {
    api<Sala[]>('/api/salas')
      .then(setSalas)
      .catch(() => setSalas([]));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="contenedor hero-dentro">
          <div className="hero-texto">
            <span className="hero-ola">♪ Ensayá cuando quieras</span>
            <h1>
              Tu sala de ensayo,
              <br />
              <span className="texto-acento">lista cuando vos</span>.
            </h1>
            <p className="hero-bajada">
              Mirá la disponibilidad en vivo, reservá tu turno en segundos y confirmá todo desde el
              calendario. Sin llamados, sin esperas, sin papelito.
            </p>
            <div className="hero-cta">
              <Link to="/reservar" className="btn btn-primario btn-lg">
                Reservar un turno
              </Link>
              <a href="#salas" className="btn btn-ghost btn-lg">
                Ver las salas
              </a>
            </div>
            <ul className="hero-puntos">
              <li>Calendario en vivo</li>
              <li>Cancelás cuando quieras</li>
              <li>Equipamiento incluido</li>
            </ul>
          </div>
          <div className="hero-panel" aria-hidden>
            <div className="panel-titulo">
              <span className="panel-punto" />
              Disponibilidad de hoy
            </div>
            <div className="panel-horas">
              {['16:00', '17:00', '18:00', '19:00', '20:00'].map((h, i) => (
                <div key={h} className={`panel-hora${i === 3 ? ' libre' : ''}`}>
                  <span>{h}</span>
                  <span>{i === 3 ? 'Libre' : 'Ocupado'}</span>
                </div>
              ))}
            </div>
            <div className="panel-pie">Sala Metrónomo · turno de 1 hora</div>
          </div>
        </div>
      </section>

      {/* Salas cercanas al usuario */}
      <SalasCercanas />

      {/* Salas */}
      <section className="seccion" id="salas">
        <div className="contenedor">
          <div className="seccion-cab">
            <h2>Nuestras salas</h2>
            <p>Elegí la que mejor se adapte a tu ensayo.</p>
          </div>

          {salas === null ? (
            <Spinner texto="Cargando salas…" />
          ) : salas.length === 0 ? (
            <Vacio titulo="Todavía no hay salas cargadas" />
          ) : (
            <div className="grilla-salas">
              {salas.map((s) => (
                <Link key={s.id} to={`/salas/${s.id}`} className="sala-card">
                  <div className="sala-card-cab">
                    <h3>{s.nombre}</h3>
                    <span className="sala-precio">{fmtPrecio(s.precio_hora)}</span>
                  </div>
                  <p className="sala-desc">{s.descripcion}</p>
                  <div className="sala-meta">
                    <span>👥 {s.capacidad} personas</span>
                    <span>⏱ {s.slot_minutos} min</span>
                  </div>
                  <div className="sala-dias">
                    {DIAS_CORTOS.map((d, i) => {
                      const dia = (i + 1) % 7; // Lun=1 … Dom=0
                      const abierto = !!s.disponibilidad?.find((x) => x.dia_semana === dia);
                      return (
                        <span key={d} className={`dia-chip${abierto ? ' abierto' : ''}`}>
                          {d}
                        </span>
                      );
                    })}
                  </div>
                  <span className="sala-ver">Ver detalle y reservar →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pasos */}
      <section className="seccion seccion-clara">
        <div className="contenedor">
          <div className="seccion-cab">
            <h2>¿Cómo funciona?</h2>
            <p>Tres pasos y estás tocando.</p>
          </div>
          <div className="pasos">
            <div className="paso">
              <span className="paso-nro">1</span>
              <h4>Create tu cuenta</h4>
              <p>Registro gratuito en menos de un minuto con tu email.</p>
            </div>
            <div className="paso">
              <span className="paso-nro">2</span>
              <h4>Elegí día y hora</h4>
              <p>El calendario muestra en vivo qué turnos están libres.</p>
            </div>
            <div className="paso">
              <span className="paso-nro">3</span>
              <h4>¡Ensaya!</h4>
              <p>Tu turno queda reservado. Podés cancelarlo si cambian los planes.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
