import type { Session } from './types';

const CLAVE = 'playr_sesion';
/** En la app Android (VITE_API_URL) apunta al servidor de producción; en web, rutas relativas. */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

export function leerSesion(): Session | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const s = JSON.parse(crudo) as Session;
    return s && s.token && s.user ? s : null;
  } catch {
    return null;
  }
}

export function guardarSesion(s: Session) {
  localStorage.setItem(CLAVE, JSON.stringify(s));
}

export function borrarSesion() {
  localStorage.removeItem(CLAVE);
}

interface Opciones {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const sesion = leerSesion();
  const res = await fetch(`${BASE}${ruta}`, {
    method: opciones.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(sesion ? { Authorization: `Bearer ${sesion.token}` } : {}),
    },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });

  let datos: unknown = null;
  try {
    datos = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (!res.ok) {
    const msg =
      datos && typeof datos === 'object' && 'error' in datos
        ? String((datos as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return datos as T;
}
