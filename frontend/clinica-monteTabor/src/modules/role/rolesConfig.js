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

// Los cuatro permisos atómicos que existen para cada módulo del
// sistema. view es el permiso base: si se activa create, update o
// delete, view se activa solo, porque no tiene sentido poder crear,
// editar o borrar algo que no se puede ver.
export const PERMISSION_TYPES = [
  { key: "view", label: "Visualización", short: "Ver" },
  { key: "create", label: "Ingreso", short: "Crear" },
  { key: "update", label: "Actualización", short: "Editar" },
  { key: "delete", label: "Eliminación", short: "Eliminar" },
];

// Estructura agrupada por sección del sidebar, con sus módulos
// (sub-links) y los permisos de cada uno. Los valores de key son los
// moduleKey reales de la colección roles y de menuConfig.js, no se
// deben inventar otros. dashboard y system.roles quedan fuera de esta
// pantalla a propósito: su acceso real en el backend sigue
// hardcodeado, no depende de authorize(), así que togglearlos aquí no
// cambiaría nada.
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
      { key: "inventory.treatments", label: "Tratamientos", icon: FlaskConical },
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
      { key: "inventory.movements", label: "Movimientos", icon: ArrowLeftRight },
      { key: "inventory.reports", label: "Reportes de inventario", icon: TrendingUp },
    ],
  },
  // Sistema (Mi perfil) no aparece aquí a propósito: editar el propio
  // perfil debe funcionar siempre, para todos los roles, sin ser una
  // opción gestionable.
];

// Lista plana de todas las claves de módulos, útil para construir el
// conjunto de todo activado.
export const ALL_MODULE_KEYS = SIDEBAR_MODULES.flatMap((section) =>
  section.modules.map((m) => m.key)
);

// Etiqueta legible de cada moduleKey, por ejemplo reports.records da
// Expediente. La usa el mensaje de error de RolesPage cuando falta
// activar una dependencia (ver MODULE_VIEW_DEPENDENCIES más abajo).
export const MODULE_LABEL_BY_KEY = Object.fromEntries(
  SIDEBAR_MODULES.flatMap((section) => section.modules.map((m) => [m.key, m.label]))
);

// Módulos que en el backend solo tienen una ruta GET
// (backend/src/routes/reports/reports.js solo define .get() para
// estos cuatro, sin POST, PUT ni DELETE). Activar crear, editar o
// eliminar ahí no tendría ningún efecto real, así que
// ModulePermissionCard oculta esos tres checkboxes y deja únicamente
// Ver. El módulo reports.records (Expediente) queda fuera a
// propósito: sí tiene una acción real de creación (registrar
// incapacidades, ver ResumeTab.jsx), así que conserva sus cuatro
// checkboxes normales. inventory.reports entra por la misma razón que
// los otros tres: GET /api/reports/inventory es su única ruta.
export const VIEW_ONLY_MODULE_KEYS = ["reports.appointments", "reports.patients", "reports.doctors", "inventory.reports"];

// Acciones puntuales sin ningún endpoint real detrás, para módulos
// que sí necesitan más de un checkbox, a diferencia de
// VIEW_ONLY_MODULE_KEYS, que oculta todo menos Ver. Caso real:
// Horarios (calendar.schedule) solo tiene GET, para Ver, y PUT o
// upsert, para Editar, en el backend. No existe una ruta POST ni
// DELETE separada (backend/src/routes/schedule/schedule.js), así que
// Crear y Eliminar se togglean sin ningún efecto real si se dejan
// visibles.
export const HIDDEN_PERMISSION_ACTIONS = {
  "calendar.schedule": ["create", "delete"],
  // Movimientos de inventario: GET dan Ver, POST a /stock-entry,
  // /manual-usage y /procedure-discount dan Crear, y POST a
  // /:id/adjust da Editar. No existe ninguna ruta DELETE para
  // movimientos (backend/src/routes/inventory/inventory.js), son un
  // registro histórico y no se borran.
  "inventory.movements": ["delete"],
};

