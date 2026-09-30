import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const user = await login(email, password);
      const next = params.get('next');
      navigate(next || (user.rol === 'admin' ? '/admin' : '/reservar'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="contenedor auth">
      <form className="card auth-card" onSubmit={enviar}>
        <h1>Ingresar</h1>
        <p className="muted">Accedé para reservar y gestionar tus turnos.</p>

        {error && <div className="alerta alerta-err">{error}</div>}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@ejemplo.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        <button className="btn btn-primario btn-block" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="auth-nota">
          ¿No tenés cuenta? <Link to="/registro">Creala gratis</Link>
        </p>

        <div className="auth-demo">
          <strong>Cuentas de prueba</strong>
          <span>
            Admin: <code>admin@salas.com</code> / <code>admin123</code>
          </span>
          <span>
            Músico: <code>musico@demo.com</code> / <code>demo123</code>
          </span>
        </div>
      </form>
    </div>
  );
}
