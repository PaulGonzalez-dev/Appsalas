export type Rol = 'admin' | 'musico';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface Session {
  token: string;
  user: User;
}

export interface Disponibilidad {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface Sala {
  id: number;
  nombre: string;
  descripcion: string;
  equipamiento: string;
  precio_hora: number;
  capacidad: number;
  slot_minutos: number;
  activa: number;
  creado_en?: string;
  disponibilidad?: Disponibilidad[];
}

export interface Turno {
  hora_inicio: string;
  hora_fin: string;
  estado: 'libre' | 'ocupado' | 'pasado';
  es_mia?: boolean;
  reserva_id?: number;
}

export interface SalaTurnos {
  sala: Sala;
  cerrado: boolean;
  turnos: Turno[];
}

export interface RespuestaTurnos {
  fecha: string;
  dia_semana: number;
  salas: SalaTurnos[];
}

export interface Reserva {
  id: number;
  sala_id: number;
  usuario_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'confirmada' | 'cancelada';
  nota: string;
  sala_nombre: string;
  usuario_nombre: string;
  precio_hora: number;
  slot_minutos: number;
}
