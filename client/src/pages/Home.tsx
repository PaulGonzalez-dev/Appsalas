import SalasCercanas from '../components/SalasCercanas';

export default function Home() {
  return (
    <div>
      {/* Salas cercanas al usuario */}
      <SalasCercanas />

      {/* Pasos */}
      <section className="seccion seccion-clara">
        <div className="contenedor">
          <div className="seccion-cab">
            <h2>¿Cómo funciona?</h2>
            <p>Tres pasos y estás tocando.</p>
          </div>
          <div className="pasos">
            <div className="paso">
              <span className="paso-nro">1</span>
              <h4>Create tu cuenta</h4>
              <p>Registro gratuito en menos de un minuto con tu email.</p>
            </div>
            <div className="paso">
              <span className="paso-nro">2</span>
              <h4>Elegí día y hora</h4>
              <p>El calendario muestra en vivo qué turnos están libres.</p>
            </div>
            <div className="paso">
              <span className="paso-nro">3</span>
              <h4>¡Ensaya!</h4>
              <p>Tu turno queda reservado. Podés cancelarlo si cambian los planes.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
