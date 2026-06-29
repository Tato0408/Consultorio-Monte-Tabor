import { useState, useEffect } from "react";

const API_URL =
  "http://localhost:4000/api/receptionists";

export const useReceptionists = () => {
  const [receptionists, setReceptionists] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  // ==========================
  // GET ALL
  // ==========================
  const getReceptionists = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_URL, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Error HTTP: ${response.status}`
        );
      }

      const data = await response.json();

      setReceptionists(data);

      return data;
    } catch (error) {
      console.error(
        "Error al obtener los recepcionistas:",
        error
      );

      setError(error.message);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // GET BY ID
  // ==========================
  const getReceptionistById = async (id) => {
    try {
      const response = await fetch(
        `${API_URL}/${id}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error HTTP: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Error al obtener el recepcionista ${id}:`,
        error
      );

      throw error;
    }
  };

  // ==========================
  // CREATE
  // ==========================
  const createReceptionist = async (
    formData
  ) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Error HTTP: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error(
        "Error al crear el recepcionista:",
        error
      );

      throw error;
    }
  };

  // ==========================
  // UPDATE
  // ==========================
  const updateReceptionist = async (
    id,
    formData
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: "PUT",
          credentials: "include",
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Error HTTP: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error(
        `Error al actualizar el recepcionista ${id}:`,
        error
      );

      throw error;
    }
  };

  // ==========================
  // DELETE
  // ==========================
  const deleteReceptionist =
    async (id) => {
      try {
        const response = await fetch(
          `${API_URL}/${id}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              `Error HTTP: ${response.status}`
          );
        }

        return data;
      } catch (error) {
        console.error(
          `Error al eliminar el recepcionista ${id}:`,
          error
        );

        throw error;
      }
    };

  useEffect(() => {
    getReceptionists();
  }, []);

  return {
    receptionists,
    loading,
    error,
    getReceptionists,
    getReceptionistById,
    createReceptionist,
    updateReceptionist,
    deleteReceptionist,
  };
};