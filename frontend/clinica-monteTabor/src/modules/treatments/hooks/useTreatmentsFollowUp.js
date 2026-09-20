import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// Carga la lista de planes de tratamiento (GET /api/treatments) y expone
// las acciones de la pantalla: crear un plan a mano, editar su definición,
// programar el control, cambiar de estado (pausar, reanudar, cerrar,
// reabrir) y gestionar notas y documentos. Cada acción llama al endpoint
// correspondiente y refresca la lista en silencio.
const useTreatmentsFollowUp = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [treatments, setTreatments] = useState([]);

  // showLoading en false se usa después de una acción: ya hay datos en
  // pantalla y el modal que disparó la acción tiene su propio spinner, así
  // que no hace falta tapar todo con el esqueleto de carga otra vez.
  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await apiClient("/treatments");
      setStats(data.stats);
      setTreatments(data.treatments || []);
    } catch (err) {
      setError(err.message || "No se pudo cargar el listado de tratamientos.");
      setStats(null);
      setTreatments([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const create_treatment = useCallback(
    async (payload) => {
      const res = await apiClient("/treatments", { method: "POST", body: payload });
      await load(false);
      return res;
    },
    [load]
  );

  const update_plan = useCallback(
    async (id, payload) => {
      await apiClient(`/treatments/${id}`, { method: "PATCH", body: payload });
      await load(false);
    },
    [load]
  );

  const schedule_control = useCallback(
    async (id, next_control_date) => {
      await apiClient(`/treatments/${id}/control`, { method: "PATCH", body: { next_control_date } });
      await load(false);
    },
    [load]
  );

  const set_status = useCallback(
    async (id, payload) => {
      await apiClient(`/treatments/${id}/status`, { method: "PATCH", body: payload });
      await load(false);
    },
    [load]
  );

  const add_note = useCallback(
    async (id, text) => {
      await apiClient(`/treatments/${id}/notes`, { method: "POST", body: { text } });
      await load(false);
    },
    [load]
  );

  const update_note = useCallback(
    async (id, entry_id, text) => {
      await apiClient(`/treatments/${id}/timeline/${entry_id}`, { method: "PATCH", body: { text } });
      await load(false);
    },
    [load]
  );

  const delete_note = useCallback(
    async (id, entry_id) => {
      await apiClient(`/treatments/${id}/timeline/${entry_id}`, { method: "DELETE" });
      await load(false);
    },
    [load]
  );

  // A diferencia del resto, esta acción manda un archivo (FormData) y no
  // JSON. apiClient ya distingue el caso y omite el header Content-Type
  // para que el navegador arme el multipart.
  const upload_document = useCallback(
    async (id, file) => {
      const form_data = new FormData();
      form_data.append("document", file);
      await apiClient(`/treatments/${id}/documents`, { method: "POST", body: form_data });
      await load(false);
    },
    [load]
  );

  const delete_document = useCallback(
    async (id, document_id) => {
      await apiClient(`/treatments/${id}/documents/${document_id}`, { method: "DELETE" });
      await load(false);
    },
    [load]
  );

  // Borra el tratamiento completo (no solo un documento o una nota). Quien
  // llame debe salir de la vista de detalle después, ya que el id deja de
  // existir.
  const delete_treatment = useCallback(
    async (id) => {
      await apiClient(`/treatments/${id}`, { method: "DELETE" });
      await load(false);
    },
    [load]
  );

  return {
    loading,
    error,
    stats,
    treatments,
    // silent en true refresca la lista sin volver a mostrar el esqueleto
    // de carga, para usarlo tras una acción hecha desde el detalle.
    refetch: (silent = false) => load(!silent),
    create_treatment,
    update_plan,
    schedule_control,
    set_status,
    add_note,
    update_note,
    delete_note,
    upload_document,
    delete_document,
    delete_treatment,
  };
};

export default useTreatmentsFollowUp;
