import { useState, useEffect, useCallback } from "react";
import apiClient from "../../../lib/apiClient";
import { confirmDelete, confirmCascadeDelete, showSuccess, showError } from "../../../lib/alerts";
import { sortByName } from "../../../lib/utils";

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
      // La tabla de gestión de pacientes se muestra ordenada alfabéticamente
      // por el campo Nombre.
      setPatients(sortByName(data));
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

  // Al confirmar el borrado se llama al backend sin cascade. Si el paciente
  // tiene citas o consultas, el backend responde 409 con el conteo: se pide
  // una segunda confirmacion reforzada y, si se acepta, se reintenta con
  // ?cascade=true para eliminar tambien todo lo relacionado.
  const deletePatient = useCallback(async (patient) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar paciente?",
      text: `Se eliminará a ${patient.name} ${patient.last_name}. Esta acción no se puede deshacer.`,
    });

    if (!confirmed) return;

    const removeFromState = async () => {
      setSelectedPatient((prev) => (prev?._id === patient._id ? null : prev));
      await fetchPatients();
      showSuccess("El paciente fue eliminado correctamente.");
    };

    try {
      setError(null);
      await apiClient(`/patients/${patient._id}`, { method: "DELETE" });
      await removeFromState();
    } catch (err) {
      if (err.status === 409 && err.data?.code === "HAS_RELATED_RECORDS") {
        const cascadeConfirmed = await confirmCascadeDelete({
          subject: "paciente",
          name: `${patient.name} ${patient.last_name}`,
          related: err.data.related,
        });
        if (!cascadeConfirmed) return;
        try {
          await apiClient(`/patients/${patient._id}?cascade=true`, { method: "DELETE" });
          await removeFromState();
        } catch (cascadeErr) {
          showError(cascadeErr.message || "No se pudo eliminar el paciente.");
        }
        return;
      }
      showError(err.message || "No se pudo eliminar el paciente.");
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
