import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient"

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

      const data = await apiClient("/appointments");
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
      const data = await apiClient(`/appointments/${id}`);
      return data;
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

      await apiClient("/appointments", {
        method: "POST",
        body: appointmentData,
      });

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

      await apiClient(`/appointments/${id}`, {
        method: "PUT",
        body: appointmentData,
      });

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

      await apiClient(`/appointments/${id}`, {
        method: "DELETE"
      });

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
