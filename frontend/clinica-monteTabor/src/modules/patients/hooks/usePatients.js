import { useState, useEffect, useCallback } from "react";
import apiClient from "../../../lib/apiClient";
import { confirmDelete, confirmCascadeDelete, confirmDeleteLocked, showSuccess, showError } from "../../../lib/alerts";
import { sortByName } from "../../../lib/utils";

// 1 año en milisegundos: un paciente solo puede eliminarse pasado ese plazo
// desde su registro (el backend también lo valida, ver deletePatient).
const DELETE_LOCK_MS = 365 * 24 * 60 * 60 * 1000;
const unlockDateOf = (patient) => {
  const registered = patient.createdAt || patient.created_at;
  return registered ? new Date(new Date(registered).getTime() + DELETE_LOCK_MS) : null;
};

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

  // Marca el paciente como inactivo (alternativa al borrado durante el primer
  // año): deja de mostrarse en las vistas clínicas sin perder su información.
  const setPatientInactive = useCallback(async (patient) => {
    try {
      setError(null);
      await apiClient(`/patients/${patient._id}`, { method: "PUT", body: { is_active: false } });
      setSelectedPatient((prev) => (prev?._id === patient._id ? { ...prev, is_active: false } : prev));
      await fetchPatients();
      showSuccess("El paciente se marcó como inactivo.");
    } catch (err) {
      showError(err.message || "No se pudo cambiar el estado del paciente.");
    }
  }, [fetchPatients]);

  // Al confirmar el borrado se llama al backend sin cascade. Si el paciente
  // tiene citas o consultas, el backend responde 409 con el conteo: se pide
  // una segunda confirmacion reforzada y, si se acepta, se reintenta con
  // ?cascade=true para eliminar tambien todo lo relacionado. Si el paciente se
  // registró hace menos de un año, no se puede eliminar todavía: solo se ofrece
  // marcarlo como inactivo.
  const deletePatient = useCallback(async (patient) => {
    const unlockAt = unlockDateOf(patient);

    // Bloqueo del primer año, chequeado también en el front para no mostrar un
    // "confirmar" que el backend va a rechazar de todos modos.
    if (unlockAt && Date.now() < unlockAt.getTime()) {
      const goInactive = await confirmDeleteLocked({
        name: `${patient.name} ${patient.last_name}`,
        unlockDate: unlockAt,
        isActive: patient.is_active !== false,
      });
      if (goInactive) await setPatientInactive(patient);
      return;
    }

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
      // Respaldo: si el front no tenía createdAt (registro viejo) el backend
      // igual bloquea el borrado durante el primer año.
      if (err.status === 409 && err.data?.code === "DELETE_LOCKED") {
        const goInactive = await confirmDeleteLocked({
          name: `${patient.name} ${patient.last_name}`,
          unlockDate: err.data.unlockDate,
          isActive: patient.is_active !== false,
        });
        if (goInactive) await setPatientInactive(patient);
        return;
      }
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
  }, [fetchPatients, setPatientInactive]);

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
