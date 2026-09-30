# 🎸 Playr

Aplicación para la **gestión de turnos de salas de ensayo musical**.
Los músicos ven la disponibilidad en vivo en un calendario y reservan su turno;
el administrador gestiona salas, horarios de atención y reservas.

## Stack

| Capa      | Tecnología                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 18 + TypeScript + Vite + React Router             |
| Backend   | Node.js + Express (API REST)                            |
| Base de datos | SQLite (`better-sqlite3`) — sin servicios externos  |
| Auth      | JWT (`jsonwebtoken`) + `bcryptjs`                       |

## Features (MVP)

- **Roles**: administrador y músico.
- **Salas**: CRUD con descripción, equipamiento, precio por hora, capacidad y duración del turno.
- **Disponibilidad**: por sala y día de la semana (desde/hasta), configurable por el admin.
- **Turnos de 2, 3 y 4 horas** en todas las salas: elegís la duración al reservar (la grilla avanza de a 1 hora y valida disponibilidad y solapamientos)
- **Mi perfil**: foto de perfil (se recorta cuadrado en el navegador), datos personales (nombre, teléfono, bio) y las bandas en las que tocás con tu instrumento
- **Salas cercanas**: geolocalización del usuario (con fallback por zona), distancia en km/m y carrusel de fotos por sala, con precio por turno de 2 horas
- **Calendario de turnos**: grilla diaria generada automáticamente en pasos de 1 hora (libre / ocupado / pasado / tu turno) con duraciones de 2, 3 o 4 horas.
- **Reservas**: crear, cancelar (dueño o admin), historial y próximos turnos.
- **Panel de administración**: salas, disponibilidad y listado de reservas con filtros.
- Interfaz 100% en español (rioplatense), tema oscuro responsive.

## Puesta en marcha

```bash
# 1. Instalar dependencias (workspaces: server + client)
npm install

# 2. Crear/cargar datos de prueba (usuarios, salas, reservas demo)
npm run seed

# 3. Levantar API (puerto 3001) + frontend (puerto 5173)
npm run dev
```

Abrí **http://localhost:5173**

### Usuarios de prueba

| Rol          | Email             | Contraseña |
| ------------ | ----------------- | ---------- |
| Administrador | `admin@salas.com` | `admin123` |
| Músico       | `musico@demo.com` | `demo123`  |

La base se crea en `server/data/playr.db` (ignorada por git). Para reiniciar
de cero: borrá ese archivo y volvé a correr `npm run seed`.

## Estructura

```
Appsalas/
├── server/                # API Express (ESM)
│   ├── src/
│   │   ├── index.js       # arranque + rutas
│   │   ├── db.js          # esquema SQLite
│   │   ├── auth.js        # JWT + middleware
│   │   ├── seed.js        # datos de prueba
│   │   ├── util.js        # fechas/horas/validaciones
│   │   └── routes/
│   │       ├── auth.js    # registro / login / me
│   │       ├── salas.js   # CRUD salas + disponibilidad
│   │       └── reservas.js # turnos + reservas
│   └── data/              # base SQLite (gitignored)
└── client/                # Vite + React + TS
    └── src/
        ├── api.ts         # fetch con token
        ├── auth.tsx       # contexto de sesión
        ├── toast.tsx      # notificaciones
        ├── components/    # Navbar, CalendarioMes, UI
        └── pages/         # Home, Reservar, MisTurnos, Admin, …
```

## API

