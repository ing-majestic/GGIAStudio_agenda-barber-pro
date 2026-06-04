# Agenda Barber Pro

Sistema de gestión operativa de citas para barberos independientes. Diseño dark premium mobile-first, backend Node.js + Express + SQLite, plantillas de WhatsApp manuales.

---

## Stack

| Capa       | Tecnología                         |
|------------|------------------------------------|
| Frontend   | React 19 + Vite + Tailwind CSS v4  |
| Animaciones| Motion (Framer Motion)              |
| Backend    | Node.js + Express 4                |
| Base datos | SQLite via `better-sqlite3`         |
| Runtime TS | `tsx` (sin compilación previa)      |
| Icons      | Lucide React                        |

---

## Características MVP v1.0

- **Agenda diaria** con vista 7 días
- **Motor de disponibilidad** — slots cada 15 min, detecta buffer entre citas
- **Clientes** — registro, búsqueda, marcado como frecuente / no-show
- **Servicios** — CRUD completo con duración, precio y buffer configurable  
- **Bloqueos de tiempo** — comidas, descansos, tiempo personal
- **Sobrecupos** — modal de decisión con 3 opciones cuando hay empalme  
- **Plantillas WhatsApp** — confirmación, recordatorio, reagendar, cancelación  
- **Configuración de negocio** — nombre, horario, días laborales  
- **API REST** completa con validaciones de horario y colisiones en backend  
- **Modo offline** — fallback a localStorage cuando el API no responde  

---

## Inicio rápido (local)

### Prerrequisitos

- Node.js 18+
- En Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) para compilar `better-sqlite3`
- En Linux/Mac/Replit: Python 3 + GCC (incluidos por defecto)

```bash
npm install
npm run dev
```

Esto levanta:
- Frontend Vite en `http://localhost:3000`
- API Express en `http://localhost:3001`

El proxy de Vite redirige `/api` automáticamente al backend.

---

## Scripts

| Comando         | Descripción                                      |
|-----------------|--------------------------------------------------|
| `npm run dev`   | Modo desarrollo: Vite + Express en paralelo      |
| `npm run build` | Compila el frontend a `dist/`                    |
| `npm start`     | Producción: Express sirve `dist/` + `/api`       |
| `npm run lint`  | TypeScript check (frontend + server)             |

---

## API Endpoints

```
GET    /api/health
GET    /api/services
POST   /api/services
PUT    /api/services/:id
DELETE /api/services/:id

GET    /api/clients
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id

GET    /api/appointments?date=YYYY-MM-DD&status=Confirmada
POST   /api/appointments
PUT    /api/appointments/:id
DELETE /api/appointments/:id

GET    /api/blocked-times?date=YYYY-MM-DD
POST   /api/blocked-times
DELETE /api/blocked-times/:id

GET    /api/settings
PUT    /api/settings
```

### Validaciones de backend

- **422 OUTSIDE_HOURS** — cita fuera de horario laboral o en día cerrado  
- **409 COLLISION** — empalme con otra cita o bloqueo (con detalle del conflicto)  
- `isOverbooked: true` en POST/PUT omite el check de colisión (decisión explícita del usuario)

---

## Variables de entorno

Copia `.env.example` a `.env` y ajusta:

```bash
cp .env.example .env
```

| Variable   | Default            | Descripción                        |
|------------|--------------------|------------------------------------|
| `PORT`     | `3001` / `5000`    | Puerto del servidor Express        |
| `NODE_ENV` | `development`      | `production` para servir el build  |
| `DB_PATH`  | `./data/barber.db` | Ruta del archivo SQLite            |

---

## Deploy en Replit

### Pasos

1. Crea un nuevo Repl de tipo **Node.js** o importa desde GitHub
2. Abre **Shell** y ejecuta:

```bash
npm install
npm run build
```

3. Configura en **Secrets** de Replit:
   - `NODE_ENV=production`
   - `PORT=5000`

4. En `.replit`, verifica que el comando `run` sea `npm start`
5. Haz clic en **Run** — Replit expondrá el puerto 5000 como URL pública

### Persistencia de datos

- SQLite escribe en `./data/barber.db`  
- En **Replit Free** el filesystem se resetea al pausar el Repl  
- En **Replit Pro** el filesystem persiste indefinidamente  
- Para persistencia garantizada en Free: conecta Neon/Supabase y configura `DATABASE_URL` (requiere migración a driver `pg` — pendiente en v1.1)

---

## Estructura del proyecto

```
├── server/
│   ├── index.ts          # Entry point Express
│   ├── db.ts             # SQLite setup + migraciones
│   ├── seed.ts           # Datos demo iniciales
│   └── routes/
│       ├── appointments.ts
│       ├── blocked_times.ts
│       ├── clients.ts
│       ├── services.ts
│       └── settings.ts
├── src/
│   ├── components/       # UI React
│   ├── context/          # AppContext (estado global + API)
│   ├── lib/
│   │   ├── api-client.ts          # Fetch wrapper para el backend
│   │   ├── availability-engine.ts # Motor de slots y colisiones
│   │   ├── date-utils.ts          # Utilidades de fecha (México/CDMX)
│   │   ├── mock-repository.ts     # localStorage cache + fallback
│   │   └── whatsapp-templates.ts  # Plantillas manuales
│   └── types/index.ts    # Tipos TypeScript compartidos
├── data/                 # SQLite database (generado automáticamente)
├── dist/                 # Build frontend (generado por vite build)
└── .env.example          # Variables de entorno documentadas
```

---

## Decisión técnica: SQLite vs PostgreSQL

Se eligió **SQLite con `better-sqlite3`** para el MVP porque:

1. **Cero dependencias externas** — no requiere `DATABASE_URL`, credenciales ni servicio separado
2. **API síncrona** — se integra limpiamente con Express sin async adicional
3. **Escalabilidad suficiente** — para 1 barbero con ~50 citas/día, SQLite excede los requisitos
4. **`shopId` en todas las tablas** — la migración a multi-tenant y PostgreSQL es no-disruptiva

---

## Pendientes v1.1

- [ ] Autenticación (JWT / sesión) para proteger la API
- [ ] Soporte PostgreSQL con `DATABASE_URL`
- [ ] Módulo de reportes (ingresos por día/semana/mes)
- [ ] Búsqueda de clientes con fuzzy matching
- [ ] Notificaciones push (service worker)
- [ ] Multi-barbero / multi-tienda (shopId ya está en el schema)
- [ ] Tests unitarios del motor de disponibilidad
- [ ] CI/CD GitHub Actions → Replit deploy

---

## Licencia

MIT

