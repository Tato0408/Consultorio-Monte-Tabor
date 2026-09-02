import { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../../../../lib/apiClient";

// Las recetas, incapacidades, referencias, laboratorios, consultas, notas
// de evolución e impresión diagnóstica se completan aparte, en el hook
// usePatientRecordDetail, que las trae desde los endpoints de consultas,
// citas e incapacidades filtradas por paciente. Este archivo solo arma
// los datos que ya viven directamente en el documento del paciente.
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

// Devuelve el elemento más reciente de una lista según su campo de
// fecha, sin asumir que la lista venga ordenada.
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
  const { sexo, sexoCorto } = getGenderLabels(patient.gender);
  const edad = getAge(patient.birth_date);
  return {
    id: patient._id,
    nombre: patient.name,
    apellido: patient.last_name,
    dui: patient.dui,
    telefono: patient.phone,
    ultimaVisita: lastProcedure?.date ? new Date(lastProcedure.date) : null,
    // Campos extra que consume el nuevo diseño del listado: avatar por sexo,
    // edad y estado del paciente. El expediente ya los tiene, solo no se
    // mostraban en esta tabla.
    genero: patient.gender || null,
    sexo,
    sexoCorto,
    edad,
    activo: patient.is_active !== false,
  };
};

// Historial de signos vitales ordenado por fecha, más reciente primero
const getVitalSignsHistory = (vitalSigns = []) =>
  [...vitalSigns].sort((a, b) => new Date(b.last_date_taken) - new Date(a.last_date_taken));

// Forma completa que consume el detalle del expediente (RecordDetailPage y ResumenTab)
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
    // Fecha de nacimiento sin formatear, además del campo edad ya formateado.
    // La necesita EditPatientModal para precargar el campo de fecha al editar.
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
          // El modelo de paciente no registra un estado general calculado, se
          // deriva de forma simple a partir de la categoría de IMC.
          estadoGeneral: getImcCategoria(lastVital.imc) === "Normal" ? "Estable" : "En seguimiento",
          ultimoRegistro: formatFecha(lastVital.last_date_taken) || "—",
        }
      : {},
    // Historial completo de tomas, ordenado del más reciente al más antiguo,
    // para la tabla de la pestaña Signos vitales. El campo id es el _id real
    // del subdocumento (Mongoose lo autogenera en cada elemento del arreglo)
    // y lo necesitan los botones de editar y eliminar una toma puntual. Todos
    // los valores van sin formatear, sin la unidad pegada al texto, para
    // poder precargarlos tal cual en el modal de edición. La tabla agrega la
    // unidad solo al mostrarlos.
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
    // El modelo no tiene una duración registrada por procedimiento, se deja
    // como dato predeterminado hasta que exista ese campo. El campo id es el
    // _id real del subdocumento (Mongoose lo autogenera) y lo necesita el
    // botón de eliminar; consultationId indica si viene de una consulta (para
    // advertir en la confirmación que podría reaparecer si esa consulta se
    // vuelve a editar, ver deleteProcedureHistory en el backend).
    procedimientos: procedures.map((p) => ({
      id: String(p._id),
      nombre: p.procedure_name || "Procedimiento",
      fecha: formatFecha(p.date) || "—",
      doctor: p.doctor_name || "—",
      duracion: p.duration || "—",
      consultationId: p.consultation_id ? String(p.consultation_id) : null,
    })),
    antecedentes,
    // El modelo no clasifica el tipo de antecedente (crónico, cardiológico,
    // respiratorio, psicológico), así que se deja una categoría genérica por
    // defecto.
    historiaClinica: {
      // El campo id es el _id real del subdocumento (Mongoose lo autogenera en
      // cada elemento del arreglo) y lo necesitan los botones de editar y
      // eliminar un antecedente puntual.
      hereditarios: (patient?.clinical_history?.hereditary || []).map((h) => ({
        id: String(h._id),
        a: h.relationship || "—",
        b: h.condition || "—",
        tipo: h.type || "—",
      })),
      patologicos: (patient?.clinical_history?.pathological || []).map((p) => ({
        id: String(p._id),
        a: p.disease || "—",
        b: p.diagnosis || "—",
        tipo: p.type || "—",
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

  // Expediente completo de un paciente puntual, para el renderizado tipo
  // SPA. No dispara una petición nueva: reutiliza los pacientes que ya
  // trajo este hook.
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
