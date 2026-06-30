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
  Settings,
  ShieldCheck,
  CircleUser,
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
export const SIDEBAR_MODULES = [
  {
    section: "Calendario",
    icon: Calendar,
    modules: [
      { key: "horarios", label: "Horarios", icon: Clock },
      { key: "citas_calendario", label: "Citas", icon: CalendarCheck },
      { key: "consultas", label: "Consultas", icon: Stethoscope },
    ],
  },
  {
    section: "Usuarios",
    icon: Users,
    modules: [
      { key: "doctores", label: "Doctores", icon: UserRound },
      { key: "pacientes", label: "Pacientes", icon: Contact },
      { key: "recepcionistas", label: "Recepcionistas", icon: HeartPulse },
      { key: "enfermeras", label: "Enfermeras", icon: Activity },
    ],
  },
  {
    section: "Procedimientos",
    icon: ClipboardList,
    modules: [
      { key: "procedimientos", label: "Procedimientos", icon: ClipboardList },
    ],
  },
  {
    section: "Reportes",
    icon: FileBarChart,
    modules: [
      { key: "reportes_citas", label: "Citas", icon: CalendarCheck },
      { key: "expedientes", label: "Expedientes", icon: FolderClock },
      { key: "reportes_pacientes", label: "Pacientes", icon: Contact },
      { key: "reportes_doctores", label: "Doctores", icon: UserRound },
    ],
  },
  {
    section: "Inventario",
    icon: Package,
    modules: [
      { key: "productos", label: "Productos", icon: Boxes },
      { key: "tratamientos", label: "Tratamientos", icon: FlaskConical },
      { key: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
      { key: "reportes_inventario", label: "Reportes de inventario", icon: TrendingUp },
    ],
  },
  {
    section: "Sistema",
    icon: Settings,
    modules: [
      { key: "roles_permisos", label: "Roles y permisos", icon: ShieldCheck },
      { key: "mi_perfil", label: "Mi perfil", icon: CircleUser },
    ],
  },
];

// Lista plana de todas las claves de módulos, útil para construir el set "todo activado"
export const ALL_MODULE_KEYS = SIDEBAR_MODULES.flatMap((section) =>
  section.modules.map((m) => m.key)
);

// Construye un objeto de permisos con todos los módulos en false (o true si fullAccess)
const buildPermissionSet = (fullAccess = false) => {
  const set = {};
  ALL_MODULE_KEYS.forEach((key) => {
    set[key] = {
      view: fullAccess,
      create: fullAccess,
      update: fullAccess,
      delete: fullAccess,
    };
  });
  return set;
};

// Definición de roles base. El admin siempre tiene acceso total y no es editable.
export const ROLES = [
  {
    key: "admin",
    label: "Administrador",
    description: "Acceso total al sistema",
    color: "blue",
    locked: true, // no se puede modificar
    permissions: buildPermissionSet(true),
  },
  {
    key: "doctor",
    label: "Doctor",
    description: "Gestión de pacientes e historial clínico.",
    color: "violet",
    locked: false,
    permissions: {
      ...buildPermissionSet(false),
      horarios: { view: true, create: false, update: false, delete: false },
      citas_calendario: { view: true, create: true, update: true, delete: false },
      consultas: { view: true, create: true, update: true, delete: false },
      pacientes: { view: true, create: false, update: true, delete: false },
      procedimientos: { view: true, create: false, update: false, delete: false },
      expedientes: { view: true, create: true, update: true, delete: false },
      mi_perfil: { view: true, create: false, update: true, delete: false },
    },
  },
  {
    key: "nurse",
    label: "Enfermera",
    description: "Consulta y actualización de historial clínico",
    color: "emerald",
    locked: false,
    permissions: {
      ...buildPermissionSet(false),
      citas_calendario: { view: true, create: false, update: false, delete: false },
      consultas: { view: true, create: false, update: true, delete: false },
      pacientes: { view: true, create: false, update: true, delete: false },
      expedientes: { view: true, create: false, update: true, delete: false },
      mi_perfil: { view: true, create: false, update: true, delete: false },
    },
  },
  {
    key: "receptionist",
    label: "Recepcionista",
    description: "Gestión de citas e inventario",
    color: "rose",
    locked: false,
    permissions: {
      ...buildPermissionSet(false),
      horarios: { view: true, create: false, update: false, delete: false },
      citas_calendario: { view: true, create: true, update: true, delete: true },
      pacientes: { view: true, create: true, update: true, delete: false },
      productos: { view: true, create: false, update: false, delete: false },
      movimientos: { view: true, create: true, update: false, delete: false },
      mi_perfil: { view: true, create: false, update: true, delete: false },
    },
  },
];

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