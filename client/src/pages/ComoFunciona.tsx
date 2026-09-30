import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function ComoFunciona() {
  const { user } = useAuth();

  return (
    <section className="seccion seccion-clara seccion-como">
      <div className="contenedor">
        <div className="seccion-cab">
          <h2>¿Cómo funciona?</h2>
          <p>Tres pasos y estás tocando.</p>
        </div>

        <div className="pasos">
          <div className="paso">
            <span className="paso-nro">1</span>
            <h4>Creá tu cuenta</h4>
            <p>Registro gratuito en menos de un minuto con tu email.</p>
          </div>
          <div className="paso">
            <span className="paso-nro">2</span>
            <h4>Elegí día, hora y duración</h4>
            <p>El calendario muestra en vivo qué turnos están libres, de 2, 3 o 4 horas.</p>
          </div>
          <div className="paso">
            <span className="paso-nro">3</span>
            <h4>¡Ensaya!</h4>
            <p>Tu turno queda reservado. Podés cancelarlo sin costo si cambian los planes.</p>
          </div>
        </div>

        <div className="como-cta">
          {user ? (
            <Link to="/" className="btn btn-primario btn-lg">
              Ver salas cercanas
            </Link>
          ) : (
            <>
              <Link to="/registro" className="btn btn-primario btn-lg">
                Crear cuenta gratis
              </Link>
              <Link to="/login" className="btn btn-ghost btn-lg">
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
