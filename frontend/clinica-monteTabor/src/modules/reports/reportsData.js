// ─── CITAS ────────────────────────────────────────────────────────────────────

export const citasTopCards = [
  {
    key: "programadas",
    title: "Citas programadas",
    toggles: ["Por mes", "Por día"],
    stat: "350",
    statLabel: "este mes",
    statDiff: "+8% comparado con el período anterior",
    chartData: {
      "Por mes": [
        { label: "Ene", total: 280 },
        { label: "Feb", total: 310 },
        { label: "Mar", total: 290 },
        { label: "Abr", total: 350 },
        { label: "May", total: 330 },
        { label: "Jun", total: 370 },
        { label: "Jul", total: 360 },
        { label: "Ago", total: 340 },
        { label: "Sep", total: 380 },
        { label: "Oct", total: 350 },
      ],
      "Por día": [
        { label: "Lun", total: 42 },
        { label: "Mar", total: 55 },
        { label: "Mié", total: 48 },
        { label: "Jue", total: 60 },
        { label: "Vie", total: 52 },
        { label: "Sáb", total: 30 },
        { label: "Dom", total: 12 },
      ],
    },
  },
  {
    key: "atendidos",
    title: "Pacientes atendidos",
    toggles: ["Abr 2026 – 1 May 2026"],
    stat: "306",
    statLabel: "total de pacientes",
    statDiff: "+12% comparado con el período anterior",
    chartType: "bar",
    chartData: {
      "Abr 2026 – 1 May 2026": [
        { label: "Ene", total: 260 },
        { label: "Feb", total: 290 },
        { label: "Mar", total: 270 },
        { label: "Abr", total: 306 },
        { label: "May", total: 310 },
        { label: "Jun", total: 295 },
        { label: "Jul", total: 320 },
        { label: "Ago", total: 300 },
        { label: "Sep", total: 315 },
        { label: "Oct", total: 290 },
      ],
    },
  },
  {
    key: "mas_atendidos",
    title: "Pacientes más atendidos",
    subtitle: "Basado en el número de las citas que fueron atendidas",
    listItems: [
      "Fernando Miguel Velásquez Flores",
      "Gabriela Isabel Castillo Mena",
      "Beatriz Elizabeth Villalta Soto",
      "Natalia Abigail Navarro Grietas",
      "Diego Vladimir Gómez Escamilla",
    ],
    linkLabel: "Ver todos los pacientes",
  },
];

export const citasSections = [
  {
    key: "volumen",
    title: "Volumen de citas",
    icon: "calendar",
    rows: [
      { proceso: "Total de citas programadas", actual: "248", anterior: "210", variacion: "+18.1%" },
      { proceso: "Citas programadas", actual: "196", anterior: "168", variacion: "+16.7%" },
      { proceso: "Citas por orden de llegada", actual: "52", anterior: "42", variacion: "+23.8%" },
    ],
  },
  {
    key: "estado",
    title: "Estado de citas",
    icon: "clipboard",
    rows: [
      { proceso: "Citas atendidas", badge: { label: "Completadas", color: "green" }, actual: "211", anterior: "178", variacion: "+18.5%" },
      { proceso: "Citas canceladas", badge: { label: "Canceladas", color: "red" }, actual: "24", anterior: "19", variacion: "-26.3" },
      { proceso: "Inasistencias", badge: { label: "No se presentó", color: "orange" }, actual: "13", anterior: "13", variacion: "0.0%" },
      { proceso: "Citas pendientes de confirmar", actual: "8", anterior: "—", variacion: "—" },
    ],
  },
  {
    key: "tipo_atencion",
    title: "Tipo de atención",
    icon: "stethoscope",
    rows: [
      { proceso: "Consultas generales (20–30 min)", actual: "174", anterior: "153", variacion: "+14.5%" },
      { proceso: "Consultas con procedimientos (45–1hr)", actual: "74", anterior: "58", variacion: "+27.6%" },
    ],
  },
  {
    key: "medicos",
    title: "Médicos y duración de consultas",
    icon: "user",
    rows: [
      { proceso: "Médicos activos con citas asignadas", actual: "2", anterior: "2", variacion: "0.0%" },
      { proceso: "Citas programadas", actual: "34 min", anterior: "33 min", variacion: "+3.0%" },
      { proceso: "Citas por orden de llegada", actual: "18", anterior: "22", variacion: "+18.2%" },
    ],
  },
];

// ─── PACIENTES ────────────────────────────────────────────────────────────────

