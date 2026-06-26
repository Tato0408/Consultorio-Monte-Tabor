import { useState, useEffect } from "react";

const API_URL = "http://localhost:4000/api/doctors";

export const useDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // GET ALL
  const getDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error("Error al obtener los doctores:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // GET BY ID
  const getDoctorById = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Error al obtener el doctor con ID ${id}:`,
        error
      );
      throw error;
    }
  };

  // CREATE
  const createDoctor = async (formData) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Error HTTP: ${response.status}`
        );
      }

      await getDoctors();

      return data;
    } catch (error) {
      console.error(
        "Error al crear el doctor:",
        error
      );
      throw error;
    }
  };

  // UPDATE
  const updateDoctor = async (
    id,
    formData
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: "PUT",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Error HTTP: ${response.status}`
        );
      }

      await getDoctors();

      return data;
    } catch (error) {
      console.error(
        `Error al actualizar el doctor con ID ${id}:`,
        error
      );
      throw error;
    }
  };

  // DELETE
  const deleteDoctor = async (id) => {
    try {
      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Error HTTP: ${response.status}`
        );
      }

      await getDoctors();

      return data;
    } catch (error) {
      console.error(
        `Error al eliminar el doctor con ID ${id}:`,
        error
      );
      throw error;
    }
  };

  useEffect(() => {
    getDoctors();
  }, []);

  return {
    doctors,
    loading,
    error,
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
  };
};