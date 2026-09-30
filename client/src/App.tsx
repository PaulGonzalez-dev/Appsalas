import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ToastProvider } from './toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SalaDetalle from './pages/SalaDetalle';
import Reservar from './pages/Reservar';
import MisTurnos from './pages/MisTurnos';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Admin from './pages/Admin';
import type { ReactNode } from 'react';

function RequiereSesion({
  children,
  soloAdmin = false,
}: {
  children: ReactNode;
  soloAdmin?: boolean;
}) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (soloAdmin && user.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Navbar />
          <main className="principal">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/salas/:id" element={<SalaDetalle />} />
              <Route path="/reservar" element={<Reservar />} />
              <Route
                path="/mis-turnos"
                element={
                  <RequiereSesion>
                    <MisTurnos />
                  </RequiereSesion>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequiereSesion soloAdmin>
                    <Admin />
                  </RequiereSesion>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="pie">
            <div className="contenedor pie-dentro">
              <span>AppSalas — Gestión de turnos para salas de ensayo musical</span>
              <span className="pie-muted">
                Hecho con React + Express · {new Date().getFullYear()}
              </span>
            </div>
          </footer>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