export const pacientesTopCards = [
  {
    key: "atendidos_linea",
    title: "Pacientes atendidos",
    toggles: ["Semanal", "Por día"],
    stat: "342",
    statLabel: "total de pacientes",
    statDiff: "+9% comparado con el período anterior",
    chartData: {
      Semanal: [
        { label: "Ene", total: 290 },
        { label: "Feb", total: 310 },
        { label: "Mar", total: 280 },
        { label: "Abr", total: 342 },
        { label: "May", total: 320 },
        { label: "Jun", total: 355 },
        { label: "Jul", total: 340 },
        { label: "Ago", total: 330 },
        { label: "Sep", total: 360 },
        { label: "Oct", total: 342 },
      ],
      "Por día": [
        { label: "Lun", total: 48 },
        { label: "Mar", total: 60 },
        { label: "Mié", total: 44 },
        { label: "Jue", total: 55 },
        { label: "Vie", total: 50 },
        { label: "Sáb", total: 28 },
        { label: "Dom", total: 10 },
      ],
    },
  },
  {
    key: "genero",
    title: "Pacientes atendidos por género",
    chartType: "pie",
    pieData: [
      { name: "Masculino", value: 178, pct: "52%" },
      { name: "Femenino", value: 164, pct: "48%" },
    ],
    stat: "342",
    statLabel: "Total",
  },
  {
    key: "medicamentos",
    title: "Medicamentos más usados",
    subtitle: "Basado en el número de medicamentos emitidos a los pacientes",
    listItems: ["Paracetamol", "Azitromicina", "Ibuprofeno", "Dipirona Fetoral", "Anticoagulante (Heparina)"],
    linkLabel: "Ver inventario",
  },
];

export const pacientesSections = [
  {
    key: "registro",
    title: "Registro de pacientes",
    icon: "users",
    rows: [
      { proceso: "Total de pacientes registrados", actual: "412", anterior: "374", variacion: "+10.2%" },
      { proceso: "Pacientes nuevos", badge: { label: "Nuevos", color: "blue" }, actual: "38", anterior: "29", variacion: "+31.0%" },
      { proceso: "Pacientes recurrentes", badge: { label: "Recurrentes", color: "purple" }, actual: "173", anterior: "142", variacion: "+16.1%" },
      { proceso: "Pacientes inactivo (sin cita hace 3 meses)", actual: "93", anterior: "94", variacion: "-7.4%" },
    ],
  },
  {
    key: "asistencia",
    title: "Asistencia y comportamiento",
    icon: "users",
    rows: [
      { proceso: "Pacientes atendidos en el período debido", actual: "211", anterior: "178", variacion: "+16.0%" },
      { proceso: "Citas programadas", actual: "38", anterior: "38", variacion: "0.0%" },
      { proceso: "Citas por orden de llegada", actual: "24", anterior: "19", variacion: "-26.3%" },
      { proceso: "Tasa de asistencia", actual: "89.1%", anterior: "84.8%", variacion: "+0.4%" },
    ],
  },
  {
    key: "tipo_atencion_pac",
    title: "Tipo de atención recibida",
    icon: "clipboard",
    rows: [
      { proceso: "Pacientes atendidos en consulta general", actual: "174", anterior: "131", variacion: "+14.5%" },
      { proceso: "Pacientes atendidos en procedimientos", actual: "74", anterior: "58", variacion: "+27.6%" },
      { proceso: "Pacientes con solicitud de exámenes", actual: "61", anterior: "48", variacion: "+27.1%" },
      { proceso: "Pacientes que llevan receta médica", actual: "198", anterior: "165", variacion: "+20.0%" },
    ],
  },
  {
    key: "demografia",
    title: "Distribución demográfica",
    icon: "chart",
    rows: [
      { proceso: "Pacientes masculinos atendidos", actual: "89", anterior: "76", variacion: "+17.1%" },
      { proceso: "Pacientes femeninos atendidos", actual: "122", anterior: "102", variacion: "+19.6%" },
      { proceso: "Promedio de consultas por paciente", actual: "1.4", anterior: "1.3", variacion: "+7.7%" },
    ],
  },
  {
    key: "seguimiento",
    title: "Seguimiento clínico",
    icon: "stethoscope",
    rows: [
      { proceso: "Pacientes con alergias registradas", actual: "47", anterior: "41", variacion: "+14.6%" },
      { proceso: "Pacientes con enfermedades previas registradas", actual: "93", anterior: "88", variacion: "+5.7%" },
      { proceso: "Pacientes con próxima cita agendada", badge: { label: "Consultadas", color: "green" }, actual: "64", anterior: "51", variacion: "+25.5%" },
    ],
  },
];

