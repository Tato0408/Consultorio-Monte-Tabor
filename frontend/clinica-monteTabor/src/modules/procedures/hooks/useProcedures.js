import { useState, useEffect } from "react";

// Ajusta este puerto o ruta según la configuración de tu servidor de Express
const API_URL = "http://localhost:4000/api/procedures";

const useProcedures = () => {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // GET: Obtener todos los procedimientos
  const fetchProcedures = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("No se pudo obtener la lista de procedimientos");
      const data = await response.json();
      setProcedures(data);
    } catch (err) {
      setError(err.message || "Error al cargar los procedimientos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcedures();
  }, []);

  // POST / PUT: Guardar o actualizar procedimiento
  const saveProcedure = async (id, data) => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const url = id ? `${API_URL}/${id}` : API_URL;
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Error HTTP: ${response.status}`);

      setMessage(id ? "Procedimiento actualizado con éxito" : "Procedimiento creado con éxito");
      
      // Refrescar la lista de la tabla automáticamente
      await fetchProcedures();
      return true;
    } catch (err) {
      setError(err.message || "Error al guardar el procedimiento");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE: Eliminar procedimiento por ID
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este procedimiento?")) return;
    try {
      setError("");
      setMessage("");
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo eliminar el procedimiento");
      
      setMessage("Procedimiento eliminado correctamente");
      await fetchProcedures();
    } catch (err) {
      setError(err.message || "Error al eliminar el procedimiento");
    }
  };

  return {
    procedures,
    loading,
    error,
    message,
    submitting,
    saveProcedure,
    handleDelete,
    fetchProcedures,
  };
};

export default useProcedures;