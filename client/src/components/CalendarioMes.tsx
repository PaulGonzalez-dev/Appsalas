import { aFechaStr, hoyStr } from '../utils';

interface Props {
  mes: Date; // cualquier día dentro del mes a mostrar
  onMes: (d: Date) => void;
  seleccion: string | null; // YYYY-MM-DD
  onSeleccion: (fecha: string) => void;
}

const DÍAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function inicioMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Grilla lunes→domingo del mes indicado. */
export default function CalendarioMes({ mes, onMes, seleccion, onSeleccion }: Props) {
  const hoy = hoyStr();
  const primero = inicioMes(mes);
  const anio = primero.getFullYear();
  const mesN = primero.getMonth();

  // offset del lunes (0=dom → 6, 1=lun → 0, ...)
  const offset = (primero.getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mesN + 1, 0).getDate();

  const celdas: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(new Date(anio, mesN, d));
  while (celdas.length % 7 !== 0) celdas.push(null);

  const mesAnterior = new Date(anio, mesN - 1, 1);
  const mesSiguiente = new Date(anio, mesN + 1, 1);
  const nombreMes =
    primero.toLocaleDateString('es-AR', { month: 'long' }) +
    ' ' +
    anio;

  return (
    <div className="cal">
      <div className="cal-cab">
        <button
          type="button"
          className="btn btn-icono"
          onClick={() => onMes(mesAnterior)}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong className="cal-titulo">{nombreMes}</strong>
        <button
          type="button"
          className="btn btn-icono"
          onClick={() => onMes(mesSiguiente)}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="cal-grid cal-dias">
        {DÍAS_SEMANA.map((d, i) => (
          <span key={i} className="cal-dia-nombre">
            {d}
          </span>
        ))}
      </div>

      <div className="cal-grid">
        {celdas.map((fecha, i) => {
          if (!fecha) return <span key={i} className="cal-celda vacia" />;
          const str = aFechaStr(fecha);
          const pasada = str < hoy;
          const esHoy = str === hoy;
          const sel = str === seleccion;
          return (
            <button
              key={i}
              type="button"
              className={`cal-celda${sel ? ' sel' : ''}${esHoy ? ' hoy' : ''}`}
              disabled={pasada}
              onClick={() => onSeleccion(str)}
              aria-pressed={sel}
            >
              {fecha.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
