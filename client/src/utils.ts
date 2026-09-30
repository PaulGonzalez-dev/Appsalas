import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const DIAS_LARGOS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function aFechaStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hoyStr(): string {
  return aFechaStr(new Date());
}

export function parseFechaStr(f: string): Date {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Fecha + hora de un turno como objeto Date local. */
export function fechaHora(fecha: string, hora: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0);
}

export function fechaLarga(fecha: string): string {
  const d = parseFechaStr(fecha);
  const txt = format(d, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function fechaCorta(fecha: string): string {
  return format(parseFechaStr(fecha), 'dd/MM/yyyy');
}

export function fmtPrecio(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtHora(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${sufijo}`;
}
