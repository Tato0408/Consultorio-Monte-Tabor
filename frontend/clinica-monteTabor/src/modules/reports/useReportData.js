import { useState, useEffect, useCallback } from "react";
import apiClient from "../../lib/apiClient";

// Rango por defecto: del primer día del mes actual a hoy — coincide exactamente con el
// default que aplica el backend cuando no se mandan dateFrom/dateTo, así que ambos lados
// arrancan sincronizados sin necesidad de un round-trip extra.
const firstDayOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};
const todayISO = () => new Date().toISOString().split("T")[0];

// Hook genérico compartido por los 4 reportes (citas/pacientes/doctores/inventario).
// Cada uno solo difiere en el endpoint que consulta — toda la lógica de fecha/general/fetch
// vive aquí una sola vez.
const useReportData = (endpointPath) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);
  const [pdfData, setPdfData] = useState(null);
  const [dateFrom, setDateFrom] = useState(firstDayOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [isGeneral, setIsGeneral] = useState(false);

  const fetchReport = useCallback(async () => {
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

  const toggleGeneral = () => setIsGeneral((prev) => !prev);

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
    toggleGeneral,
    refetch: fetchReport,
  };
};

export default useReportData;
