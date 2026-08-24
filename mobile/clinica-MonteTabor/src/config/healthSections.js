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