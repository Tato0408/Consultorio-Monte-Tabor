import { useState, useEffect, useCallback } from "react";

const API_URL = "http://localhost:4000/api/recepcionist";

export const useReceptionist = () => {
  const [receptionists, setReceptionists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtiene la lista completa de recepcionistas desde el backend.
  const getReceptionists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_URL, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      setReceptionists(data);

      return data;
    } catch (error) {
      console.error("Error al obtener los recepcionistas:", error);

      setError(error.message);

      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtiene los datos de un solo recepcionista a partir de su id.
  const getReceptionistById = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error al obtener el recepcionista ${id}:`, error);
      throw error;
    }
  };

  // Registra un recepcionista nuevo enviando el formulario (datos e imagen).
  const createReceptionist = async (formData) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("Error al crear el recepcionista:", error);
      throw error;
    }
  };

  // Actualiza los datos de un recepcionista existente.
  const updateReceptionist = async (id, formData) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`Error al actualizar el recepcionista ${id}:`, error);
      throw error;
    }
  };

  // Busca recepcionistas por texto libre. Si el texto viene vacio, trae la
  // lista completa en lugar de hacer la peticion de busqueda.
  const searchRecepcionist = useCallback(async (search) => {
    try {
      setLoading(true);
      setError(null);

      if (!search.trim()) {
        return await getReceptionists();
      }

      const response = await fetch(
        `${API_URL}/search?search=${encodeURIComponent(search)}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP: ${response.status}`);
      }

      setReceptionists(data);
    } catch (err) {
      console.error("Error al buscar recepcionistas:", err);

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getReceptionists]);

  // Elimina un recepcionista por su id.
  const deleteReceptionist = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`Error al eliminar el recepcionista ${id}:`, error);
      throw error;
    }
  };

  // Carga la lista de recepcionistas al montar el componente que use este hook.
  useEffect(() => {
    getReceptionists();
  }, [getReceptionists]);

  return {
    receptionists,
    loading,
    error,
    getReceptionists,
    getReceptionistById,
    createReceptionist,
    updateReceptionist,
    searchRecepcionist,
    deleteReceptionist,
  };
};
