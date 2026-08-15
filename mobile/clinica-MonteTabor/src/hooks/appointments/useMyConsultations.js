import { useState, useCallback, useEffect } from "react";
import apiClient from "../../lib/apiClient";

// Trae el historial de "Mis consultas" del paciente autenticado (GET /patientAccount/consultations).
// El backend ya arma cada tarjeta lista para pintar: cita + consulta (si ya fue atendida) +
// receta/referencia/incapacidad cruzadas, así que acá solo se maneja el estado de carga.
export const useMyConsultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConsultations = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient("/patientAccount/consultations");
      setConsultations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudo cargar tu historial de consultas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  return { consultations, loading, error, refetch: fetchConsultations };
};

export default useMyConsultations;
