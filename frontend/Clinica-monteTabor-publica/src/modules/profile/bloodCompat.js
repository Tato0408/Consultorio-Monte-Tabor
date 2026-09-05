// Debe coincidir con BLOOD_TYPES del backend (patientSelfController).
export const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// Compatibilidad transfusional estándar del sistema ABO/Rh (misma tabla que la app móvil).
export const BLOOD_COMPAT = {
  "O-": { donateTo: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], receiveFrom: ["O-"] },
  "O+": { donateTo: ["O+", "A+", "B+", "AB+"], receiveFrom: ["O+", "O-"] },
  "A-": { donateTo: ["A-", "A+", "AB-", "AB+"], receiveFrom: ["A-", "O-"] },
  "A+": { donateTo: ["A+", "AB+"], receiveFrom: ["A+", "A-", "O+", "O-"] },
  "B-": { donateTo: ["B-", "B+", "AB-", "AB+"], receiveFrom: ["B-", "O-"] },
  "B+": { donateTo: ["B+", "AB+"], receiveFrom: ["B+", "B-", "O+", "O-"] },
  "AB-": { donateTo: ["AB-", "AB+"], receiveFrom: ["AB-", "A-", "B-", "O-"] },
  "AB+": { donateTo: ["AB+"], receiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] },
};

export const describeBloodType = (type) => {
  if (!type) return "";
  const group = type.replace(/[+-]$/, "");
  const rh = type.endsWith("+") ? "positivo" : "negativo";
  const antigeno =
    group === "O"
      ? "no tiene antígenos A ni B"
      : group === "AB"
        ? "tiene los antígenos A y B"
        : `tiene el antígeno ${group}`;
  return `${type} significa que tu sangre ${antigeno} y que el factor Rh es ${rh}.`;
};
