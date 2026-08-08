import { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../../../../lib/apiClient";

// Recetas, incapacidades, referencias, laboratorios, consultas, notas de
// evolución e impresión diagnóstica se completan aparte por
// `usePatientRecordDetail`, que las trae desde /consultations, /appointments
// y /sick-leaves filtradas por paciente (esta función solo arma lo que ya
// vive directamente en el documento del paciente).
const DEFAULT_DOCTOR = { nombre: "Sin asignar" };

export const formatFecha = (date) =>
  date
    ? new Date(date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
    : null;

const getAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const getGenderLabels = (gender) => {
  if (!gender) return { sexo: "—", sexoCorto: "—" };
  const isFemale = gender.toLowerCase().startsWith("f");
  return { sexo: gender, sexoCorto: isFemale ? "Fem." : "Masc." };
};

const getImcCategoria = (imc) => {
  if (!imc) return null;
  if (imc < 18.5) return "Bajo peso";
  if (imc < 25) return "Normal";
  if (imc < 30) return "Sobrepeso";
  return "Obesidad";
};

// El paciente más reciente se calcula por fecha, sin asumir que el arreglo venga ordenado.
const getLatestByDate = (items = [], dateField) =>
  items.reduce((latest, item) => {
    if (!item[dateField]) return latest;
    const date = new Date(item[dateField]);
    if (!latest || date > new Date(latest[dateField])) return item;
    return latest;
  }, null);

// Forma reducida que consume la tabla del listado (RecordsTable)
const toTableRow = (patient) => {
  const lastProcedure = getLatestByDate(patient?.clinical_history?.procedures, "date");
  return {
    id: patient._id,
    nombre: patient.name,
    apellido: patient.last_name,
    dui: patient.dui,
    telefono: patient.phone,
    ultimaVisita: lastProcedure?.date ? new Date(lastProcedure.date) : null,
  };
};

// Historial de signos vitales ordenado por fecha, más reciente primero
const getVitalSignsHistory = (vitalSigns = []) =>
  [...vitalSigns].sort((a, b) => new Date(b.last_date_taken) - new Date(a.last_date_taken));

// Forma completa que consume el detalle del expediente (RecordDetailPage / ResumenTab)
const toRecordDetail = (patient) => {
  const { sexo, sexoCorto } = getGenderLabels(patient.gender);
  const procedures = patient?.clinical_history?.procedures || [];
  const lastProcedure = getLatestByDate(procedures, "date");
  const vitalSignsHistory = getVitalSignsHistory(patient?.clinical_history?.vital_signs);
  const lastVital = vitalSignsHistory[0];
  const age = getAge(patient.birth_date);

  const antecedentes = [
    ...(patient?.clinical_history?.hereditary || []).map((h) => ({
      parentesco: h.relationship || "—",
      tipo: "Hereditario",
      nombre: h.condition || "—",
      nota: patient?.clinical_history?.non_pathological || "Sin notas adicionales.",
    })),
    ...(patient?.clinical_history?.pathological || []).map((p) => ({
      parentesco: "Personal",
      tipo: "Patológico",
      nombre: p.disease || "—",
      nota: p.diagnosis || "Sin notas adicionales.",
    })),
  ];

  return {
    id: patient._id,
    nombre: patient.name,
    apellido: patient.last_name,
    dui: patient.dui,
    edad: age != null ? `${age} años` : "—",
    // Fecha de nacimiento cruda (además de "edad" ya formateada) — la necesita
    // EditPatientModal para precargar el campo de fecha al editar.
    birthDate: patient.birth_date || null,
    sexo,
    sexoCorto,
    telefono: patient.phone,
    email: patient.email,
    ultimaVisita: {
      fecha: formatFecha(lastProcedure?.date) || "—",
      hora: "—",
      _fecha: lastProcedure?.date || null,
    },
    doctor: lastProcedure?.doctor_name ? { nombre: lastProcedure.doctor_name } : DEFAULT_DOCTOR,
    estado: patient.is_active ? "Activo" : "Inactivo",
    tipoSangre: patient?.clinical_history?.blood_type || "—",
    signosVitales: lastVital
      ? {
          presionArterial: lastVital.blood_pressure || "—",
          glucosa: lastVital.glucosa_mgdl ?? "—",
          peso: lastVital.weight ? `${lastVital.weight} kg` : "—",
          altura: lastVital.height ? `${lastVital.height} m` : "—",
          imc: lastVital.imc ?? "—",
          imcCategoria: getImcCategoria(lastVital.imc),
          // El modelo de paciente no registra un "estado general" calculado; se
          // deriva de forma simple a partir de la categoría de IMC.
          estadoGeneral: getImcCategoria(lastVital.imc) === "Normal" ? "Estable" : "En seguimiento",
          ultimoRegistro: formatFecha(lastVital.last_date_taken) || "—",
        }
      : {},
    // Historial completo de tomas, más reciente primero (para la tabla de la
    // pestaña "Signos vitales"). "id" es el _id real del subdocumento (Mongoose lo autogenera
    // en cada elemento del array) — lo necesita el botón de editar/eliminar una toma puntual.
    // Todos los valores van crudos (sin unidad pegada al string) para poder precargarlos tal
    // cual en el modal de edición; la tabla le agrega la unidad solo al mostrarlos.
    signosVitalesHistorial: vitalSignsHistory.map((v) => ({
      id: String(v._id),
      fecha: formatFecha(v.last_date_taken) || "—",
      presion: v.blood_pressure || "—",
      glucosa: v.glucosa_mgdl ?? "—",
      peso: v.weight ?? "—",
      altura: v.height ?? "—",
      imc: v.imc ?? "—",
      temp: v.temperature ?? "—",
      spo2: v.spo2 ?? "—",
    })),
    // El modelo no tiene una duración registrada por procedimiento; se deja
    // como dato predeterminado hasta que exista ese campo.
    procedimientos: procedures.map((p) => ({
      nombre: p.procedure_name || "Procedimiento",
      fecha: formatFecha(p.date) || "—",
      doctor: p.doctor_name || "—",
      duracion: p.duration || "—",
    })),
    antecedentes,
    // El modelo no clasifica el "tipo" (crónico/cardio/respiratorio/psicológico)
    // de cada antecedente, así que se deja una categoría genérica por defecto.
    historiaClinica: {
      hereditarios: (patient?.clinical_history?.hereditary || []).map((h) => ({
        a: h.relationship || "—",
        b: h.condition || "—",
        tipo: "Crónico",
      })),
      patologicos: (patient?.clinical_history?.pathological || []).map((p) => ({
        a: p.disease || "—",
        b: p.diagnosis || "—",
        tipo: "Crónico",
      })),
      noPatologicos:
        patient?.clinical_history?.non_pathological ||
        "Sin antecedentes no patológicos registrados.",
    },
  };
};

const useRecords = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient("/patients");
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error al cargar los expedientes de pacientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Filas para la tabla del listado, derivadas de los pacientes ya cargados
  const records = useMemo(() => patients.map(toTableRow), [patients]);

  // Expediente completo de un paciente puntual, para el renderizado tipo SPA
  // (no dispara una petición nueva: reutiliza los pacientes que ya trajo este hook)
  const getRecordById = useCallback(
    (id) => {
      const patient = patients.find((p) => p._id === id);
      return patient ? toRecordDetail(patient) : null;
    },
    [patients]
  );

  return {
    records,
    loading,
    error,
    getRecordById,
    refetch: fetchRecords,
  };
};

export default useRecords;
