import { useState, useEffect, useCallback } from "react";
import apiClient from "../../../lib/apiClient";

const useNurse = () => {
  const [nurses, setNurses]               = useState([]);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [nextProcedure, setNextProcedure] = useState(null);
  const [stats, setStats]                 = useState({ nurses: 0, notes: 0, appointments: 0, procedures: 0 });
  const [loading, setLoading]             = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError]                 = useState(null);

  // Carga inicial de datos
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
        nurses:       nursesCountRes.status === "fulfilled"       ? (nursesCountRes.value?.count || 0)       : 0,
        notes:        notesCountRes.status === "fulfilled"        ? (notesCountRes.value?.count || 0)        : 0,
        appointments: appointmentsCountRes.status === "fulfilled" ? (appointmentsCountRes.value?.count || 0) : 0,
        procedures:   proceduresCountRes.status === "fulfilled"   ? (proceduresCountRes.value?.count || 0)   : 0,
      });
    } catch (err) {
      setError(err.message || "Error al cargar datos del módulo de enfermería");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNurses();
  }, [fetchNurses]);

  // ─── Crear Enfermera Actualizado ─────────────────────────────────────────────
  const createNurse = useCallback(async (formData) => {
    try {
      setError(null);
      
      // Usar .post directo ayuda a Axios a identificar el FormData de forma nativa
      await apiClient("/nurses", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        }
      });

      await fetchNurses(); 
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message || "Error al crear registro" };
    }
  }, [fetchNurses]);

  // ─── Editar Enfermera (Solución Definitiva) ──────────────────────────────
  const updateNurse = useCallback(async (id, formData) => {
    try {
      setError(null);

      // Usar .put directo pasando el ID en la URL
      await apiClient(`/nurses/${id}`, {
        method: "PUT",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        }
      });

      await fetchNurses(); 
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message || "Error al actualizar registro" };
    }
  }, [fetchNurses]);

  const selectNurse = useCallback(async (nurse) => {
    setSelectedNurse(nurse);
    setNextProcedure(null);
    setLoadingDetail(true);
    try {
      const appointments = await apiClient("/appointments", { params: { nurse_id: nurse._id } });
      const now = new Date();
      const upcoming = Array.isArray(appointments)
        ? appointments
            .filter((a) => {
              const apptDate = new Date(a.date);
              return apptDate >= now && (a.status === "pending" || a.status === "scheduled");
            })
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
    refetch: fetchNurses,
  };
};

export default useNurse;