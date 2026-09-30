import { createContext, useContext, useState, type ReactNode } from 'react';
import { api, leerSesion, guardarSesion, borrarSesion } from './api';
import type { Session, User } from './types';

interface AuthContexto {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  registro: (nombre: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(() => leerSesion());

  async function login(email: string, password: string): Promise<User> {
    const data = await api<Session>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    guardarSesion(data);
    setSesion(data);
    return data.user;
  }

  async function registro(nombre: string, email: string, password: string): Promise<User> {
    const data = await api<Session>('/api/auth/registro', {
      method: 'POST',
      body: { nombre, email, password },
    });
    guardarSesion(data);
    setSesion(data);
    return data.user;
  }

  function logout() {
    borrarSesion();
    setSesion(null);
  }

  return (
    <Ctx.Provider value={{ user: sesion?.user ?? null, login, registro, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
