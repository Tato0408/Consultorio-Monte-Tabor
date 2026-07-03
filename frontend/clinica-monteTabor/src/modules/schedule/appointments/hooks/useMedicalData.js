import { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// Hook que centraliza toda la data "de catálogo" que necesita el módulo de
// citas: pacientes, doctores, enfermeras y procedimientos. La idea es pedirla
// una sola vez aquí en vez de repetir la misma lógica de fetch en cada
// formulario/página que la necesite.
const useMedicalData = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Trae los 4 catálogos en paralelo con Promise.all en vez de uno por uno,
  // para no esperar 4 requests en cadena cuando pueden ir todos a la vez.
  const fetchMedicalData = useCallback(async () => {
    try {
      setLoadingData(true);

      const [
        patientsData,
        doctorsData,
        nursesData,
        proceduresData,
      ] = await Promise.all([
        apiClient("/patients"),
        apiClient("/doctors"),
        apiClient("/nurses"),
        apiClient("/procedures"),
      ]);

      setPatients(patientsData);
      setDoctors(doctorsData);
      setNurses(nursesData);
      setProcedures(proceduresData);
    } catch (error) {
      console.error("Error loading medical data:", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Carga inicial en cuanto se monta cualquier componente que use este hook.
  useEffect(() => {
    fetchMedicalData();
  }, [fetchMedicalData]);

  // Consulta los horarios libres de un doctor para una fecha y duración
  // puntual. Esto es lo que usa AppointmentsForm para pintar los botones de
  // horario disponibles una vez que ya se eligió doctor + fecha.
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

  // Mete un procedimiento nuevo directo en la lista local sin esperar un
  // refetch. Queda disponible para actualizaciones optimistas, aunque en la
  // práctica ProcedureModal termina llamando fetchMedicalData de todos modos
  // para traer el procedimiento ya con su _id real del backend.
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