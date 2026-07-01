import { useState, useEffect, useCallback } from "react";
import apiClient from "../../../lib/apiClient";

const useNurse = () => {
  const [nurses, setNurses]           = useState([]);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [nextProcedure, setNextProcedure] = useState(null);
  const [stats, setStats]             = useState({ nurses: 0, notes: 0, appointments: 0, procedures: 0 });
  const [loading, setLoading]         = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError]             = useState(null);

  // ─── Carga inicial: lista de enfermeras + stats de cards superiores ───────
  const fetchNurses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Todas las enfermeras
      const nursesData = await apiClient("/nurses");

      // Stats de cards superiores en paralelo
      const [notesData, appointmentsData, proceduresData] = await Promise.allSettled([
        apiClient("/nurse-notes"),       // notas de enfermería
        apiClient("/appointments"),      // citas atendidas
        apiClient("/procedures"),        // procedimientos
      ]);

      setNurses(Array.isArray(nursesData) ? nursesData : []);

      setStats({
        nurses:       Array.isArray(nursesData)                                ? nursesData.length                              : 0,
        notes:        notesData.status === "fulfilled" && Array.isArray(notesData.value)           ? notesData.value.length         : 0,
        appointments: appointmentsData.status === "fulfilled" && Array.isArray(appointmentsData.value) ? appointmentsData.value.filter(a => a.status === "completed").length : 0,
        procedures:   proceduresData.status === "fulfilled" && Array.isArray(proceduresData.value)     ? proceduresData.value.length    : 0,
      });
    } catch (err) {
      setError(err.message || "Error al cargar enfermeras");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNurses();
  }, [fetchNurses]);

  // ─── Selección de enfermera: busca su próximo procedimiento ──────────────
  const selectNurse = useCallback(async (nurse) => {
    setSelectedNurse(nurse);
    setNextProcedure(null);
    setLoadingDetail(true);

    try {
      // Buscamos citas de esta enfermera que sean futuras y estén pendientes
      const appointments = await apiClient("/appointments", {
        params: { nurse_id: nurse._id },
      });

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

  // ─── Deseleccionar ───────────────────────────────────────────────────────
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
    refetch: fetchNurses,
  };
};

export default useNurse;