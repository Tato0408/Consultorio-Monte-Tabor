import { useState, useEffect } from "react";

const API_URL = "http://localhost:4000/api/appointments";

const useAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Obtener todas las citas
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      setError(err.message || "Error al obtener las citas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Obtener una cita por ID
  const getAppointmentById = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      setError(err.message || "Error al obtener la cita");
      return null;
    }
  };

  // Crear cita
  const createAppointment = async (appointmentData) => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al crear la cita");
      }

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

  // Actualizar cita
  const updateAppointment = async (id, appointmentData) => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar la cita");
      }

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

  // Eliminar cita
  const deleteAppointment = async (id) => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

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