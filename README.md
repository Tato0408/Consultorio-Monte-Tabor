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

##  Autores


| Autor | GitHub |
|-------|--------|
| Nombre 1 | [@DanielaVillalta](https://github.com/DanielaVillalta) |
| Nombre 2 | [@fvp1233](https://github.com/fvp1233) |
| Nombre 3 | [@20230301pl](https://https://github.com/20230301ok) |
| Nombre 4 | [@GabrielaMena018](https://github.com/GabrielaMena018) |
| Nombre 5 | [@Tato0408](https://github.com/Tato0408) |

---

##  Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express |
| **Base de datos** | MongoDB |

---

##  Arquitectura del Proyecto

El proyecto está dividido en dos grandes carpetas raíz:

```
clinicaMonteTabor/
├── frontEnd/               # Aplicación web (Screaming Architecture)
│   └── MonteTabor/
│       ├── public/
│       └── src/
│           ├── assets/
│           ├── global/
│           │   ├── components/
│           │   ├── data/
│           │   └── lib/
│           └── modules/    # Módulos por dominio (Screaming Architecture)
│               ├── schedule/
│               ├── users/
│               ├── home/
│               ├── login/
│               ├── reports/
│               ├── procedures/
│               ├── inventory/
│               ├── system/
└── backend/                # API REST (Node.js + Express + MongoDB)
```


> **Nota:** El frontend sigue el patrón de **Screaming Architecture**, donde la estructura de carpetas refleja directamente los módulos del negocio, haciendo que el proyecto "grite" su propósito desde la organización de archivos.

---

##  Ejecución del Proyecto

###  Backend

**1. Navega a la carpeta del backend:**
```bash
cd clinicaMonteTabor/backend
```

**2. Instala las dependencias:**
```bash
npm install
```

**3. Configura las variables de entorno:**

Renombra el archivo `.env.example` a `.env` y completa los valores con tu información:


| Variable | Descripción |
|----------|-------------|
| `FRONTEND_URL` | URL donde corre el frontend (ej. `http://localhost:5173`) |
| `DATABASE_URL` | URL de conexión a tu base de datos MongoDB |
| `JWT_SECRET` | Clave secreta para la firma de tokens JWT |
| `USER_EMAIL` | Correo electrónico usado para el envío de notificaciones |
| `USER_PASS` | Contraseña de aplicación generada desde tu cuenta de Google |

**4. Ejecuta el servidor:**
```bash
npm run dev
```

---

###  Frontend

**1. Navega a la carpeta del frontend:**
```bash
cd clinicaMonteTabor/frontEnd
```

**2. Instala las dependencias:**
```bash
npm install
```

**3. Ejecuta la aplicación:**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` por defecto.

---
