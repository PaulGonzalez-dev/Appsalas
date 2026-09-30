import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import type { Banda, Perfil as PerfilDatos } from '../types';
import { Spinner } from '../components/UI';

const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];

export default function Perfil() {
  const { actualizar } = useAuth();
  const { avisar } = useToast();

  const [perfil, setPerfil] = useState<PerfilDatos | null>(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [bio, setBio] = useState('');
  const [foto, setFoto] = useState('');
  const [bandas, setBandas] = useState<Banda[]>([]);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [guardandoBandas, setGuardandoBandas] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<PerfilDatos>('/api/auth/perfil')
      .then((p) => {
        setPerfil(p);
        setNombre(p.nombre);
        setTelefono(p.telefono || '');
        setBio(p.bio || '');
        setFoto(p.foto || '');
        setBandas(p.bandas || []);
      })
      .catch((e: ApiError) => avisar(e.message, 'err'));
  }, [avisar]);

  if (!perfil) return <Spinner texto="Cargando tu perfil…" />;

  async function guardarFoto(dataUrl: string) {
    try {
      const p = await api<PerfilDatos>('/api/auth/perfil', {
        method: 'PUT',
        body: { foto: dataUrl },
      });
      setPerfil(p);
      setFoto(p.foto || '');
      actualizar({ foto: p.foto });
      avisar(dataUrl ? 'Foto de perfil actualizada' : 'Foto eliminada');
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se pudo guardar la foto', 'err');
    }
  }

  function onArchivo(file: File | null | undefined) {
    if (!file) return;
    if (!FORMATOS.includes(file.type)) {
      avisar('Formato no válido. Usá JPEG, PNG o WebP', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Recorte cuadrado central a 320px para que pese poco
        const S = 320;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const lado = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - lado) / 2,
          (img.height - lado) / 2,
          lado,
          lado,
          0,
          0,
          S,
          S
        );
        guardarFoto(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => avisar('No se pudo leer la imagen', 'err');
      img.src = String(reader.result);
    };
    reader.onerror = () => avisar('No se pudo leer el archivo', 'err');
    reader.readAsDataURL(file);
  }

  async function guardarDatos(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      avisar('El nombre no puede quedar vacío', 'err');
      return;
    }
    setGuardandoDatos(true);
    try {
      const p = await api<PerfilDatos>('/api/auth/perfil', {
        method: 'PUT',
        body: { nombre, telefono, bio },
      });
      setPerfil(p);
      actualizar({ nombre: p.nombre });
      avisar('Datos guardados');
    } catch (err) {
      avisar(err instanceof ApiError ? err.message : 'No se pudieron guardar los datos', 'err');
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function guardarBandas() {
    const conNombre = bandas.filter((b) => b.nombre.trim());
    if (bandas.some((b) => b.nombre.trim() === '' && b.instrumento.trim())) {
      avisar('Hay una banda sin nombre. Completala o eliminala', 'err');
      return;
    }
    setGuardandoBandas(true);
    try {
      const lista = await api<Banda[]>('/api/auth/bandas', {
        method: 'PUT',
        body: { bandas: conNombre },
      });
      setBandas(lista);
      avisar('Bandas guardadas');
    } catch (err) {
      avisar(err instanceof ApiError ? err.message : 'No se pudieron guardar las bandas', 'err');
    } finally {
      setGuardandoBandas(false);
    }
  }

  function cambiarBanda(i: number, cambio: Partial<Banda>) {
    setBandas((bs) => bs.map((b, k) => (k === i ? { ...b, ...cambio } : b)));
  }

  return (
    <div className="contenedor pagina">
      <div className="reservar-cab">
        <div>
          <h1>Mi perfil</h1>
          <p className="muted">Tu foto, tus datos personales y las bandas en las que tocás.</p>
        </div>
      </div>

      <div className="perfil-grid">
        {/* Foto + email */}
        <section className="card perfil-foto-card">
          <div className="avatar-grande">
            {foto ? (
              <img src={foto} alt={nombre} />
            ) : (
              <span>{nombre.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="foto-acciones">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                onArchivo(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button className="btn btn-primario btn-sm" onClick={() => fileRef.current?.click()}>
              {foto ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {foto && (
              <button className="btn btn-ghost btn-sm" onClick={() => guardarFoto('')}>
                Quitar
              </button>
            )}
          </div>
          <p className="muted chico">JPEG, PNG o WebP · se recorta en cuadro</p>
          <div className="perfil-email">
            <span className="muted">Email</span>
            <strong>{perfil.email}</strong>
            <span className={`badge ${perfil.rol === 'admin' ? 'badge-admin' : ''}`}>
              {perfil.rol === 'admin' ? 'Administrador' : 'Músico'}
            </span>
          </div>
        </section>

        {/* Datos personales */}
        <section className="card">
          <h3>Datos personales</h3>
          <form className="perfil-form" onSubmit={guardarDatos}>
            <label className="field">
              <span>Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+54 9 351 000 0000"
                autoComplete="tel"
              />
            </label>
            <label className="field">
              <span>Sobre vos</span>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="¿En qué tocás? ¿Cuántos años de experiencia? ¿Buscás banda?"
                maxLength={500}
              />
            </label>
            <div className="perfil-form-pie">
              <span className="muted chico">{bio.length}/500</span>
              <button className="btn btn-primario" disabled={guardandoDatos}>
                {guardandoDatos ? 'Guardando…' : 'Guardar datos'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Bandas */}
      <section className="card perfil-bandas">
        <div className="barra-acciones">
          <div>
            <h3>Bandas en las que toco</h3>
            <p className="muted chico">Las bandas actuales con tu instrumento o rol.</p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setBandas([...bandas, { nombre: '', instrumento: '' }])}
          >
            + Agregar banda
          </button>
        </div>

        {bandas.length === 0 ? (
          <p className="muted">Todavía no cargaste bandas. Agregá la primera con el botón de arriba.</p>
        ) : (
          <div className="bandas-lista">
            {bandas.map((b, i) => (
              <div key={i} className="banda-fila">
                <input
                  placeholder="Nombre de la banda"
                  value={b.nombre}
                  onChange={(e) => cambiarBanda(i, { nombre: e.target.value })}
                />
                <input
                  placeholder="Instrumento / rol (ej: Batería)"
                  value={b.instrumento}
                  onChange={(e) => cambiarBanda(i, { instrumento: e.target.value })}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  aria-label="Eliminar banda"
                  onClick={() => setBandas(bandas.filter((_, k) => k !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="perfil-bandas-pie">
          <button className="btn btn-primario" onClick={guardarBandas} disabled={guardandoBandas}>
            {guardandoBandas ? 'Guardando…' : 'Guardar bandas'}
          </button>
        </div>
      </section>
    </div>
  );
}
