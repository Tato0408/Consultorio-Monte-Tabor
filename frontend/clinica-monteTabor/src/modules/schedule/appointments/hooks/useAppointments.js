import { useState, useEffect } from "react";

const API_URL = "https://clinica-monte-tabor.onrender.com/api/appointments";

const OPTS = { credentials: "include" };

// Maneja el listado de citas y las operaciones CRUD contra la API
// (crear, actualizar, eliminar, obtener por id). Mantiene el estado de
// carga, envío, error y mensaje, y refresca la lista tras cada
// operación que modifica datos.
const useAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, OPTS);

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const data = await response.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error al obtener las citas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const getAppointmentById = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, OPTS);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      return await response.json();
    } catch (err) {
      setError(err.message || "Error al obtener la cita");
      return null;
    }
  };

  const createAppointment = async (appointmentData) => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch(API_URL, {
        ...OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al crear la cita");

      setMessage("Cita creada correctamente");
      await fetchAppointments();
      return true;
    } catch (err) {
      setError(err.message || "Error al crear la cita");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateAppointment = async (id, appointmentData) => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/${id}`, {
        ...OPTS,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al actualizar la cita");

      setMessage("Cita actualizada correctamente");
      await fetchAppointments();
      return true;
    } catch (err) {
      setError(err.message || "Error al actualizar la cita");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAppointment = async (id) => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/${id}`, { ...OPTS, method: "DELETE" });
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      setMessage("Cita eliminada correctamente");
      await fetchAppointments();
    } catch (err) {
      setError(err.message || "Error al eliminar la cita");
    }
  };

  return {
    appointments,
    loading,
    submitting,
    error,
    message,
    fetchAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
};

export default useAppointments;
