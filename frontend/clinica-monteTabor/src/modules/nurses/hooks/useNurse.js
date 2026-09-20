import { useState, useEffect, useCallback } from "react";
import apiClient from "../../../lib/apiClient";
import { confirmDelete, confirmCascadeDelete, showSuccess, showError } from "../../../lib/alerts";
import { sortByName } from "../../../lib/utils";

const useNurse = () => {
  const [nurses, setNurses]               = useState([]);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [nextProcedure, setNextProcedure] = useState(null);
  const [stats, setStats]                 = useState({ nurses: 0, notes: 0, appointments: 0, procedures: 0 });
  const [loading, setLoading]             = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError]                 = useState(null);

  const fetchNurses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const nursesData = await apiClient("/nurses");
      const [nursesCountRes, notesCountRes, appointmentsCountRes, proceduresCountRes] = await Promise.allSettled([
        apiClient("/nurses/countNurses"),
        apiClient("/nurses/countNotes"),
        apiClient("/nurses/countAppointments"),
        apiClient("/nurses/countProcedures"),
      ]);

      // La tabla de gestión de enfermeras se muestra ordenada alfabéticamente
      // por el campo Nombre.
      setNurses(sortByName(nursesData));
      setStats({
        nurses:       nursesCountRes.status === "fulfilled"       ? (nursesCountRes.value?.count       || 0) : 0,
        notes:        notesCountRes.status === "fulfilled"        ? (notesCountRes.value?.count        || 0) : 0,
        appointments: appointmentsCountRes.status === "fulfilled" ? (appointmentsCountRes.value?.count || 0) : 0,
        procedures:   proceduresCountRes.status === "fulfilled"   ? (proceduresCountRes.value?.count   || 0) : 0,
      });
    } catch (err) {
      setError(err.message || "Error al cargar datos del módulo de enfermería");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNurses(); }, [fetchNurses]);

  const createNurse = useCallback(async (formData) => {
    try {
      setError(null);
      await apiClient("/nurses", {
        method: "POST",
        body: formData,
      });
      await fetchNurses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Error al crear registro" };
    }
  }, [fetchNurses]);

  const updateNurse = useCallback(async (id, formData) => {
    try {
      setError(null);
      await apiClient(`/nurses/${id}`, {
        method: "PUT",
        body: formData,
      });
      await fetchNurses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Error al actualizar registro" };
    }
  }, [fetchNurses]);

  const deleteNurse = useCallback(async (nurse) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar enfermera?",
      text: `Se eliminará a ${nurse.name} ${nurse.last_name}. Esta acción no se puede deshacer.`,
    });

    if (!confirmed) return;

    const afterDelete = () => {
      // Limpia el panel si la enfermera eliminada era la seleccionada
      if (selectedNurse?._id === nurse._id) {
        setSelectedNurse(null);
        setNextProcedure(null);
      }
      showSuccess("La enfermera fue eliminada correctamente.");
    };

    try {
      setError(null);
      await apiClient(`/nurses/${nurse._id}`, { method: "DELETE" });
      await fetchNurses();
      afterDelete();
    } catch (err) {
      // Si tiene citas o consultas relacionadas, el backend responde 409 y
      // pide una segunda confirmación reforzada antes de borrar también
      // todo lo relacionado (mismo flujo que doctores y pacientes).
      if (err.status === 409 && err.data?.code === "HAS_RELATED_RECORDS") {
        const cascadeConfirmed = await confirmCascadeDelete({
          subject: "enfermera",
          name: `${nurse.name} ${nurse.last_name}`.trim() || "esta enfermera",
          related: err.data.related,
        });
        if (!cascadeConfirmed) return;
        try {
          await apiClient(`/nurses/${nurse._id}?cascade=true`, { method: "DELETE" });
          await fetchNurses();
          afterDelete();
        } catch (cascadeErr) {
          showError(cascadeErr.message || "No se pudo eliminar la enfermera.");
        }
        return;
      }
      showError(err.message || "No se pudo eliminar la enfermera.");
    }
  }, [fetchNurses, selectedNurse]);

  // Al seleccionar una enfermera, además carga su próximo procedimiento agendado
  const selectNurse = useCallback(async (nurse) => {
    setSelectedNurse(nurse);
    setNextProcedure(null);
    setLoadingDetail(true);
    try {
      const appointments = await apiClient("/appointments", { params: { nurse_id: nurse._id } });
      const now = new Date();
      const upcoming = Array.isArray(appointments)
        ? appointments
            .filter((a) => new Date(a.date) >= now && ["pending", "scheduled"].includes(a.status))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
        : [];
      setNextProcedure(upcoming[0] || null);
    } catch {
      setNextProcedure(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNurse(null);
    setNextProcedure(null);
  }, []);

  return {
    nurses,
    selectedNurse,
    nextProcedure,
    stats,
    loading,
    loadingDetail,
    error,
    selectNurse,
    clearSelection,
    createNurse,
    updateNurse,
    deleteNurse,
    refetch: fetchNurses,
  };
};

export default useNurse;