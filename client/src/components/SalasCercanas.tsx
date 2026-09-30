import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useToast } from '../toast';
import type { Sala } from '../types';
import { Spinner, Vacio } from './UI';
import CarruselFotos from './CarruselFotos';
import { fmtPrecio } from '../utils';

type Origen =
  | { tipo: 'cargando' }
  | { tipo: 'gps'; lat: number; lng: number }
  | { tipo: 'sin' };

function fmtDist(d?: number | null): string {
  if (d == null) return '—';
  if (d < 0.1) return '< 100 m';
  if (d < 1) return `${Math.round(d * 10) * 100} m`;
  return `${d.toFixed(1).replace('.', ',')} km`;
}

export default function SalasCercanas() {
  const { avisar } = useToast();
  const navigate = useNavigate();
  const [origen, setOrigen] = useState<Origen>({ tipo: 'cargando' });
  const [salas, setSalas] = useState<Sala[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [precioMax, setPrecioMax] = useState<number | null>(null);

  const pedirGPS = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setOrigen({ tipo: 'sin' });
      return;
    }
    setOrigen({ tipo: 'cargando' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigen({ tipo: 'gps', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setOrigen({ tipo: 'sin' }),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    pedirGPS();
  }, [pedirGPS]);

  useEffect(() => {
    if (origen.tipo === 'cargando') return;
    const q = origen.tipo === 'gps' ? `?lat=${origen.lat}&lng=${origen.lng}` : '';
    setSalas(null);
    api<Sala[]>(`/api/salas${q}`)
      .then(setSalas)
      .catch((e: ApiError) => {
        avisar(e.message, 'err');
        setSalas([]);
      });
  }, [origen, avisar]);

  const subtitulo =
    origen.tipo === 'gps'
      ? 'Las más cercanas a tu ubicación, de menor a mayor distancia.'
      : origen.tipo === 'sin'
        ? 'Mostrando todas las salas — activá tu ubicación para ver distancias.'
        : 'Detectando tu ubicación…';

  // Filtros de la lista: texto (nombre o barrio) y precio máximo por hora
  const precios = (salas ?? []).map((s) => s.precio_hora);
  const pMin = precios.length ? Math.floor(Math.min(...precios) / 500) * 500 : 0;
  const pMax = precios.length ? Math.ceil(Math.max(...precios) / 500) * 500 : 10000;
  const limite = precioMax ?? pMax;
  const texto = busqueda.trim().toLowerCase();
  const filtradas = (salas ?? []).filter((s) => {
    const coincideTexto =
      !texto ||
      s.nombre.toLowerCase().includes(texto) ||
      (s.barrio || '').toLowerCase().includes(texto);
    return coincideTexto && s.precio_hora <= limite;
  });

  return (
    <section className="seccion" id="cercanas">
      <div className="contenedor">
        <div className="seccion-cab cerc-cab">
          <div>
            <h2>Salas cercanas a vos</h2>
            <p>{subtitulo}</p>
          </div>
          <div className="cerc-controles">
            <button className="btn btn-ghost btn-sm" onClick={pedirGPS}>
              📍 Usar mi ubicación
            </button>
          </div>
        </div>

        {origen.tipo === 'cargando' ? (
          <Spinner texto="Detectando tu ubicación…" />
        ) : salas === null ? (
          <Spinner texto="Buscando salas…" />
        ) : salas.length === 0 ? (
          <Vacio titulo="Todavía no hay salas cargadas" />
        ) : (
          <>
            {/* Buscador y filtro de precio */}
            <div className="cerc-filtros">
              <div className="buscador">
                <span aria-hidden>🔍</span>
                <input
                  type="search"
                  placeholder="Buscar sala o barrio"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  aria-label="Buscar sala o barrio"
                />
              </div>
              <label className="filtro-precio">
                <span>
                  Precio máx. por hora: <strong>{fmtPrecio(limite)}</strong>
                </span>
                <input
                  type="range"
                  min={pMin}
                  max={pMax}
                  step={100}
                  value={limite}
                  onChange={(e) => setPrecioMax(Number(e.target.value))}
                  aria-label="Precio máximo por hora"
                />
              </label>
              {(texto || precioMax !== null) && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setBusqueda('');
                    setPrecioMax(null);
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {filtradas.length === 0 ? (
              <Vacio titulo="No encontramos salas">
                <p>Probá con otro nombre, barrio o subí el precio máximo.</p>
              </Vacio>
            ) : (
              <div className="cerc-lista">
                {filtradas.map((s) => (
              <article
                key={s.id}
                className="cerc-card"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/salas/${s.id}`)}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') navigate(`/salas/${s.id}`);
                }}
              >
                <CarruselFotos imagenes={s.imagenes || []} alt={s.nombre} />
                <div className="cerc-cuerpo">
                  <div className="cerc-fila">
                    <h3 className="cerc-nombre">{s.nombre}</h3>
                    {s.distancia_km != null && (
                      <span className="cerc-dist">{fmtDist(s.distancia_km)}</span>
                    )}
                  </div>
                  <span className="cerc-barrio">📍 {s.barrio || 'Sin barrio cargado'}</span>
                  <p className="cerc-desc">{s.descripcion}</p>
                  <div className="cerc-precio">
                    <strong>{fmtPrecio(s.precio_hora * 2)}</strong>
                    <span>turno de 2 h</span>
                    <span className="cerc-ver">Ver sala →</span>
                  </div>
                </div>
              </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
