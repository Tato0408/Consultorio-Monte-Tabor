# Sistema de Gestión Médica — Clínica Monte Tabor

> Sistema integral para la gestión de citas médicas e historiales clínicos de la **Clínica Monte Tabor**, diseñado para optimizar la atención al paciente y facilitar la administración interna.

---

## Descripción

Este proyecto tiene como propósito principal digitalizar y organizar los procesos internos de la Clínica Monte Tabor. Está enfocado en la **gestión de citas médicas** e **historiales clínicos**, agilizando la atención a los pacientes y manteniendo un orden administrativo eficiente, con horarios flexibles tanto para doctores como para pacientes.

La solución se divide en dos grandes módulos:

- **Sitio Privado (Panel Administrativo):** Plataforma web de uso interno con control y gestión de 5 módulos principales:
  - **Horarios** — Administración de disponibilidad de doctores y asignación de turnos.
  - **Usuarios** — Gestión de roles: doctores, enfermeras, pacientes y recepcionistas.
  - **Reportes** — Generación de informes administrativos y estadísticas clínicas.
  - **Procedimientos** — Registro de procedimientos médicos, incluyendo casos menores como uñas encarnadas.
  - **Inventario** — Control del stock de insumos y medicamentos.
  - **Sistema (Mi Perfil)** — Configuración y gestión del perfil del usuario autenticado.

- **Aplicación Móvil:** Herramienta orientada al paciente que permite:
  - Agendar citas con horarios flexibles según la disponibilidad de los doctores.
  - Consultar información personal y acceder al historial médico propio.

---

## Autores

