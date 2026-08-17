export const sectionsConfig = {
  allergies: {
    title: "Alergias",
    icon: "alert-circle-outline",
    countLabel: "Alergias registradas",
    addLabel: "Agregar alergia",
    emptyTitle: "No tienes alergias registradas",
    emptyText: "Registra tus alergias para que el personal médico las conozca.",
  },
  chronic: {
    title: "Enfermedades crónicas",
    icon: "heart-outline",
    countLabel: "Enfermedades registradas",
    addLabel: "Agregar enfermedad",
    emptyTitle: "No tienes enfermedades crónicas registradas",
    emptyText: "Si padeces alguna condición crónica, puedes registrarla aquí.",
  },
  medications: {
    title: "Medicamentos actuales",
    icon: "medkit-outline",
    countLabel: "Medicamentos activos",
    addLabel: "Agregar medicamento",
    emptyTitle: "No tienes medicamentos registrados",
    emptyText: "Registra tus tratamientos actuales para llevar control.",
  },
  surgeries: {
    title: "Cirugías",
    icon: "cut-outline",
    countLabel: "Cirugías registradas",
    addLabel: "Añadir cirugía",
    emptyTitle: "No tienes cirugías registradas",
    emptyText: "Si te has operado, puedes registrar la información aquí.",
    showMenu: true,
  },
  hospitalizations: {
    title: "Hospitalizaciones",
    icon: "business-outline",
    countLabel: "Hospitalizaciones",
    addLabel: "Agregar hospitalización",
    emptyTitle: "No tienes hospitalizaciones registradas",
    emptyText: "Si has estado hospitalizado, puedes registrar tu información.",
  },
  familyHistory: {
    title: "Antecedentes familiares",
    icon: "people-outline",
    countLabel: "Antecedentes registrados",
    addLabel: "Agregar antecedente",
    emptyTitle: "No hay antecedentes registrados",
    emptyText: "Los antecedentes familiares ayudan a prevenir enfermedades.",
  },
  vaccines: {
    title: "Vacunas",
    icon: "shield-checkmark-outline",
    countLabel: "Vacunas registradas",
    addLabel: "Agregar vacuna",
    emptyTitle: "No tienes vacunas registradas",
    emptyText: "Lleva el control de tu esquema de vacunación.",
  },
  medicalNotes: {
    title: "Notas médicas",
    icon: "document-text-outline",
    countLabel: "Notas registradas",
    addLabel: "Agregar nota",
    emptyTitle: "No hay notas médicas registradas",
    emptyText: "Aquí podrás guardar información importante sobre tu salud.",
  },
  religion: {
    title: "Grupo religioso",
    icon: "add-circle-outline",
    countLabel: "Grupo declarado",
    addLabel: "Registrar grupo",
    emptyTitle: "No has declarado un grupo religioso",
    emptyText: "Este dato es opcional y sirve para respetar tus creencias.",
  },
};

/** Qué fila abre qué pantalla. Los valores los pone la API. */
export const healthSummaryLayout = [
  {
    section: "Datos generales",
    rows: [
      { key: "bloodType", icon: "water-outline", color: "red", label: "Tipo de sangre", screen: "BloodType" },
      { key: "allergies", icon: "alert-circle-outline", color: "pink", label: "Alergias", screen: "ListDetail", params: { key: "allergies" } },
      { key: "chronic", icon: "heart-outline", color: "red", label: "Enfermedades crónicas", screen: "ListDetail", params: { key: "chronic" } },
      { key: "medications", icon: "medkit-outline", color: "blue", label: "Medicamentos actuales", screen: "ListDetail", params: { key: "medications" } },
    ],
  },
  {
    section: "Historial médico",
    rows: [
      { key: "surgeries", icon: "cut-outline", color: "blue", label: "Cirugías", screen: "ListDetail", params: { key: "surgeries" } },
      { key: "hospitalizations", icon: "business-outline", color: "blue", label: "Hospitalizaciones", screen: "ListDetail", params: { key: "hospitalizations" } },
      { key: "familyHistory", icon: "people-outline", color: "blue", label: "Antecedentes familiares", screen: "ListDetail", params: { key: "familyHistory" } },
      { key: "vaccines", icon: "shield-checkmark-outline", color: "blue", label: "Vacunas", screen: "ListDetail", params: { key: "vaccines" } },
      { key: "lifestyle", icon: "walk-outline", color: "blue", label: "Estilo de vida", screen: "Lifestyle" },
    ],
  },
  {
    section: "Información adicional",
    rows: [
      { key: "medicalNotes", icon: "document-text-outline", color: "purple", label: "Notas médicas", screen: "ListDetail", params: { key: "medicalNotes" } },
      { key: "religion", icon: "add-circle-outline", color: "green", label: "Grupo religioso (opcional)", screen: "ListDetail", params: { key: "religion" } },
      { key: "organDonation", icon: "sparkles-outline", color: "amber", label: "Donación de órganos", screen: "OrganDonation" },
    ],
  },
];

/** Placeholder cuando la API no trae valor */
export const EMPTY_VALUE = "Sin registrar";