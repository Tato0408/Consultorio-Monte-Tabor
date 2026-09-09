import { useCallback, useEffect, useState } from "react";
import apiClient from "../../../../lib/apiClient";

// Mes de hoy en formato YYYY-MM, en hora local.
const currentMonthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Mes calendario anterior a un "YYYY-MM" dado.
const previousMonthISO = (monthValue) => {
  const [year, month] = monthValue.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Trae el reporte de citas (tarjetas, secciones y datos del PDF). El
// filtro trabaja por mes: general (histórico), dos meses o un mes contra
// un promedio. Misma lógica que useReportData; citas conserva su copia
// porque siempre tuvo su propio hook.
const useAppointmentsReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);
  const [pdfData, setPdfData] = useState(null);

  const [monthA, setMonthAState] = useState("");
  const [monthB, setMonthBState] = useState("");
  const [avgMode, setAvgModeState] = useState(null);
  const [isGeneral, setIsGeneral] = useState(true);

  const fetchReport = useCallback(async () => {
    const thisMonth = currentMonthISO();
    if (!isGeneral && monthA && monthA > thisMonth) {
      setError("El mes elegido no puede ser posterior al mes actual.");
      setLoading(false);
      return;
    }
    if (!isGeneral && !avgMode && monthB && monthB === monthA) {
      setError("Elige dos meses distintos para compararlos.");
      setLoading(false);
      return;
    }

    let params = { general: true };
    if (!isGeneral && monthA) {
      if (avgMode) params = { monthA, avg: avgMode };
      else if (monthB) params = { monthA, monthB };
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiClient("/reports/appointments", { params });
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
  }, [monthA, monthB, avgMode, isGeneral]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const setMonthA = (value) => {
    setIsGeneral(false);
    setMonthAState(value);
    if (value && !avgMode && !monthB) setMonthBState(previousMonthISO(value));
  };
  const setMonthB = (value) => {
    setIsGeneral(false);
    setAvgModeState(null);
    setMonthBState(value);
  };
  const setAvgMode = (value) => {
    setIsGeneral(false);
    setAvgModeState(value || null);
  };
  const activateGeneral = () => {
    setIsGeneral(true);
    setMonthAState("");
    setMonthBState("");
    setAvgModeState(null);
  };

  return {
    loading,
    error,
    topCards,
    sections,
    pdfData,
    monthA,
    monthB,
    avgMode,
    isGeneral,
    setMonthA,
    setMonthB,
    setAvgMode,
    activateGeneral,
    refetch: fetchReport,
  };
};

export default useAppointmentsReports;