// Módulos cuya pantalla, aunque tengan su propio permiso de Ver
// activado, dependen del permiso de Ver de otros módulos para no
// romperse, porque su pantalla llama a esos otros endpoints por
// separado. Caso real: el Expediente (reports.records) solo controla
// si el rol puede abrir la pantalla y gestionar incapacidades. La
// ficha del paciente viene de users.patients, el historial de
// consultas de calendar.consultations y las citas pendientes de
// calendar.appointments. Si a alguno de esos le falta Ver, el
// Expediente carga, pero esas secciones fallan con un error 403.
// ModulePermissionCard usa esto para avisar dentro de la propia card
// cuando falta alguno.
export const MODULE_VIEW_DEPENDENCIES = {
  "reports.records": [
    { moduleKey: "users.patients", label: "Pacientes" },
    { moduleKey: "calendar.consultations", label: "Consultas" },
    { moduleKey: "calendar.appointments", label: "Citas" },
  ],
};

// Permisos que, para ciertos roles, el propio dashboard de ese rol
// necesita en true para funcionar. Por ejemplo, el recepcionista no
// puede agendar citas si le apagan ver horarios o crear pacientes, ya
// que su propio panel principal quedaría roto. Se muestran marcados
// con un candado y no se pueden destildar. El backend
// (rolesController.js) tiene la misma lista y es quien realmente lo
// hace cumplir, esto solo evita la confusión de destildar algo que el
// servidor va a rechazar de todas formas. A diferencia de
// isProtected, que bloquea todo el rol, como en el caso de admin,
// esto solo bloquea esos permisos puntuales.
export const LOCKED_TRUE_PERMISSIONS = {
  receptionist: {
    "calendar.schedule": ["view"],
    "calendar.appointments": ["view", "create", "update"],
    "users.patients": ["view", "create"],
  },
  nurse: {
    "calendar.schedule": ["view"],
    "calendar.appointments": ["view", "create", "update"],
    // La enfermera no tiene registro rápido de pacientes (a diferencia de recepción), solo
    // necesita poder verlos para buscarlos al agendar una cita.
    "users.patients": ["view"],
  },
  doctor: {
    // El doctor siempre debe poder ver, crear y actualizar sus propias
    // citas. Es la funcionalidad central de su dashboard (próximas
    // citas, agregar cita, calendario). Eliminar queda fuera a
    // propósito: el doctor no necesita poder borrar citas, solo
    // cancelarlas (cambio de estado), así que ese permiso sigue siendo
    // opcional y configurable.
    "calendar.appointments": ["view", "create", "update"],
  },
};

// Permisos que, al revés de LOCKED_TRUE_PERMISSIONS, un rol nunca puede
// tener en true, sin importar lo que se intente guardar desde esta
// pantalla o directamente contra la API. El checkbox se ve tildable
// pero queda bloqueado en falso, con un candado. El backend
// (rolesController.js) tiene la misma lista y es quien realmente lo
// hace cumplir. Esto solo evita la confusión de dejar prender algo que
// el servidor va a rechazar de todas formas.
export const LOCKED_FALSE_PERMISSIONS = {
  receptionist: {
    // Recepción puede consultar horarios (los necesita para agendar
    // una cita con un doctor disponible), pero jamás debe poder
    // modificarlos. Eso es exclusivo de cada doctor o enfermera sobre
    // su propio horario, y del admin. El endpoint PUT también está
    // bloqueado de forma dura en el backend (ver backend/src/routes/
    // schedule/schedule.js), así que esto no depende únicamente de
    // este candado visual.
    "calendar.schedule": ["update"],
  },
};

const FULL_CRUD = { view: true, create: true, update: true, delete: true };
const NO_ACCESS = { view: false, create: false, update: false, delete: false };
const VIEW_ONLY = { view: true, create: false, update: false, delete: false };
// Ver y editar, sin crear ni eliminar. Es el caso de poder tener y
// editar el propio horario (doctor y enfermera), donde el registro se
// crea implícitamente por upsert, no por un botón de crear separado.
const VIEW_UPDATE = { view: true, create: false, update: true, delete: false };

