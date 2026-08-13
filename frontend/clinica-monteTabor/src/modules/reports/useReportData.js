import { useState, useEffect, useCallback } from "react";
import apiClient from "../../lib/apiClient";

// Fecha de hoy en "YYYY-MM-DD" LOCAL — toISOString() convierte a UTC primero, lo que en zonas
// horarias detrás de UTC corre la fecha un día hacia atrás cerca de medianoche (mismo motivo
// documentado en backend/src/utils/reportDateRange.js para parseDateOnly).
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Hook genérico compartido por los 4 reportes (citas/pacientes/doctores/inventario).
// Cada uno solo difiere en el endpoint que consulta — toda la lógica de fecha/general/fetch
// vive aquí una sola vez.
const useReportData = (endpointPath) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);
  const [pdfData, setPdfData] = useState(null);
  // Vacíos por default — el usuario elige el inicio, el final, o ambos. Con solo el inicio
  // lleno, el backend interpreta "desde ahí hasta hoy"; con solo el final lleno, "desde el
  // inicio del histórico hasta ahí" (ver resolveRange en el backend).
  const [dateFrom, setDateFromRaw] = useState("");
  const [dateTo, setDateToRaw] = useState("");
  // Arranca en General (todo el histórico) — el rango de fechas queda disponible desde el
  // principio (nunca deshabilitado) para poder pasar a "parametrizado" con solo elegir una
  // fecha, en vez de tener que primero desactivar General con un clic aparte.
  const [isGeneral, setIsGeneral] = useState(true);

  const fetchReport = useCallback(async () => {
    // No tiene sentido pedir datos de una fecha que todavía no ha pasado — el input ya lo
    // bloquea con max={hoy} (ver ReportHeader.jsx), pero se valida también aquí por si acaso.
    const today = todayISO();
    if (!isGeneral && dateFrom && dateFrom > today) {
      setError("La fecha inicial no puede ser posterior a hoy.");
      setLoading(false);
      return;
    }
    if (!isGeneral && dateTo && dateTo > today) {
      setError("La fecha final no puede ser posterior a hoy.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiClient(endpointPath, {
        params: isGeneral ? { general: true } : { dateFrom, dateTo },
      });
      setTopCards(data.topCards || []);
      setSections(data.sections || []);
      setPdfData(data.pdf || null);
    } catch (err) {
      setError(err.message || "No se pudo cargar el reporte");
    } finally {
      setLoading(false);
    }
  }, [endpointPath, dateFrom, dateTo, isGeneral]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Elegir una fecha es lo que activa el modo parametrizado — no hace falta desactivar General
  // aparte, el rango de fechas ya está siempre disponible para usarse.
  const setDateFrom = (value) => { setIsGeneral(false); setDateFromRaw(value); };
  const setDateTo   = (value) => { setIsGeneral(false); setDateToRaw(value); };
  // A diferencia de antes, ya no es un toggle: siempre ACTIVA General (el rango de fechas se
  // desactiva solo al elegir una fecha, ver arriba), nunca lo alterna de vuelta a parametrizado.
  // También limpia los campos de fecha de vuelta a su estado vacío por default.
  const activateGeneral = () => {
    setIsGeneral(true);
    setDateFromRaw("");
    setDateToRaw("");
  };

  return {
    loading,
    error,
    topCards,
    sections,
    pdfData,
    dateFrom,
    dateTo,
    isGeneral,
    setDateFrom,
    setDateTo,
    activateGeneral,
    refetch: fetchReport,
  };
};

export default useReportData;