| Autor | GitHub |
|-------|--------|
| Nombre 1 | [@DanielaVillalta](https://github.com/DanielaVillalta) |
| Nombre 2 | [@fvp1233](https://github.com/fvp1233) |
| Nombre 3 | [@20230301ok](https://github.com/20230301ok) |
| Nombre 4 | [@GabrielaMena018](https://github.com/GabrielaMena018) |
| Nombre 5 | [@Tato0408](https://github.com/Tato0408) |

---

## Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express |
| **Base de datos** | MongoDB |

---

## Arquitectura del Proyecto

El proyecto está dividido en dos grandes carpetas raíz:
```
clinicaMonteTabor/  
├── frontEnd/ # Aplicación web (Screaming Architecture)  
│ └── MonteTabor/  
│ ├── public/  
│ └── src/  
│ ├── assets/  
│ ├── global/  
│ │ ├── components/  
│ │ ├── data/  
│ │ └── lib/  
│ └── modules/ # Módulos por dominio (Screaming Architecture)  
│ ├── schedule/  
│ ├── users/  
│ ├── home/  
│ ├── login/  
│ ├── reports/  
│ ├── procedures/  
│ ├── inventory/  
│ └── system/  
└── backend/ # API REST (Node.js + Express + MongoDB)  
├── src/  
│ ├── middlewares/ # Middlewares de protección (Autenticación y Cookies)  
│ └── routes/ # Rutas y controladores segmentados por entidad  
│ ├── admin/  
│ ├── appointments/  
│ ├── auth/  
│ ├── dashboard/  
│ ├── doctors/  
│ ├── inventory/  
│ ├── login/  
│ ├── nurse/  
│ ├── nurse_notes/  
│ ├── patients/  
│ ├── procedures/  
│ ├── receptionist/  
│ └── schedule/  
└── app.js # Configuración del servidor Express, CORS y Middlewares
```

> **Nota:** El frontend sigue el patrón de **Screaming Architecture**, donde la estructura de carpetas refleja directamente los módulos del negocio, haciendo que el proyecto "grite" su propósito desde la organización de archivos.
---
##  Endpoints de la API
La API REST cuenta con un sistema de protección de rutas basado en cookies de sesión a través del middleware `validateAuthCookie`, segmentando los accesos públicos y privados según el rol del usuario asignado.
### Endpoints Públicos (Acceso Abierto)
Rutas destinadas a la autenticación inicial, registro primario y flujos de recuperación de cuentas:
- `/api/auth` — Servicios base de autenticación.
- `/api/registerAdmin` — Registro inicial del rol administrador.
- `/api/loginCommonRole` — Login centralizado para el personal interno de la clínica.
- `/api/loginPatient` — Login exclusivo para el acceso de pacientes.
- `/api/recoveryDoctor` — Recuperación de contraseña para cuentas de doctores.
- `/api/recoveryAdminPassword` — Recuperación de contraseña para cuentas de administradores.
- `/api/recoveryReceptionist` — Recuperación de contraseña para cuentas de recepcionistas.
### Endpoints Privados (Control de Acceso)
Rutas protegidas que validan las credenciales y restringen la ejecución según el arreglo de roles autorizados:
| Prefijo de Ruta | Roles Permitidos (`validateAuthCookie`) | Descripción |
|-----------------|-----------------------------------------|-------------|
| `/api/registerDoctors` | `admin` | Registro de nuevos médicos en el sistema. |
| `/api/registerRecepcionist` | `admin` | Registro de nuevo personal de recepción. |
| `/api/inventory` | `admin` | Gestión y control del stock de insumos y medicamentos. |
| `/api/dashboard` | `admin` | Estadísticas generales y métricas globales de la clínica. |
| `/api/doctor-dashboard` | `doctor` | Panel de control personalizado con métricas del médico actual. |
| `/api/consultations` | `admin`, `doctor` | Creación y consulta de historiales clínicos y hojas de evolución. |
| `/api/procedures` | `admin`, `doctor` | Gestión y registro de procedimientos médicos menores realizados. |
| `/api/schedule` | `admin`, `doctor` | Configuración de la disponibilidad horaria y turnos médicos. |
| `/api/patients` | `admin`, `doctor`, `receptionist` | Visualización y listado del catálogo de pacientes. |
| `/api/appointments` | `admin`, `doctor`, `receptionist` | Creación, cancelación y control del estado de las citas médicas. |
| `/api/nurses` | `admin`, `doctor`, `receptionist` | Administración y consulta de perfiles del equipo de enfermería. |
| `/api/logout` | *(Cualquier usuario autenticado)* | Destrucción de la cookie de sesión y cierre seguro. |
| `/api/nurse_notes` | *(Manejo interno)* | Registro de anotaciones de enfermería y signos vitales previos. |
---
## Ejecución del Proyecto
### Backend
**1. Navega a la carpeta del backend:**
```bash
cd clinicaMonteTabor/backend
```
**2. Instala las dependencias:**
```bash
npm install
```

**3. Configura las variables de entorno**
```bash
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `FRONTEND_URL` | URL donde corre el frontend | `http://localhost:5173` |
| `DATABASE_URL` | URL de conexión a tu base de datos MongoDB | `mongodb://localhost:27017/clinicaMonteTabor` |
| `JWT_SECRET` | Clave secreta para la firma de tokens JWT | `tu_clave_secreta_jwt_muy_segura_123` |
| `USER_EMAIL` | Correo electrónico usado para el envío de notificaciones | `clinica.montetabor@gmail.com` |
| `USER_PASS` | Contraseña de aplicación generada desde tu cuenta de Google | `abcd1234efgh5678` |
| `CLOUDINARY_CLOUD_NAME` | Nombre de la sala/cloud en Cloudinary para el almacenamiento de imágenes | `montetabor` |
| `CLOUDINARY_API_KEY` | Clave API provista por Cloudinary | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Clave secreta de la API de Cloudinary | `abcdefghijklmnopqrstuvwxyz123456` |
| `PORT` | (Opcional) Puerto donde correrá el servidor backend | `5000` |
| `NODE_ENV` | (Opcional) Entorno de ejecución | `development` |
```

**4. Ejecuta el servidor:**
```bash
npm run dev
```

### Frontend
**1.**Navega a la carpeta del frontend:****
```bash
cd clinicaMonteTabor/frontEnd/MonteTabor
```

**2. Instala las dependencias:**
```bash
npm install
```
**3. Ejecuta la aplicación:**
```bash
npm run dev
```
```bash
La aplicación estará disponible en `http://localhost:5173` por defecto.
```
Este proyecto es de uso privado para la Clínica Monte Tabor. Todos los derechos reservados.