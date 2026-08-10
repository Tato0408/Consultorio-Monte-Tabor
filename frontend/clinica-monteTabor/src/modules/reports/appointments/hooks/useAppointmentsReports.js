import { useCallback, useEffect, useState } from "react";
import apiClient from "../../../../lib/apiClient";

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const currentMonthStart = () => {
  const today = new Date();
  return toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1));
};

// Trae el reporte de citas (tarjetas, secciones y datos del PDF) según el
// rango de fechas elegido, o el histórico completo si isGeneral está activo.
const useAppointmentsReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);
  const [pdfData, setPdfData] = useState(null);
  const [dateFrom, setDateFrom] = useState(currentMonthStart);
  const [dateTo, setDateTo] = useState(() => toIsoDate(new Date()));
  const [isGeneral, setIsGeneral] = useState(false);

  // Se valida antes de pedir el reporte; en modo general no aplica.
  const fetchReport = useCallback(async () => {
    if (!isGeneral && dateFrom && dateTo && dateFrom > dateTo) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient("/reports/appointments", {
        params: isGeneral ? { general: true } : { dateFrom, dateTo },
      });

      setTopCards(Array.isArray(data.topCards) ? data.topCards : []);
      setSections(Array.isArray(data.sections) ? data.sections : []);
      setPdfData(data.pdf || null);
    } catch (requestError) {
      setTopCards([]);
      setSections([]);
      setPdfData(null);
      setError(requestError.message || "No se pudo cargar el reporte de citas.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, isGeneral]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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
    toggleGeneral: () => setIsGeneral((previous) => !previous),
    refetch: fetchReport,
  };
};

export default useAppointmentsReports;
