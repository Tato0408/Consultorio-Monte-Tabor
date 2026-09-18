import { useState, useEffect, useCallback } from "react";
import apiClient from "../../lib/apiClient";

// Devuelve el mes de hoy en formato YYYY-MM, en hora local.
const currentMonthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Mes calendario anterior a un "YYYY-MM" dado, también como "YYYY-MM".
const previousMonthISO = (monthValue) => {
  const [year, month] = monthValue.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Hook genérico que comparten los reportes de pacientes, doctores, inventario y citas
// (cada uno con su propio wrapper delgado, ver useAppointmentsReports.js). El filtro
// trabaja por mes y tiene tres modos: general (histórico completo, sin comparación),
// dos meses (monthA vs monthB) y un mes contra un promedio (monthA + avg).
const useReportData = (endpointPath) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);
  const [pdfData, setPdfData] = useState(null);

  // monthA y monthB son "YYYY-MM". avgMode es null (comparar contra
  // monthB) o "previous" | "next" | "all" (comparar monthA contra el
  // promedio de esos meses). Arranca en modo general.
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
      const data = await apiClient(endpointPath, { params });
      setTopCards(data.topCards || []);
      setSections(data.sections || []);
      setPdfData(data.pdf || null);
    } catch (err) {
      setError(err.message || "No se pudo cargar el reporte");
    } finally {
      setLoading(false);
    }
  }, [endpointPath, monthA, monthB, avgMode, isGeneral]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Elegir el primer mes activa el modo parametrizado. Si todavía no hay
  // un segundo mes ni un promedio elegido, se precarga monthB con el mes
  // anterior para que siempre haya una comparación válida.
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
  // avg vacío vuelve el segundo campo a "mes específico".
  const setAvgMode = (value) => {
    setIsGeneral(false);
    setAvgModeState(value || null);
  };
  // Siempre activa el modo general y limpia los selectores.
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

export default useReportData;
