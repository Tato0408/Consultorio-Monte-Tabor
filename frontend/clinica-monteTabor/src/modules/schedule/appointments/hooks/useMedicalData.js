import { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// Centraliza los catálogos médicos (pacientes, doctores, enfermeras y
// procedimientos) usados por el módulo de citas.
const useMedicalData = () => {
  // Estado de cada catálogo.
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Trae los 4 catálogos en paralelo con Promise.allSettled: un catálogo al
  // que el rol actual no tenga acceso (ej. un doctor sin permiso para ver
  // enfermeras) no debe tumbar a los demás que sí están permitidos.
  const fetchMedicalData = useCallback(async () => {
    setLoadingData(true);

    const [patientsRes, doctorsRes, nursesRes, proceduresRes] = await Promise.allSettled([
      apiClient("/patients"),
      // Catálogo liviano, no requiere el permiso Ver Doctores/Ver Enfermeras. Cualquier rol
      // autenticado necesita esta lista para agendar una cita (ver
      // backend/src/routes/doctors/doctors.js y backend/src/routes/nurse/nurses.js). Antes
      // se pedía GET /nurses (exige users.nurses:view), que el rol enfermera no tiene: su
      // propia lista de enfermeras para procedimientos sin doctor quedaba vacía.
      apiClient("/doctors/catalog"),
      apiClient("/nurses/catalog"),
      apiClient("/procedures"),
    ]);

    if (patientsRes.status === "fulfilled") setPatients(patientsRes.value);
    else console.error("Error loading patients:", patientsRes.reason);

    if (doctorsRes.status === "fulfilled") setDoctors(doctorsRes.value);
    else console.error("Error loading doctors:", doctorsRes.reason);

    if (nursesRes.status === "fulfilled") setNurses(nursesRes.value);
    else console.error("Error loading nurses:", nursesRes.reason);

    if (proceduresRes.status === "fulfilled") setProcedures(proceduresRes.value);
    else console.error("Error loading procedures:", proceduresRes.reason);

    setLoadingData(false);
  }, []);

  // Carga inicial al montar el hook.
  useEffect(() => {
    fetchMedicalData();
  }, [fetchMedicalData]);

  // Consulta los horarios libres de un doctor para una fecha/duración dadas.
  const getAvailableSlots = async (doctorId, date, duration) => {
    try {
      const response = await apiClient(
        `/schedule/${doctorId}/slots`,
        {
          params: {
            date,
            duration,
          },
        }
      );

      return response.slots;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  // Agrega un procedimiento a la lista local sin esperar un refetch.
  const addLocalProcedure = useCallback((newProcedure) => {
    setProcedures((prev) => [...prev, newProcedure]);
  }, []);

  return {
    patients,
    doctors,
    nurses,
    procedures,
    loadingData,
    getAvailableSlots,
    addLocalProcedure,
    fetchMedicalData,
  };
};

export default useMedicalData;