import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { sortByName } from "@/lib/utils";

// Agrupa el estado y las funciones necesarias para gestionar doctores, de
// forma que puedan reutilizarse en cualquier componente que use este hook.
export const useDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Cifras reales para las tarjetas de estadisticas, provienen de
  // /users/doctors y corresponden al sistema completo, no solo a este doctor.
  const [stats, setStats] = useState({ patients: 0, appointments: 0, procedures: 0 });

  // Obtiene la lista completa de doctores junto con las cifras de las
  // tarjetas de estadisticas (pacientes, citas y procedimientos).
  const getDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient("/doctors");

      // La tabla de gestión de doctores se muestra ordenada alfabéticamente
      // por el campo Nombre.
      setDoctors(sortByName(data));

      // Si alguna de estas peticiones falla (por ejemplo, sin permiso), la
      // cifra correspondiente queda en 0 en vez de tumbar toda la carga.
      const [patientsRes, appointmentsRes, proceduresRes] = await Promise.allSettled([
        apiClient("/doctors/countPatients"),
        apiClient("/doctors/countAppointments"),
        apiClient("/doctors/countProcedures"),
      ]);
      setStats({
        patients:     patientsRes.status === "fulfilled"     ? (patientsRes.value?.count     || 0) : 0,
        appointments: appointmentsRes.status === "fulfilled" ? (appointmentsRes.value?.count || 0) : 0,
        procedures:   proceduresRes.status === "fulfilled"   ? (proceduresRes.value?.count   || 0) : 0,
      });
    } catch (err) {
      console.error("Error al obtener los doctores:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca doctores por texto libre. Si el texto viene vacio, trae la lista
  // completa en lugar de hacer la peticion de busqueda.
  const searchDoctors = useCallback(async (search) => {
    try {
      setLoading(true);
      setError(null);

      if (!search.trim()) {
        return await getDoctors();
      }

      const data = await apiClient(
        `/doctors/search?search=${encodeURIComponent(search)}`
      );

      setDoctors(sortByName(data));
    } catch (err) {
      console.error("Error al buscar doctores:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getDoctors]);



  // Obtiene los datos de un solo doctor a partir de su id.
  const getDoctorById = async (id) => {
    try {
      return await apiClient(`/doctors/${id}`);
    } catch (err) {
      console.error(
        `Error al obtener el doctor con ID ${id}:`,
        err
      );
      throw err;
    }
  };

  // Registra un doctor nuevo enviando el formulario (datos e imagenes) y
  // refresca la lista general al terminar.
  const createDoctor = async (formData) => {
    try {
      const data = await apiClient("/doctors", {
        method: "POST",
        body: formData,
      });

      await getDoctors();

      return data;
    } catch (err) {
      console.error("Error al crear el doctor:", err);
      throw err;
    }
  };

  // Actualiza los datos de un doctor existente y refresca la lista general
  // al terminar.
  const updateDoctor = async (id, formData) => {
    try {
      const data = await apiClient(`/doctors/${id}`, {
        method: "PUT",
        body: formData,
      });

      await getDoctors();

      return data;
    } catch (err) {
      console.error(
        `Error al actualizar el doctor con ID ${id}:`,
        err
      );
      throw err;
    }
  };

  // Elimina un doctor por su id y refresca la lista general al terminar. Con
  // { cascade: true } se pide al backend eliminar tambien todas sus citas,
  // consultas y demas informacion relacionada (ver deleteDoctor en el
  // backend).
  const deleteDoctor = async (id, { cascade = false } = {}) => {
    try {
      const data = await apiClient(`/doctors/${id}${cascade ? "?cascade=true" : ""}`, {
        method: "DELETE",
      });

      await getDoctors();

      return data;
    } catch (err) {
      console.error(
        `Error al eliminar el doctor con ID ${id}:`,
        err
      );
      throw err;
    }
  };

  // Carga la lista de doctores al montar el componente que use este hook.
  useEffect(() => {
    getDoctors();
  }, [getDoctors]);

  return {
    doctors,
    loading,
    error,
    stats,
    getDoctors,
    searchDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
  };
};
