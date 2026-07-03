import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import apiClient from "../../../lib/apiClient";

const usePatients = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient("/patients");
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error al cargar los pacientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const createPatient = useCallback(async (payload) => {
    try {
      setError(null);
      await apiClient("/patients", { method: "POST", body: payload });
      await fetchPatients();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Error al crear el paciente" };
    }
  }, [fetchPatients]);

  const updatePatient = useCallback(async (id, payload) => {
    try {
      setError(null);
      await apiClient(`/patients/${id}`, { method: "PUT", body: payload });
      await fetchPatients();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Error al actualizar el paciente" };
    }
  }, [fetchPatients]);

  const deletePatient = useCallback(async (patient) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar paciente?",
      text: `Se eliminará a ${patient.name} ${patient.last_name}. Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (!confirm.isConfirmed) return;

    try {
      setError(null);
      await apiClient(`/patients/${patient._id}`, { method: "DELETE" });

      setSelectedPatient((prev) => (prev?._id === patient._id ? null : prev));

      await fetchPatients();

      await Swal.fire({
        icon: "success",
        title: "¡Eliminado!",
        text: "El paciente fue eliminado correctamente.",
        confirmButtonColor: "#2563eb",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "No se pudo eliminar el paciente.",
        confirmButtonColor: "#2563eb",
      });
    }
  }, [fetchPatients]);

  const selectPatient = useCallback((patient) => setSelectedPatient(patient), []);
  const clearSelection = useCallback(() => setSelectedPatient(null), []);

  return {
    patients,
    selectedPatient,
    loading,
    error,
    selectPatient,
    clearSelection,
    createPatient,
    updatePatient,
    deletePatient,
    refetch: fetchPatients,
  };
};

export default usePatients;
