import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function Logo({ chico = false }: { chico?: boolean }) {
  const px = chico ? 24 : 30;
  return (
    <span className="marca">
      <svg viewBox="0 0 100 100" width={px} height={px} aria-hidden>
        <rect width="100" height="100" rx="20" fill="#edf0f5" />
        <g
          transform="translate(24 14) scale(0.72)"
          fill="none"
          stroke="#020305"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 12L59 44L17 73" />
          <path d="M16 50L16 90" />
        </g>
      </svg>
      PLAYR
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
          <NavLink to="/perfil">Mi perfil</NavLink>
          <NavLink to="/como-funciona">Cómo funciona</NavLink>
          {user && <NavLink to="/mis-turnos">Mis turnos</NavLink>}
          {user?.rol === 'admin' && <NavLink to="/admin">Administración</NavLink>}
        </nav>

        <div className="navbar-acciones">
          {user ? (
            <>
              <span className="chip-usuario" title={user.email}>
                <span className="avatar">
                {user.foto ? <img src={user.foto} alt="" /> : user.nombre.charAt(0).toUpperCase()}
              </span>
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
