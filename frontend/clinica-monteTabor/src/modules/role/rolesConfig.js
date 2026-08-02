import {
  Calendar,
  Clock,
  CalendarCheck,
  Stethoscope,
  Users,
  UserRound,
  Contact,
  HeartPulse,
  Activity,
  FileBarChart,
  FolderClock,
  ClipboardList,
  Package,
  Boxes,
  FlaskConical,
  ArrowLeftRight,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

// Los 4 permisos atómicos que existen para cada módulo del sistema.
// "view" es el permiso base: si se activa create/update/delete, view se activa solo,
// porque no tiene sentido poder crear/editar/borrar algo que no puedes ver.
export const PERMISSION_TYPES = [
  { key: "view", label: "Visualización", short: "Ver" },
  { key: "create", label: "Ingreso", short: "Crear" },
  { key: "update", label: "Actualización", short: "Editar" },
  { key: "delete", label: "Eliminación", short: "Eliminar" },
];

// Estructura agrupada por sección del sidebar -> módulos (sub-links) -> permisos
// Los "key" son los moduleKey reales de la colección roles / menuConfig.js (no inventar otros).
// "dashboard" y "system.roles" quedan fuera de esta pantalla a propósito: su acceso real en el
// backend sigue hardcodeado (no depende de authorize()), así que togglearlos aquí no cambiaría nada.
export const SIDEBAR_MODULES = [
  {
    section: "Calendario",
    icon: Calendar,
    modules: [
      { key: "calendar.schedule", label: "Horarios", icon: Clock },
      { key: "calendar.appointments", label: "Citas", icon: CalendarCheck },
      { key: "calendar.consultations", label: "Consultas", icon: Stethoscope },
    ],
  },
  {
    section: "Usuarios",
    icon: Users,
    modules: [
      { key: "users.doctors", label: "Doctores", icon: UserRound },
      { key: "users.patients", label: "Pacientes", icon: Contact },
      { key: "users.receptionist", label: "Recepcionista", icon: HeartPulse },
      { key: "users.nurses", label: "Enfermeras", icon: Activity },
    ],
  },
  {
    section: "Procedimientos",
    icon: ClipboardList,
    modules: [
      { key: "procedures", label: "Procedimientos", icon: ClipboardList },
    ],
  },
  {
    section: "Reportes",
    icon: FileBarChart,
    modules: [
      { key: "reports.appointments", label: "Citas", icon: CalendarCheck },
      { key: "reports.records", label: "Expediente", icon: FolderClock },
      { key: "reports.patients", label: "Pacientes", icon: Contact },
      { key: "reports.doctors", label: "Doctores", icon: UserRound },
    ],
  },
  {
    section: "Inventario",
    icon: Package,
    modules: [
      { key: "inventory.products", label: "Productos", icon: Boxes },
      { key: "inventory.treatments", label: "Tratamientos", icon: FlaskConical },
      { key: "inventory.movements", label: "Movimientos", icon: ArrowLeftRight },
      { key: "inventory.reports", label: "Reportes de inventario", icon: TrendingUp },
    ],
  },
  // "Sistema" (Mi perfil) no aparece aqui a proposito: editar el propio perfil
  // debe funcionar siempre, para todos los roles, sin ser una opcion gestionable.
];

// Lista plana de todas las claves de módulos, útil para construir el set "todo activado"
export const ALL_MODULE_KEYS = SIDEBAR_MODULES.flatMap((section) =>
  section.modules.map((m) => m.key)
);

// Módulos que en el backend solo tienen una ruta GET (backend/src/routes/reports/reports.js
// solo define .get() para estos cuatro, sin POST/PUT/DELETE) — activar Crear/Editar/Eliminar
// ahí no tendría ningún efecto real, así que ModulePermissionCard oculta esos tres checkboxes
// y deja únicamente "Ver". "reports.records" (Expediente) queda fuera a propósito: sí tiene
// una acción real de creación (registrar incapacidades, ver ResumeTab.jsx), así que conserva
// sus 4 checkboxes normales. "inventory.reports" entra por la misma razón que los otros tres:
// GET /api/reports/inventory es su única ruta.
export const VIEW_ONLY_MODULE_KEYS = ["reports.appointments", "reports.patients", "reports.doctors", "inventory.reports"];

const FULL_CRUD = { view: true, create: true, update: true, delete: true };
const NO_ACCESS = { view: false, create: false, update: false, delete: false };
const VIEW_ONLY = { view: true, create: false, update: false, delete: false };

// Valores predeterminados por rol, usados por el botón "Volver a los valores
// predeterminados" de cada card. Solo cubre los moduleKey gestionables desde
// esta pantalla (ALL_MODULE_KEYS) — "dashboard", "system.roles" y
// "system.profile" nunca se tocan aquí, igual que en el resto de la pantalla.
export const DEFAULT_ROLE_PERMISSIONS = {
  doctor: {
    "calendar.schedule": FULL_CRUD,
    "calendar.appointments": FULL_CRUD,
    "calendar.consultations": FULL_CRUD,
    "users.doctors": NO_ACCESS,
    "users.patients": FULL_CRUD,
    "users.receptionist": NO_ACCESS,
    // El doctor necesita ver el listado de enfermeras para poder asignar
    // una al agendar una cita.
    "users.nurses": VIEW_ONLY,
    "procedures": FULL_CRUD,
    // El doctor sí puede ver estos dos reportes hoy (seedRoles.js: view=true) — antes este
    // archivo decía NO_ACCESS, así que el botón "Restablecer a valores predeterminados" le
    // habría quitado ese acceso real. reports.records no se toca (fuera del alcance de este
    // cambio, y su desajuste con el seed es un tema aparte).
    "reports.appointments": VIEW_ONLY,
    "reports.records": FULL_CRUD,
    "reports.patients": VIEW_ONLY,
    "reports.doctors": NO_ACCESS,
    "inventory.products": NO_ACCESS,
    "inventory.treatments": NO_ACCESS,
    "inventory.movements": NO_ACCESS,
    "inventory.reports": NO_ACCESS,
  },
  nurse: {
    "calendar.schedule": NO_ACCESS,
    "calendar.appointments": FULL_CRUD,
    "calendar.consultations": NO_ACCESS,
    "users.doctors": NO_ACCESS,
    "users.patients": NO_ACCESS,
    "users.receptionist": NO_ACCESS,
    "users.nurses": NO_ACCESS,
    "procedures": NO_ACCESS,
    "reports.appointments": NO_ACCESS,
    "reports.records": NO_ACCESS,
    "reports.patients": NO_ACCESS,
    "reports.doctors": NO_ACCESS,
    "inventory.products": NO_ACCESS,
    "inventory.treatments": NO_ACCESS,
    "inventory.movements": NO_ACCESS,
    "inventory.reports": NO_ACCESS,
  },
  receptionist: {
    "calendar.schedule": NO_ACCESS,
    "calendar.appointments": FULL_CRUD,
    "calendar.consultations": NO_ACCESS,
    "users.doctors": NO_ACCESS,
    "users.patients": NO_ACCESS,
    "users.receptionist": NO_ACCESS,
    "users.nurses": NO_ACCESS,
    "procedures": NO_ACCESS,
    "reports.appointments": NO_ACCESS,
    "reports.records": NO_ACCESS,
    "reports.patients": NO_ACCESS,
    "reports.doctors": NO_ACCESS,
    "inventory.products": NO_ACCESS,
    "inventory.treatments": NO_ACCESS,
    "inventory.movements": NO_ACCESS,
    "inventory.reports": NO_ACCESS,
  },
};

// Color por rol (solo estético, no se persiste en la base de datos)
export const ROLE_COLOR_BY_KEY = {
  admin: "blue",
  doctor: "violet",
  nurse: "emerald",
  receptionist: "rose",
};

// Tokens de color por rol, usados en avatar de la card y acentos de la UI
export const ROLE_COLOR_TOKENS = {
  blue: {
    bg: "bg-[#EAF1FD]",
    text: "text-[#3B6FCA]",
    ring: "ring-[#3B6FCA]",
    solidBg: "bg-[#3B6FCA]",
    selectedBg: "bg-[#EAF1FD]",
    selectedBorder: "border-[#3B6FCA]",
  },
  violet: {
    bg: "bg-[#F1EBFB]",
    text: "text-[#7C4FD1]",
    ring: "ring-[#7C4FD1]",
    solidBg: "bg-[#7C4FD1]",
    selectedBg: "bg-[#F1EBFB]",
    selectedBorder: "border-[#7C4FD1]",
  },
  emerald: {
    bg: "bg-[#E6F6EF]",
    text: "text-[#1E9E63]",
    ring: "ring-[#1E9E63]",
    solidBg: "bg-[#1E9E63]",
    selectedBg: "bg-[#E6F6EF]",
    selectedBorder: "border-[#1E9E63]",
  },
  rose: {
    bg: "bg-[#FBEAEE]",
    text: "text-[#D44C68]",
    ring: "ring-[#D44C68]",
    solidBg: "bg-[#D44C68]",
    selectedBg: "bg-[#FBEAEE]",
    selectedBorder: "border-[#D44C68]",
  },
};