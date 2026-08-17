import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";


export const useReceptionist = () => {
  const [receptionists, setReceptionists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtiene la lista completa de recepcionistas desde el backend.
  const getReceptionists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // apiClient por defecto hace un GET y sabe a dónde apuntar
      const data = await apiClient("/recepcionist");

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
      const data = await apiClient(`/recepcionist/${id}`);
      return data;
    } catch (error) {
      console.error(`Error al obtener el recepcionista ${id}:`, error);
      throw error;
    }
  };

  // Registra un recepcionista nuevo enviando el formulario (datos e imagen).
  const createReceptionist = async (formData) => {
    try {
      const data = await apiClient("/recepcionist", {
        method: "POST",
        body: formData, // apiClient detecta automáticamente el FormData
      });
      return data;
    } catch (error) {
      console.error("Error al crear el recepcionista:", error);
      throw error;
    }
  };

  // Actualiza los datos de un recepcionista existente.
  const updateReceptionist = async (id, formData) => {
    try {
      const data = await apiClient(`/recepcionist/${id}`, {
        method: "PUT",
        body: formData, // apiClient detecta automáticamente el FormData
      });
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

      // Aprovechamos la propiedad "params" de tu apiClient
      const data = await apiClient("/recepcionist/search", {
        params: { search }
      });

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
      const data = await apiClient(`/recepcionist/${id}`, {
        method: "DELETE",
      });
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
