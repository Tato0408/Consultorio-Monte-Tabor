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

  // Trae los 4 catálogos en paralelo con Promise.all.
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