// ─── DOCTORES ────────────────────────────────────────────────────────────────

export const doctoresTopCards = [
  {
    key: "examenes",
    title: "Exámenes hechos",
    toggles: ["Semanal", "Por día"],
    stat: "316",
    statLabel: "exámenes totales",
    statDiff: "+5% comparado con el período anterior",
    chartData: {
      Semanal: [
        { label: "Lun", total: 38 },
        { label: "Mar", total: 55 },
        { label: "Mié", total: 44 },
        { label: "Jue", total: 61 },
        { label: "Vie", total: 50 },
        { label: "Sáb", total: 32 },
        { label: "Dom", total: 20 },
      ],
      "Por día": [
        { label: "8am", total: 12 },
        { label: "10am", total: 28 },
        { label: "12pm", total: 35 },
        { label: "2pm", total: 30 },
        { label: "4pm", total: 22 },
        { label: "6pm", total: 10 },
      ],
    },
  },
  {
    key: "procedimientos_pie",
    title: "Procesos realizados",
    chartType: "pie",
    pieData: [
      { name: "Consultas", value: 174, pct: "55%" },
      { name: "Procedimientos", value: 74, pct: "23%" },
      { name: "Exámenes", value: 61, pct: "19%" },
      { name: "Otros", value: 7, pct: "3%" },
    ],
    stat: "316",
    statLabel: "Total",
  },
  {
    key: "mas_activos",
    title: "Doctores más activos",
    subtitle: "Basado en el número de las citas que fueron atendidas en el período",
    listItems: [
      "Ana Paula Martínez",
      "Jorge Mario Vásquez",
      "Camila Alicia Duque",
      "Valentina Granados de Martín",
      "Nancy Reiman Hernández",
    ],
    linkLabel: "Ver todos los doctores",
  },
];

export const doctoresSections = [
  {
    key: "actividad",
    title: "Actividad general",
    icon: "activity",
    rows: [
      { proceso: "Total de doctores en laburo", actual: "2", anterior: "2", variacion: "0.0%" },
      { proceso: "Doctores activos con citas asignadas", actual: "2", anterior: "2", variacion: "0.0%" },
      { proceso: "Citas atendidas entre todos los doctores", actual: "211", anterior: "178", variacion: "+18.5%" },
      { proceso: "Promedio de citas atendidas por doctor", actual: "105.5", anterior: "89", variacion: "+18.5%" },
      { proceso: "Promedio de duración de citas atendidas por doctor", actual: "34 min", anterior: "33 min", variacion: "+3.0%" },
    ],
  },
  {
    key: "rendimiento",
    title: "Rendimiento clínico",
    icon: "chart",
    rows: [
      { proceso: "Citas atendidas sin retraso", actual: "193", anterior: "156", variacion: "+23.7%" },
      { proceso: "Citas atendidas con retraso registrado", actual: "18", anterior: "22", variacion: "-18.2%" },
      { proceso: "Citas canceladas por doctor", actual: "6", anterior: "9", variacion: "-33.3%" },
      { proceso: "Tasa de cumplimiento de citas por doctor", actual: "97.2%", anterior: "94.9%", variacion: "+2.4%" },
    ],
  },
  {
    key: "atencion_brindada",
    title: "Atención brindada",
    icon: "stethoscope",
    rows: [
      { proceso: "Consultas generales atendidas", actual: "174", anterior: "153", variacion: "+14.5%" },
      { proceso: "Procedimientos realizados", actual: "74", anterior: "58", variacion: "+27.6%" },
      { proceso: "Recetas emitidas por doctores", actual: "198", anterior: "165", variacion: "+20.0%" },
      { proceso: "Recetas emitidas por doctores", actual: "22", anterior: "17", variacion: "+29.4%" },
      { proceso: "Exámenes solicitados por doctores", actual: "61", anterior: "48", variacion: "+27.1%" },
    ],
  },
  {
    key: "pacientes_doctor",
    title: "Pacientes por doctor",
    icon: "users",
    rows: [
      { proceso: "Pacientes nuevos atendidos", actual: "38", anterior: "29", variacion: "+31.9%" },
      { proceso: "Citas programadas", actual: "173", anterior: "149", variacion: "+16.1%" },
      { proceso: "Citas por orden de llegada", actual: "8.2", anterior: "7.1", variacion: "+15.5%" },
    ],
  },
];

