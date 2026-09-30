import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function Logo({ chico = false }: { chico?: boolean }) {
  return (
    <span className="marca" style={chico ? { fontSize: '1rem' } : undefined}>
      <svg viewBox="0 0 32 32" width={chico ? 24 : 30} height={chico ? 24 : 30} aria-hidden>
        <rect width="32" height="32" rx="7" fill="var(--acento)" />
        <path
          d="M14 21.5a2.75 2.75 0 1 0 2.75 2.75V12l7.5-1.75v7.75A2.75 2.75 0 1 0 24 18.75V8l-10 2.35z"
          fill="#020305"
        />
      </svg>
      App<span className="marca-fuerte">Salas</span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function salir() {
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="contenedor navbar-dentro">
        <Link to="/" className="navbar-marca">
          <Logo />
        </Link>

        <nav className="navbar-links" aria-label="Principal">
          <NavLink to="/reservar">Reservar</NavLink>
          <NavLink to="/#salas">Salas</NavLink>
          {user && <NavLink to="/mis-turnos">Mis turnos</NavLink>}
          {user?.rol === 'admin' && <NavLink to="/admin">Administración</NavLink>}
        </nav>

        <div className="navbar-acciones">
          {user ? (
            <>
              <span className="chip-usuario" title={user.email}>
                <span className="avatar">{user.nombre.charAt(0).toUpperCase()}</span>
                <span className="chip-nombre">{user.nombre.split(' ')[0]}</span>
                {user.rol === 'admin' && <span className="badge badge-admin">admin</span>}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={salir}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Ingresar
              </Link>
              <Link to="/registro" className="btn btn-primario btn-sm">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
