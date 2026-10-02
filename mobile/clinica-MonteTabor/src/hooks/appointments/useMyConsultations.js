import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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

  // useFocusEffect (no un useEffect de solo montaje): AppointmentsScreen.jsx ("Mis
  // consultas") es una pantalla de pestaña que queda montada entre navegaciones
  // (tabSwitch, ver App.js) — con un useEffect normal, la lista de "Consultas
  // completadas" se pedía una sola vez al abrir la app y nunca se refrescaba sola al
  // volver a esta pestaña después de que se completara una consulta en otra parte;
  // solo un pull-to-refresh manual la actualizaba.
  useFocusEffect(
    useCallback(() => {
      fetchConsultations();
    }, [fetchConsultations])
  );

  return { consultations, loading, error, refetch: fetchConsultations };
};

export default useMyConsultations;