// ─── INVENTARIO ───────────────────────────────────────────────────────────────

export const inventarioTopCards = [
  {
    key: "medicamentos_recetados",
    title: "Cantidad de medicamentos recetados",
    toggles: ["Semanal", "Por día"],
    chartData: {
      Semanal: [
        { label: "Ene", total: 28 },
        { label: "Feb", total: 35 },
        { label: "Mar", total: 30 },
        { label: "Abr", total: 42 },
        { label: "May", total: 38 },
        { label: "Jun", total: 45 },
        { label: "Jul", total: 40 },
        { label: "Ago", total: 36 },
        { label: "Sep", total: 48 },
        { label: "Oct", total: 44 },
      ],
      "Por día": [
        { label: "Lun", total: 12 },
        { label: "Mar", total: 18 },
        { label: "Mié", total: 15 },
        { label: "Jue", total: 20 },
        { label: "Vie", total: 16 },
        { label: "Sáb", total: 9 },
        { label: "Dom", total: 4 },
      ],
    },
  },
  {
    key: "medicamentos_usados",
    title: "Cantidad de medicamentos usados",
    chartType: "bar",
    chartData: {
      "1 Abr 2026 – 1 May 2026": [
        { label: "Ene", total: 22 },
        { label: "Feb", total: 30 },
        { label: "Mar", total: 26 },
        { label: "Abr", total: 38 },
        { label: "May", total: 34 },
        { label: "Jun", total: 41 },
        { label: "Jul", total: 36 },
        { label: "Ago", total: 33 },
        { label: "Sep", total: 45 },
        { label: "Oct", total: 40 },
      ],
    },
  },
  {
    key: "medicamentos_mas_usados",
    title: "Medicamentos más usados",
    subtitle: "Basado en el número de medicamentos recetados a los pacientes",
    listItems: ["Paracetamol", "Azitromicina", "Ibuprofeno 400mg", "Dipirona Sódica", "Antibióticos (Varios)"],
    linkLabel: "Ver el inventario",
  },
];

export const inventarioSections = [
  {
    key: "estado_general",
    title: "Estado general del inventario",
    icon: "package",
    rows: [
      { proceso: "Total de productos registrados", actual: "148", anterior: "141", variacion: "+5.0%" },
      { proceso: "Productos con stock disponible", actual: "121", anterior: "118", variacion: "+2.5%" },
      { proceso: "Productos con stock bajo", badge: { label: "Stock bajo", color: "orange" }, actual: "19", anterior: "14", variacion: "+35.7%" },
      { proceso: "Productos agotados", badge: { label: "Agotado", color: "red" }, actual: "8", anterior: "9", variacion: "-11.1%" },
    ],
  },
  {
    key: "categorias",
    title: "Categorías de productos",
    icon: "clipboardCheck",
    rows: [
      { proceso: "Medicamentos registrados", actual: "64", anterior: "60", variacion: "+6.7%" },
      { proceso: "Materiales de curación y procedimientos", actual: "42", anterior: "40", variacion: "+5.0%" },
      { proceso: "Insumos de enfermería", actual: "28", anterior: "27", variacion: "+3.7%" },
      { proceso: "Equipos e instrumentos médicos", actual: "14", anterior: "14", variacion: "0.0%" },
    ],
  },
  {
    key: "movimientos",
    title: "Movimientos de inventario",
    icon: "plusCircle",
    rows: [
      { proceso: "Productos utilizados en consultas generales", actual: "312", anterior: "274", variacion: "+13.9%" },
      { proceso: "Productos más utilizados en procedimientos", actual: "186", anterior: "148", variacion: "+25.7%" },
      { proceso: "Productos utilizados en curaciones de enfermería", actual: "97", anterior: "83", variacion: "+16.9%" },
      { proceso: "Total de unidades consumidas en el período", actual: "595", anterior: "505", variacion: "+17.8%" },
    ],
  },
  {
    key: "mas_utilizados",
    title: "Productos más utilizados",
    icon: "user",
    rows: [
      { proceso: "Productos más utilizados en consultas", actual: "Gasas estériles", anterior: "Gasas estériles", variacion: "—" },
      { proceso: "Productos más utilizados en procedimientos", actual: "Guantes quirúrgicos", anterior: "Guantes quirúrgicos", variacion: "—" },
      { proceso: "Medicamento más recetado", actual: "Ibuprofeno 400mg", anterior: "Ibuprofeno 400mg", variacion: "—" },
    ],
  },
];