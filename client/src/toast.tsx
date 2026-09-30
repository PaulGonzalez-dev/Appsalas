import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Tipo = 'ok' | 'err' | 'info';

interface Aviso {
  id: number;
  texto: string;
  tipo: Tipo;
}

interface ToastContexto {
  avisar: (texto: string, tipo?: Tipo) => void;
}

const Ctx = createContext<ToastContexto | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const contador = useRef(0);

  const avisar = useCallback((texto: string, tipo: Tipo = 'ok') => {
    const id = ++contador.current;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    window.setTimeout(() => {
      setAvisos((a) => a.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <Ctx.Provider value={{ avisar }}>
      {children}
      <div className="toasts" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`toast toast-${a.tipo}`}>
            <span className="toast-icono" aria-hidden>
              {a.tipo === 'ok' ? '✓' : a.tipo === 'err' ? '✕' : 'ℹ'}
            </span>
            {a.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
