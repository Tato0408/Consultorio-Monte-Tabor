import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// Carga el detalle de un tratamiento (GET /api/treatments/:id): resumen
// del plan, línea de tiempo, documentos y medicación vigente. Se vuelve a
// pedir cada vez que cambia el id o cuando la pantalla lo pide tras una
// acción (refresh).
const useTreatmentDetail = (treatmentId) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (showLoading = true) => {
      if (!treatmentId) {
        setDetail(null);
        setLoading(false);
        return;
      }
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const data = await apiClient(`/treatments/${treatmentId}`);
        setDetail(data);
      } catch (err) {
        setError(err.message || "No se pudo cargar el tratamiento.");
        setDetail(null);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [treatmentId]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  return { detail, loading, error, refresh: () => load(false) };
};

export default useTreatmentDetail;
