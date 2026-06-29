
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

export const useDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==========================
  // GET ALL
  // ==========================
  const getDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient("/doctors");

      setDoctors(data);
    } catch (err) {
      console.error("Error al obtener los doctores:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================
  // SEARCH
  // ==========================
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

      setDoctors(data);
    } catch (err) {
      console.error("Error al buscar doctores:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getDoctors]);

  // ==========================
  // GET BY ID
  // ==========================
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

  // ==========================
  // CREATE
  // ==========================
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

  // ==========================
  // UPDATE
  // ==========================
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

  // ==========================
  // DELETE
  // ==========================
  const deleteDoctor = async (id) => {
    try {
      const data = await apiClient(`/doctors/${id}`, {
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

  useEffect(() => {
    getDoctors();
  }, [getDoctors]);

  return {
    doctors,
    loading,
    error,
    getDoctors,
    searchDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
  };
};