// Valores predeterminados por rol, usados por el botón de volver a
// los valores predeterminados de cada card. Solo cubre los moduleKey
// gestionables desde esta pantalla (ALL_MODULE_KEYS). Los módulos
// dashboard, system.roles y system.profile nunca se tocan aquí, igual
// que en el resto de la pantalla.
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
    // El doctor puede ver estos dos reportes (seedRoles.js: view en
    // true).
    "reports.appointments": VIEW_ONLY,
    // CRUD completo: el doctor es quien emite, edita y elimina
    // incapacidades desde el Expediente, la única acción real detrás
    // de este moduleKey (ver sickLeaves routes).
    "reports.records": FULL_CRUD,
    "reports.patients": VIEW_ONLY,
    "reports.doctors": NO_ACCESS,
    "inventory.products": NO_ACCESS,
    // El doctor hace el seguimiento clínico del tratamiento
    // (evolución, notas, controles, alta) desde /inventory/treatments.
    // Necesita las cuatro acciones, no solo ver.
    "inventory.treatments": FULL_CRUD,
    "inventory.movements": NO_ACCESS,
    "inventory.reports": NO_ACCESS,
  },
  nurse: {
    // A diferencia de recepción, la enfermera sí puede tener y editar
    // su propio horario, lo que permite que solo se le asignen citas
    // dentro de ese horario.
    "calendar.schedule": VIEW_UPDATE,
    "calendar.appointments": FULL_CRUD,
    "calendar.consultations": NO_ACCESS,
    "users.doctors": NO_ACCESS,
    // A diferencia de recepción, no registra pacientes nuevos, solo
    // los busca al agendar una cita.
    "users.patients": VIEW_ONLY,
    "users.receptionist": NO_ACCESS,
    "users.nurses": NO_ACCESS,
    "procedures": NO_ACCESS,
    "reports.appointments": NO_ACCESS,
    "reports.records": NO_ACCESS,
    "reports.patients": NO_ACCESS,
    "reports.doctors": NO_ACCESS,
    "inventory.products": NO_ACCESS,
    // La enfermera también participa del seguimiento del tratamiento (curaciones, controles),
    // así que tiene las mismas 4 acciones que el doctor en /inventory/treatments.
    "inventory.treatments": FULL_CRUD,
    "inventory.movements": NO_ACCESS,
    "inventory.reports": NO_ACCESS,
  },
  receptionist: {
    "calendar.schedule": VIEW_ONLY,
    // Incluye Eliminar (seedRoles.js: [true, true, true, true]).
    // Recepción sí cancela o elimina citas como parte de su trabajo
    // diario.
    "calendar.appointments": FULL_CRUD,
    // Recepción tiene permiso de Ver (seedRoles.js), ya que consulta
    // el historial de consultas al atender a un paciente que ya tuvo
    // cita.
    "calendar.consultations": VIEW_ONLY,
    "users.doctors": VIEW_ONLY,
    // seedRoles.js solo le da permiso de Ver (el registro real de
    // pacientes nuevos ocurre a través de reports.patients, no de
    // este moduleKey). El botón de restablecer valores predeterminados
    // no debe conceder editar ni eliminar aquí, ya que eso le daría a
    // recepción permiso para editar o borrar el expediente de
    // cualquier paciente.
    "users.patients": VIEW_ONLY,
    "users.receptionist": NO_ACCESS,
    "users.nurses": VIEW_ONLY,
    "procedures": VIEW_ONLY,
    "reports.appointments": NO_ACCESS,
    "reports.records": NO_ACCESS,
    // seedRoles.js le da CRUD completo, ya que es donde recepción
    // efectivamente registra, edita y elimina pacientes nuevos, como
    // parte central de su trabajo.
    "reports.patients": FULL_CRUD,
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