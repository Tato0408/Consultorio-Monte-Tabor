import { useState, useEffect, useCallback } from "react";

const API_URL = "http://localhost:4000/api/recepcionist";

export const useReceptionist = () => {
  //Estados principales del hook
  const [receptionists, setReceptionists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  //Funcion para obtener todos los recepcionistas
  const getReceptionists = useCallback(async () => {
    try {
      //Activamos el loading y limpiamos errores anteriores
      setLoading(true);
      setError(null);

      //Hacemos la peticion al backend
      const response = await fetch(API_URL, {
        credentials: "include",
      });

      //Si ocurre un error lanzamos la excepcion
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      //Convertimos la respuesta a json
      const data = await response.json();

      //Guardamos los datos en el estado
      setReceptionists(data);

      return data;
    } catch (error) {
      console.error("Error al obtener los recepcionistas:", error);

      //Guardamos el mensaje del error
      setError(error.message);

      throw error;
    } finally {
      //Al terminar quitamos el loading
      setLoading(false);
    }
  }, []);

  // ==========================
  // GET BY ID
  // ==========================

  //Obtiene un recepcionista por su id
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

  // ==========================
  // CREATE
  // ==========================

  //Funcion para registrar un recepcionista
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

  // ==========================
  // UPDATE
  // ==========================

  //Funcion para actualizar un recepcionista
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

  // ==========================
  // SEARCH (Corregido usando fetch nativo)
  // ==========================

  //Funcion para buscar recepcionistas
  const searchRecepcionist = useCallback(async (search) => {
    try {
      //Activamos loading y limpiamos errores
      setLoading(true);
      setError(null);

      //Si el buscador esta vacio mostramos todos los registros
      if (!search.trim()) {
        return await getReceptionists();
      }

      //Enviamos el texto de busqueda al backend
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

      //Actualizamos la lista con los resultados encontrados
      setReceptionists(data);
    } catch (err) {
      console.error("Error al buscar recepcionistas:", err);

      setError(err.message);
    } finally {
      //Quitamos el loading
      setLoading(false);
    }
  }, [getReceptionists]);

  // ==========================
  // DELETE
  // ==========================

  //Funcion para eliminar un recepcionista
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

  //Cuando el hook se usa por primera vez obtenemos todos los recepcionistas
  useEffect(() => {
    getReceptionists();
  }, [getReceptionists]);

  //Retornamos los estados y funciones para poder usarlos en otros componentes
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