import { useCallback, useEffect, useState } from "react";
import apiClient from "../../../../lib/apiClient";

// Devuelve la fecha de hoy en formato YYYY-MM-DD, en hora local. El
// método toISOString convierte primero a UTC, lo que en zonas horarias
// detrás de UTC retrocede la fecha un día cerca de la medianoche (mismo
// motivo documentado en backend/src/utils/reportDateRange.js, función
// parseDateOnly).
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Trae el reporte de citas (tarjetas, secciones y datos del PDF) según el
// rango de fechas elegido, o el histórico completo si isGeneral está activo.
const useAppointmentsReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);
  const [pdfData, setPdfData] = useState(null);
  // Vacíos por defecto, el usuario elige el inicio, el final o ambos. Si
  // solo llena el inicio, el backend interpreta el rango desde ahí hasta
  // hoy. Si solo llena el final, interpreta desde el inicio del histórico
  // hasta ahí (ver resolveRange en el backend).
  const [dateFrom, setDateFromRaw] = useState("");
  const [dateTo, setDateToRaw] = useState("");
  // Arranca en modo General (todo el histórico). El rango de fechas queda
  // disponible desde el principio, nunca deshabilitado, para poder pasar a
  // modo parametrizado con solo elegir una fecha, en vez de tener que
  // desactivar General primero con un clic aparte.
  const [isGeneral, setIsGeneral] = useState(true);

  // Se valida antes de pedir el reporte. En modo general no aplica.
  const fetchReport = useCallback(async () => {
    const today = todayISO();
    // No tiene sentido pedir datos de una fecha que todavía no ha pasado. El
    // input ya lo bloquea con el atributo max (ver ReportHeader.jsx), pero se
    // valida también aquí por si acaso.
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

  // Elegir una fecha activa el modo parametrizado. No hace falta desactivar
  // General aparte: el rango de fechas ya está siempre disponible para
  // usarse.
  const setDateFrom = (value) => { setIsGeneral(false); setDateFromRaw(value); };
  const setDateTo   = (value) => { setIsGeneral(false); setDateToRaw(value); };
  // No es un interruptor: siempre activa el modo General. El rango de
  // fechas se desactiva solo al elegir una fecha (ver el comentario
  // anterior) y nunca vuelve a alternar hacia el modo parametrizado.
  // También limpia los campos de fecha a su estado vacío por defecto.
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

export default useAppointmentsReports;