| Método | Ruta                                | Accesibilidad | Descripción |
| ------ | ----------------------------------- | ------------- | ----------- |
| POST   | `/api/auth/registro`                | público       | Crear cuenta músico |
| POST   | `/api/auth/login`                   | público       | Login → token JWT |
| GET    | `/api/auth/me`                      | sesión        | Usuario actual |
| GET    | `/api/auth/perfil`                  | sesión        | Perfil completo + bandas |
| PUT    | `/api/auth/perfil`                  | sesión        | Actualizar nombre, teléfono, bio o foto |
| PUT    | `/api/auth/bandas`                  | sesión        | Reemplazar la lista de bandas |
| GET    | `/api/salas`                        | público       | Salas activas + disponibilidad |
| GET    | `/api/salas/:id`                    | público       | Detalle de sala |
| POST   | `/api/salas`                        | admin         | Crear sala |
| PUT    | `/api/salas/:id`                    | admin         | Editar sala |
| DELETE | `/api/salas/:id`                    | admin         | Baja lógica |
| PUT    | `/api/salas/:id/disponibilidad`     | admin         | Reemplazar horarios semanales |
| GET    | `/api/turnos?fecha=AAAA-MM-DD&sala_id=` | sesión opcional | Grilla de turnos del día |
| GET    | `/api/reservas?scope=mias\|todas&…` | sesión        | Listado (admin puede ver todas) |
| POST   | `/api/reservas`                     | sesión        | Reservar turno (elegís duración: 120/180/240 min) |
| DELETE | `/api/reservas/:id`                 | dueño/admin   | Cancelar reserva |

Variables de entorno (opcionales): `PORT` (3001), `JWT_SECRET`, `TZ`
(por defecto `America/Argentina/Buenos_Aires`), `PLAYR_DATA_DIR`.

## Despliegue (Render — gratis, sin tarjeta)

El servicio único de Express sirve la API **y** el build del frontend (via `render.yaml`):

1. Abrí el botón: **[Deploy to Render](https://render.com/deploy?repo=https://github.com/PaulGonzalez-dev/Appsalas)**
2. Conectá tu cuenta de GitHub y elegí el repo `PaulGonzalez-dev/Appsalas`
3. Render lee el blueprint (`render.yaml`), crea el servicio y lo levanta
4. Tu app queda en `https://appsalas-xxxx.onrender.com`

Detalles del blueprint:

- **Build**: `npm install && npm run build` · **Start**: `npm start` (siembra datos demo si la DB está vacía y arranca la API)
- `JWT_SECRET` se genera automáticamente; `healthCheckPath: /api/salud`
- ⚠️ El plan gratuito **no tiene disco persistente**: la base SQLite se regenera con
  datos de demo en cada deploy. Para producción real, agregá un disco (plan pago)
  o migrá a Postgres — las instrucciones están comentadas en `render.yaml`

## Roadmap

- [ ] Notificaciones por email al confirmar/cancelar
- [ ] Pagos online (MercadoPago)
- [ ] Reservas recurrentes / mensuales
- [ ] Múltiples sedes
- [ ] Reportes de ocupación e ingresos

---

## 📱 App Android (Capacitor)

Playr se empaqueta como app de Android con [Capacitor](https://capacitorjs.com) (`android/`,
proyecto nativo generado a partir del build web). No hay reescritura: la misma app React
corre dentro del WebView nativo con acceso a GPS y pantalla completa (sin barra del navegador).

### Generar el APK

El workflow **`.github/workflows/android.yml`** construye el APK en cada push a `main`
(o manualmente desde *Actions → Android APK → Run workflow*):

1. **Descargar:** GitHub → pestaña **Actions** → último run → artifact **`Playr-debug`** → `app-debug.apk`.
2. **Instalar en el celular:** copiar el APK y abrirlo (Android pide permitir instalación de orígenes desconocidos).

La app se conecta a la API indicada en `VITE_API_URL` (por defecto `https://appsalas.onrender.com`,
el servicio del `render.yaml`). En el build de web local usa rutas relativas (proxy de Vite).

### Configuración nativa

- `capacitor.config.ts` — appId `com.playr.app`, nombre **Playr**, webDir `client/dist`.
- `assets/logo.png` (1024×1024) — fuente de iconos e splash (`npx @capacitor/assets generate --android`).
- Permisos: `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` (ubicación vía
  `@capacitor/geolocation` con pedido de permiso en runtime; en web sigue siendo la API estándar).
