import { useEffect, type ReactNode } from 'react';

export function Spinner({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando" role="status">
      <span className="anillo" aria-hidden />
      {texto}
    </div>
  );
}

export function Vacio({
  icono = '♪',
  titulo,
  children,
}: {
  icono?: string;
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="vacio">
      <span className="vacio-icono" aria-hidden>
        {icono}
      </span>
      <p className="vacio-titulo">{titulo}</p>
      {children && <div className="vacio-texto">{children}</div>}
    </div>
  );
}

export function Modal({
  titulo,
  children,
  pie,
  onClose,
  ancho = 460,
}: {
  titulo: string;
  children: ReactNode;
  pie?: ReactNode;
  onClose: () => void;
  ancho?: number;
}) {
  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: ancho }} role="dialog" aria-modal="true">
        <div className="modal-cab">
          <h3>{titulo}</h3>
          <button className="modal-cerrar" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tono = 'nulo',
}: {
  children: ReactNode;
  tono?: 'ok' | 'err' | 'nulo' | 'admin' | 'alerta';
}) {
  return <span className={`badge badge-${tono}`}>{children}</span>;
}
