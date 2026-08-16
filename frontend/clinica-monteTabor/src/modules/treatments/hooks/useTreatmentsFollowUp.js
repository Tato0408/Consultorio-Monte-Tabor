import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// Consulta GET /api/treatments/follow-up, que arma el seguimiento real de
// cada paciente a partir de su historial de procedimientos, y expone las
// acciones del panel del paciente: actualizar evolucion, agregar nota,
// programar control, cambiar estado y dar de alta.
const useTreatmentsFollowUp = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [upcomingControls, setUpcomingControls] = useState([]);

  // showLoading en false se usa despues de una accion (guardar nota,
  // programar control, etc.). Ya hay datos en pantalla y el modal que
  // disparo la accion tiene su propio spinner, por lo que no hace falta
  // tapar toda la pantalla con el skeleton de carga inicial otra vez.
  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await apiClient("/treatments/follow-up");
      setStats(data.stats);
      setPatients(data.patients || []);
      setChartData(data.chartData || []);
      setUpcomingControls(data.upcomingControls || []);
    } catch (err) {
      setError(err.message || "No se pudo cargar el seguimiento de pacientes.");
      setStats(null);
      setPatients([]);
      setChartData([]);
      setUpcomingControls([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  // Las 4 acciones del panel de tratamiento llaman al endpoint
  // correspondiente y refrescan la lista completa en silencio, para que el
  // paciente seleccionado, la tabla y las estadisticas queden al dia con lo
  // que se acaba de guardar.
  const updateEvolution = useCallback(
    async (patientId, result) => {
      await apiClient(`/treatments/${patientId}/evolution`, { method: "PATCH", body: { result } });
      await load(false);
    },
    [load]
  );

  const deleteEvolution = useCallback(
    async (patientId) => {
      await apiClient(`/treatments/${patientId}/evolution`, { method: "DELETE" });
      await load(false);
    },
    [load]
  );

  const addNote = useCallback(
    async (patientId, text) => {
      await apiClient(`/treatments/${patientId}/notes`, { method: "POST", body: { text } });
      await load(false);
    },
    [load]
  );

  const updateNote = useCallback(
    async (patientId, noteId, text) => {
      await apiClient(`/treatments/${patientId}/notes/${noteId}`, { method: "PATCH", body: { text } });
      await load(false);
    },
    [load]
  );

  const deleteNote = useCallback(
    async (patientId, noteId) => {
      await apiClient(`/treatments/${patientId}/notes/${noteId}`, { method: "DELETE" });
      await load(false);
    },
    [load]
  );

  // A diferencia de las demas acciones, esta manda un archivo (FormData) y
  // no JSON. apiClient ya sabe distinguirlo (ver lib/apiClient.js) y omite
  // el header Content-Type para que el navegador arme el boundary del
  // multipart correctamente.
  const uploadDocument = useCallback(
    async (patientId, file) => {
      const formData = new FormData();
      formData.append("document", file);
      await apiClient(`/treatments/${patientId}/documents`, { method: "POST", body: formData });
      await load(false);
    },
    [load]
  );

  const deleteDocument = useCallback(
    async (patientId, documentId) => {
      await apiClient(`/treatments/${patientId}/documents/${documentId}`, { method: "DELETE" });
      await load(false);
    },
    [load]
  );

  const scheduleControl = useCallback(
    async (patientId, followUpDate) => {
      await apiClient(`/treatments/${patientId}/follow-up`, {
        method: "PATCH",
        body: { follow_up_date: followUpDate },
      });
      await load(false);
    },
    [load]
  );

  // status es "En tratamiento", "Requiere revisión", "Finalizado" o "auto"
  // (este último borra el estado manual y vuelve a dejar que el backend lo
  // calcule solo a partir de la fecha de control).
  const setStatus = useCallback(
    async (patientId, status) => {
      await apiClient(`/treatments/${patientId}/status`, { method: "PATCH", body: { status } });
      await load(false);
    },
    [load]
  );

  const discharge = useCallback(
    async (patientId) => {
      await apiClient(`/treatments/${patientId}/discharge`, { method: "PATCH" });
      await load(false);
    },
    [load]
  );

  return {
    loading,
    error,
    stats,
    patients,
    chartData,
    upcomingControls,
    refetch: () => load(true),
    updateEvolution,
    deleteEvolution,
    addNote,
    updateNote,
    deleteNote,
    uploadDocument,
    deleteDocument,
    scheduleControl,
    setStatus,
    discharge,
  };
};

export default useTreatmentsFollowUp;
