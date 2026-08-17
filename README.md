# Sistema de Gestión Médica — Clínica Monte Tabor

> Sistema integral para la gestión de citas médicas e historiales clínicos de la **Clínica Monte Tabor**, diseñado para optimizar la atención al paciente y facilitar la administración interna.

---

## Contenido

- [Descripción](#descripción)
- [Autores](#autores)
- [Diseño](#diseño)
- [Stack Tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Librerías principales y su función](#librerías-principales-y-su-función)
- [Convenciones de nomenclatura](#convenciones-de-nomenclatura)
- [Endpoints de la API](#endpoints-de-la-api)
- [Variables de entorno](#variables-de-entorno)
- [Ejecución del Proyecto](#ejecución-del-proyecto)
- [Solución de problemas comunes](#solución-de-problemas-comunes)

---

## Descripción

Este proyecto tiene como propósito principal digitalizar y organizar los procesos internos de la Clínica Monte Tabor. Está enfocado en la **gestión de citas médicas** e **historiales clínicos**, agilizando la atención a los pacientes y manteniendo un orden administrativo eficiente, con horarios flexibles tanto para doctores como para pacientes.

La solución se divide en **tres partes**, todas contra la misma API REST:

- **Panel Privado (uso interno):** plataforma web para el personal de la clínica, con control y gestión de los módulos:
  - **Horarios** — Administración de disponibilidad de doctores/enfermeras y asignación de turnos.
  - **Usuarios** — Gestión de roles: doctores, enfermeras, pacientes y recepcionistas.
  - **Reportes** — Generación de informes administrativos y estadísticas clínicas.
  - **Procedimientos** — Registro de procedimientos médicos, incluyendo casos menores.
  - **Inventario** — Control del stock de insumos y medicamentos.
  - **Sistema (Mi Perfil / Roles y permisos)** — Configuración del usuario autenticado y control de accesos.

- **Sitio Público (portal del paciente — web):** acceso abierto para que cualquier paciente:
  - Cree su cuenta y agende una cita (consulta general o procedimiento), eligiendo doctor y horario según disponibilidad real.
  - Pague en línea el anticipo de su cita (integración con **Wompi El Salvador**, modo de prueba) o elija pagar en recepción.
  - Consulte sus citas, recetas, incapacidades, referencias médicas y medicamentos activos.

- **Aplicación Móvil (Expo / React Native):** herramienta orientada al paciente, con autoservicio de su perfil y expediente:
  - Registro y perfil propio, cambio de contraseña.
  - Expediente clínico de autoservicio: tipo de sangre, alergias, antecedentes, estilo de vida.
  - Consulta de citas y medicamentos.

---

## Autores

| # | Cargo | Autor | GitHub |
|---|-------|-------|--------|
| 1 | Coordinador | Fernando Miguel Velásquez Pérez | [@fvp1233](https://github.com/fvp1233) |
| 2 | Subcoordinadora | Gabriela Isabel Castillo Mena | [@GabrielaMena018](https://github.com/GabrielaMena018) |
| 3 | Secretaria | Natalie Abigail Navarro Gochez | [@20230301ok](https://github.com/20230301ok) |
| 4 | Tesorera | Daniela Elizabeth Villalta Sorto | [@DanielaVillalta](https://github.com/DanielaVillalta) |
| 5 | Vocal | Freddy Ricardo Pérez Alvarenga | [@Tato0408](https://github.com/Tato0408) |

---

## Diseño

| Recurso | Enlace |
|---------|--------|
| Figma (UI/UX) | _agregar enlace_ |

---

## Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Backend** | Node.js, Express 5, MongoDB (Mongoose), JWT, Cloudinary, Nodemailer/Mailjet |
| **Panel privado (web)** | React 19, React Router, Tailwind CSS 4, shadcn/ui + Radix, Recharts |
| **Sitio público (web)** | React 19, React Router, Tailwind CSS 4, shadcn/ui + Radix, Wompi (pagos) |
| **App móvil** | React Native 0.81 (Expo 54), React Navigation |

---

## Requisitos previos

| Herramienta | Para qué |
|---|---|
| Node.js 18+ (LTS recomendado) y npm | Backend y ambos frontends (React + Vite) |
| MongoDB (local o un clúster de Atlas) | Base de datos del backend |
| Cuenta de Cloudinary, Mailjet/Gmail y Wompi (modo de prueba) | Solo si vas a probar imágenes, correos o pagos en línea — ver [Variables de entorno](#variables-de-entorno) |
| App **Expo Go** (Android/iOS), o Android Studio / Xcode | Correr la app móvil en un dispositivo físico o en un emulador |

---

## Arquitectura del Proyecto

```
Clinica-Monte-Tabor/
├── backend/                            # API REST (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── controllers/                # Lógica de negocio, un archivo por dominio
│   │   ├── models/                     # Esquemas de Mongoose
│   │   ├── routes/                     # Definición de endpoints, un archivo por dominio
│   │   ├── middlewares/                # authenticate, authorize, validateAuthCookie
│   │   ├── services/                   # Cache de roles/permisos, etc.
│   │   └── utils/                      # Validadores, Cloudinary, Wompi, plantillas de correo
│   ├── app.js                          # Middlewares, CORS y montaje de rutas
│   ├── index.js                        # Punto de entrada (levanta el servidor en :4000)
│   ├── database.js                     # Conexión a MongoDB (Mongoose)
│   └── config.js                       # Lectura centralizada de variables de entorno
│
├── frontend/
│   ├── clinica-monteTabor/             # Panel privado: admin, doctor, enfermera, recepcionista
│   │   └── src/
│   │       ├── components/             # layouts/ (Sidebar, MainLayout) y ui/ (primitivas)
│   │       ├── modules/                # Un folder por dominio de negocio (Screaming Architecture)
│   │       │   ├── home/               # Dashboards por rol
│   │       │   ├── schedule/           # Horarios, citas y consultas
│   │       │   ├── patients/ doctors/ nurses/ receptionist/
│   │       │   ├── inventory/ procedures/ reports/ roles/ ...
│   │       ├── services/               # Llamadas a la API, una por dominio
│   │       └── context/                # AuthContext (sesión + permisos)
│   │
│   └── Clinica-monteTabor-publica/     # Portal público del paciente (web)
│       └── src/
│           ├── modules/                # home, login, appointments, dashboard, records, ...
│           ├── services/                # patientPortalService, wompiService, appointmentsService
│           ├── lib/                    # apiClient, alerts (notificaciones/confirmaciones), paymentValidators
│           └── context/                # AuthContext (sesión del paciente)
│
└── mobile/
    └── clinica-MonteTabor/             # App móvil del paciente (Expo / React Native)
        └── src/
            ├── screens/                 # Una pantalla por vista (login/, medication/, profile/, ...)
            ├── components/              # Componentes reutilizables por sección
            ├── hooks/                   # Lógica de datos (useMyConsultations, useRecoveryPatient, ...)
            ├── context/                 # AuthContext
            ├── config/                  # api.js — resuelve la URL del backend automáticamente
            ├── lib/                     # apiClient, toast
            └── styles/                  # Estilos por pantalla (StyleSheet de React Native)
```

> **Nota:** el frontend sigue el patrón de **Screaming Architecture**: la estructura de carpetas refleja directamente los módulos del negocio (`modules/<dominio>/{pages,components,hooks}`), no capas técnicas — el proyecto "grita" su propósito desde la organización de archivos.

---

## Librerías principales y su función

### Backend

| Librería | Uso |
|----------|-----|
| `express` | Servidor HTTP y enrutamiento de la API |
| `mongoose` | ODM para modelar y consultar MongoDB |
| `jsonwebtoken` | Firma y verificación del token de sesión (JWT en cookie) |
| `bcryptjs` | Hash y verificación de contraseñas |
| `cookie-parser` | Lectura de la cookie de sesión en cada request |
| `cors` | Habilita peticiones cross-origin desde los frontends |
| `dotenv` | Carga las variables de entorno desde `.env` |
| `multer` + `multer-storage-cloudinary` | Recepción de archivos (imágenes) desde formularios |
| `cloudinary` | Almacenamiento y entrega de imágenes (fotos de perfil, etc.) |
| `nodemailer` / `node-mailjet` | Envío de correos (verificación de cuenta, recuperación de contraseña) |
| `swagger-ui-express` | Documentación interactiva de la API, disponible en `/api/docs` |
| `nodemon` _(dev)_ | Reinicio automático del servidor al guardar cambios |

### Panel privado (`frontend/clinica-monteTabor`)

| Librería | Uso |
|----------|-----|
| `react` / `react-dom` | Librería base de UI |
| `react-router-dom` | Ruteo de la SPA |
| `react-hook-form` | Manejo y validación de formularios |
| `tailwindcss` + `@tailwindcss/vite` | Estilado utilitario |
| `shadcn`, `@base-ui/react`, `class-variance-authority`, `tailwind-merge`, `clsx` | Sistema de componentes UI accesibles (base de shadcn/ui) |
| `lucide-react` | Íconos |
| `recharts` | Gráficos del dashboard y reportes |
| `react-day-picker` / `react-calendar` | Selectores de fecha y calendario de citas |
| `react-hot-toast` | Notificaciones tipo toast |
| `sweetalert2` | Confirmaciones para acciones destructivas (eliminar, cancelar) |
| `@react-pdf/renderer` | Generación de reportes descargables en PDF |
| `date-fns` | Utilidades de fecha |
| `eslint` _(dev)_ | Linter |

### Sitio público (`frontend/Clinica-monteTabor-publica`)

| Librería | Uso |
|----------|-----|
| `react` / `react-dom`, `react-router-dom` | Base de UI y ruteo |
| `tailwindcss` + `@tailwindcss/vite` | Estilado utilitario |
| `radix-ui`, `shadcn`, `class-variance-authority`, `tailwind-merge`, `clsx` | Componentes UI (Modal, InputField, etc.) |
| `lucide-react` | Íconos |
| `react-day-picker` | Selector de fecha del asistente de "Agendar cita" |
| `react-hot-toast` | Notificaciones y confirmaciones (reemplaza los diálogos nativos del navegador) |
| `date-fns` | Utilidades de fecha |
| `oxlint` _(dev)_ | Linter |

> El pago en línea (Wompi) **no usa un SDK**: el formulario de tarjeta vive en la propia página y llama, vía el backend, directamente a la API REST de Wompi (tokenizar tarjeta + cobrar) — así la tarjeta nunca se guarda en el sistema.

### App móvil (`mobile/clinica-MonteTabor`)

| Librería | Uso |
|----------|-----|
| `expo` | Toolchain y runtime de React Native |
| `react-native` | Motor de la app nativa |
| `@react-navigation/native` + `@react-navigation/native-stack` | Navegación entre pantallas |
| `expo-secure-store` | Almacenamiento seguro del token de sesión en el dispositivo |
| `expo-image-picker` | Selección de fotos (ej. foto de perfil) |
| `expo-constants` | Lectura de configuración de Expo (usado para resolver automáticamente la URL del backend) |
| `@react-native-community/datetimepicker` | Selector nativo de fecha/hora |
| `react-native-svg` | Íconos e ilustraciones vectoriales |
| `react-native-toast-message` | Notificaciones tipo toast |
| `react-native-safe-area-context` + `react-native-screens` | Soporte nativo de navegación (safe areas, transiciones) |

---

## Convenciones de nomenclatura

- **Backend** — funciones y variables en `camelCase` (`getMyAppointments`); modelos de Mongoose registrados en `PascalCase` (`model("Appointments", ...)`) pero importados como `camelCase` + sufijo `Model` (`appointmentsModel`); campos de documento en `snake_case` (`patient_id`, `start_time`) en las tres bases de datos.
- **Rutas REST** — en `kebab-case` cuando tienen más de una palabra (`/api/nurse-schedule`, `/api/patient-portal`), sustantivo en plural para colecciones (`/api/doctors`, `/api/appointments`).
- **Frontend (web y móvil)** — componentes de React en `PascalCase`, un archivo por componente (`AppointmentCard.jsx`); hooks en `camelCase` con prefijo `use` (`useSchedule`, `useMyConsultations`); servicios de API en `camelCase` con sufijo `Service` (`patientPortalService.js`); carpetas de módulo en minúsculas siguiendo Screaming Architecture (`modules/<dominio>/{pages,components,hooks}`).
- **Variables de entorno** — en `MAYÚSCULAS_CON_GUION_BAJO`.
- **Comentarios de código** — en español, explicando el _por qué_ (una decisión de diseño, un bug evitado, una restricción del negocio), no el _qué_ (el código ya lo dice por sí solo).

---

## Endpoints de la API

La API cuenta con un sistema de protección de rutas basado en **cookies de sesión** (`validateAuthCookie` / `authenticate` + `authorize`), que segmenta los accesos según el rol del usuario. A continuación, los más relevantes agrupados por quién los consume:

### 1. Panel privado (staff: admin, doctor, enfermera, recepcionista)

**Autenticación**
- `/api/auth`, `/api/registerAdmin`, `/api/loginCommonRole`, `/api/loginDoctors`, `/api/logout`
- `/api/recoveryDoctor`, `/api/recoveryAdminPassword`, `/api/recoveryReceptionist`, `/api/recoveryNursePassword`

**Gestión y operación**
| Prefijo de ruta | Roles típicos | Descripción |
|---|---|---|
| `/api/registerDoctors`, `/api/doctors` | `admin` | Alta y catálogo de doctores |
| `/api/registerRecepcionist`, `/api/recepcionist` | `admin` | Alta y catálogo de recepcionistas |
| `/api/nurses` | `admin` | Catálogo de enfermería |
| `/api/patients` | `admin`, `doctor`, `receptionist` | Catálogo de pacientes (gestión por staff) |
| `/api/appointments`, `/api/appointment-types` | `admin`, `doctor`, `receptionist` | Creación, cancelación y catálogo de tipos de cita |
| `/api/consultations` | `admin`, `doctor` | Consultas médicas, prescripciones y expediente clínico |
| `/api/procedures`, `/api/treatments` | `admin`, `doctor` | Procedimientos médicos y tratamientos |
| `/api/schedule`, `/api/nurse-schedule` | `admin`, `doctor`, `nurse` | Disponibilidad horaria, descansos y excepciones |
| `/api/inventory` | `admin` | Stock de insumos y medicamentos |
| `/api/sick-leaves` | `admin`, `doctor` | Incapacidades médicas |
| `/api/dashboard`, `/api/doctor-dashboard`, `/api/nurse-dashboard`, `/api/receptionist-dashboard` | según rol | Estadísticas y métricas por panel |
| `/api/reports` | `admin` | Reportes administrativos |
| `/api/roles`, `/api/permissions` | `admin` | Roles y matriz de permisos del sistema |
| `/api/notifications` | *(staff autenticado)* | Notificaciones internas |
| `/api/nurse_notes` | *(manejo interno)* | Anotaciones de enfermería y signos vitales previos |

### 2. Sitio público (portal del paciente — web)

- `/api/loginPatient`, `/api/registerPatient` _(con verificación por correo)_, `/api/recoveryPatientPassword`
- `/api/patient-portal/*` _(requiere sesión de paciente)_:
  - `GET /doctors`, `GET /procedures`, `GET /schedule/:doctorId/slots` — catálogo para agendar
  - `GET /appointments`, `POST /appointments`, `PATCH /appointments/:id/cancel` — mis citas
  - `POST /appointments/:id/confirm-payment` — confirma (contra la propia API de Wompi) el anticipo pagado en línea
  - `GET /dashboard` — resumen del panel del paciente
  - `GET /prescriptions`, `GET /sick-leaves`, `GET /referrals` — recetas, incapacidades y referencias
  - `GET /medications/today`, `PATCH /medications/:id/taken` — medicamentos activos y su registro de tomado
- `/api/wompi/*` _(requiere sesión de paciente)_ — `POST /token`, `/tokenizar`, `/paymentTest`, `/payment3DS`: proxy hacia la API real de Wompi para tokenizar la tarjeta y cobrar el anticipo
- `/api/webhooks/wompi` _(público, verificado por firma HMAC)_ — notificación asíncrona de Wompi

### 3. App móvil (autoservicio del paciente)

- `POST /api/patientAccount/register` — registro instantáneo (sin verificación por correo, deja la sesión iniciada de una vez)
- `GET /api/patientAccount/me`, `PUT /api/patientAccount/me` — perfil propio
- `PUT /api/patientAccount/changePassword` — cambio de contraseña con sesión activa
- `PUT /api/patientAccount/me/blood-type`, `PUT /api/patientAccount/me/lifestyle` — tipo de sangre y estilo de vida
- `POST`/`DELETE /api/patientAccount/me/hereditary(/:entryId)` — antecedentes familiares
- `POST`/`DELETE /api/patientAccount/me/pathological(/:entryId)` — enfermedades crónicas / diagnósticos

Documentación interactiva completa (Swagger): `http://localhost:4000/api/docs`

---

## Variables de entorno

El backend requiere un archivo `.env` dentro de `/backend` (ya está en `.gitignore`, nunca se sube al repositorio).

| Variable | Obligatoria | Descripción |
|----------|:---:|-------------|
| `DB_URI` | Sí | Cadena de conexión a MongoDB |
| `JWT_secret_key` | Sí | Clave secreta para firmar los tokens de sesión |
| `USER_EMAIL` / `USER_PASSWORD` | Sí | Cuenta de Gmail usada por Nodemailer para enviar correos |
| `API_KEY_MAILJET` / `API_SECRET_MAILJET` | Sí | Credenciales de Mailjet (envío de correos alternativo/transaccional) |
| `MAILJET_FROM_EMAIL` / `MAILJET_FROM_NAME` | Sí | Remitente que verán los correos enviados por Mailjet |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Sí | Credenciales de Cloudinary para el almacenamiento de imágenes |
| `GRANT_TYPE` / `AUDIENCE` / `CLIENT_ID` / `CLIENT_SECRET` | Sí, para pagos | Credenciales OAuth2 de Wompi El Salvador (modo de prueba) usadas por el portal público del paciente |
| `FRONTEND_URL` | No _(default `http://localhost:5173`)_ | URL pública del sitio del paciente, usada para armar el link de retorno tras pagar |
| `BACKEND_PUBLIC_URL` | No _(default `http://localhost:4000`)_ | URL pública de este backend, para que Wompi pueda notificar por webhook |

Plantilla lista para copiar (`backend/.env`):

```env
# ── Base de datos ────────────────────────────────────────────────
DB_URI=mongodb://localhost:27017/clinicaMonteTabor

# ── Autenticación ────────────────────────────────────────────────
JWT_secret_key=una_clave_secreta_larga_y_dificil_de_adivinar

# ── Correo saliente (verificación de cuenta, recuperación) ───────
USER_EMAIL=clinica.montetabor@gmail.com
USER_PASSWORD=contraseña_de_aplicacion_de_gmail
API_KEY_MAILJET=tu_api_key_de_mailjet
API_SECRET_MAILJET=tu_api_secret_de_mailjet
MAILJET_FROM_EMAIL=notificaciones@clinicamontetabor.com
MAILJET_FROM_NAME=Clínica Monte Tabor

# ── Cloudinary (almacenamiento de imágenes) ───────────────────────
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# ── Wompi El Salvador (pagos en línea, modo de prueba) ────────────
GRANT_TYPE=client_credentials
AUDIENCE=https://id.wompi.sv/api
CLIENT_ID=tu_client_id_de_wompi
CLIENT_SECRET=tu_client_secret_de_wompi

# ── URLs públicas (opcional, tienen valor por defecto) ────────────
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:4000
```

> **Nota de compatibilidad:** `JWT_secret_key` debe escribirse exactamente así (mismo uso de mayúsculas/minúsculas que `config.js`). En Windows `process.env` no distingue mayúsculas de minúsculas, pero en Linux/Mac sí — una variable con otra capitalización simplemente se leería como `undefined`.

La app móvil, por separado, puede fijar la URL del backend con `EXPO_PUBLIC_API_URL` (opcional): si no se define, `src/config/api.js` la detecta sola a partir de la IP que expone Metro/Expo (usando `10.0.2.2` dentro del emulador de Android).

---

## Ejecución del Proyecto

### Backend

```bash
cd backend
npm install
npm run dev        # http://localhost:4000, con recarga automática (nodemon)
```

### Panel privado (staff)

```bash
cd frontend/clinica-monteTabor
npm install
npm run dev         # http://localhost:5173
```

### Sitio público (portal del paciente)

```bash
cd frontend/Clinica-monteTabor-publica
npm install
npm run dev         # http://localhost:5173 (o 5174 si el panel privado ya está corriendo ahí)
```

### App móvil

```bash
cd mobile/clinica-MonteTabor
npm install
npx expo start       # abre el menú de Expo: escanea el QR con Expo Go, o presiona "a"/"i" para emulador
```

---

## Solución de problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `Failed to resolve import "react-day-picker"` (o cualquier otra librería) al correr `npm run dev` | La dependencia está en `package.json` pero nunca se instaló en `node_modules` (ej. alguien la agregó y no corrió `npm install`, o el checkout es nuevo) | `npm install` dentro de esa carpeta; si el dev server ya estaba corriendo, reinícialo para que Vite reconstruya su caché (`node_modules/.vite`) |
| El navegador no manda la cookie de sesión / la API responde 401 en cada request | Falta `credentials: "include"` en el `fetch`, o el puerto del frontend no está en la lista `origin` del `cors()` de `app.js` | Revisa `apiClient` del frontend correspondiente y la lista de orígenes permitidos en `backend/app.js` |
| El backend no arranca / `MongooseServerSelectionError` | `DB_URI` mal escrita, o no hay una instancia de MongoDB corriendo (local o Atlas) | Verifica `backend/.env` y que el servicio de MongoDB esté activo / el clúster de Atlas sea alcanzable |
| El pago en línea del portal público falla en `/api/wompi/token` | Faltan `GRANT_TYPE` / `AUDIENCE` / `CLIENT_ID` / `CLIENT_SECRET` en `backend/.env` | Completa las credenciales de Wompi (ver sección [Variables de entorno](#variables-de-entorno)) |
| La app móvil no llega al backend desde un dispositivo físico | El teléfono y la computadora no están en la misma red Wi-Fi | Conéctalos a la misma red — `src/config/api.js` resuelve la IP automáticamente a partir de la sesión de Expo (o fija `EXPO_PUBLIC_API_URL` a mano) |

---

Este proyecto es de uso privado para la Clínica Monte Tabor. Todos los derechos reservados.