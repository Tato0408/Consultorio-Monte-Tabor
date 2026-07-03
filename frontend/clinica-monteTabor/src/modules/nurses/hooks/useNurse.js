import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import apiClient from "../../../lib/apiClient";

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

      setNurses(Array.isArray(nursesData) ? nursesData : []);
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
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchNurses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message || "Error al crear registro" };
    }
  }, [fetchNurses]);

  const updateNurse = useCallback(async (id, formData) => {
    try {
      setError(null);
      await apiClient(`/nurses/${id}`, {
        method: "PUT",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchNurses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message || "Error al actualizar registro" };
    }
  }, [fetchNurses]);

  const deleteNurse = useCallback(async (nurse) => {
    const confirm = await Swal.fire({
      icon:               "warning",
      title:              "¿Eliminar enfermera?",
      text:               `Se eliminará a ${nurse.name} ${nurse.last_name}. Esta acción no se puede deshacer.`,
      showCancelButton:   true,
      confirmButtonText:  "Sí, eliminar",
      cancelButtonText:   "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor:  "#6b7280",
    });

    if (!confirm.isConfirmed) return;

    try {
      setError(null);
      await apiClient(`/nurses/${nurse._id}`, { method: "DELETE" });

      // Si la enfermera eliminada era la seleccionada, limpiar el panel
      if (selectedNurse?._id === nurse._id) {
        setSelectedNurse(null);
        setNextProcedure(null);
      }

      await fetchNurses();

      await Swal.fire({
        icon:             "success",
        title:            "¡Eliminada!",
        text:             "La enfermera fue eliminada correctamente.",
        confirmButtonColor: "#2563eb",
        timer:            2000,
        timerProgressBar: true,
      });
    } catch (err) {
      Swal.fire({
        icon:               "error",
        title:              "Error",
        text:               err.message || "No se pudo eliminar la enfermera.",
        confirmButtonColor: "#2563eb",
      });
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
    deleteNurse,    // ← exportado
    refetch: fetchNurses,
  };
};

export default useNurse;