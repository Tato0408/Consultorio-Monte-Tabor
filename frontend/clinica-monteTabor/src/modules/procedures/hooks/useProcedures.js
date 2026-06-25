import { useState, useEffect } from "react";
import Swal from "sweetalert2";

const API_URL = "http://localhost:4000/api/procedures";

const useProcedures = () => {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => { fetchProcedures(); }, []);

  const saveProcedure = async (id, data) => {
    try {
      setSubmitting(true);
      setError("");

      const url    = id ? `${API_URL}/${id}` : API_URL;
      const method = id ? "PUT" : "POST";

      // Limpiar _id de subdocumentos de materials antes de enviar.
      // Mongoose genera _id automáticamente en cada subdocumento del array,
      // y si los mandamos de vuelta el backend los intenta castear como ObjectId
      // del campo name causando CastError.
      const cleanedData = {
        ...data,
        materials: (data.materials || []).map(({ _id, ...rest }) => rest),
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Error HTTP: ${response.status}`);

      await Swal.fire({
        icon: "success",
        title: id ? "¡Actualizado!" : "¡Creado!",
        text: id
          ? "El procedimiento fue actualizado correctamente."
          : "El procedimiento fue creado correctamente.",
        confirmButtonColor: "#2563eb",
        timer: 2500,
        timerProgressBar: true,
      });

      await fetchProcedures();
      return true;
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Ocurrió un error al guardar el procedimiento.",
        confirmButtonColor: "#2563eb",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar procedimiento?",
      text: "Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (!confirm.isConfirmed) return;

    try {
      setError("");
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo eliminar el procedimiento");

      await Swal.fire({
        icon: "success",
        title: "¡Eliminado!",
        text: "El procedimiento fue eliminado correctamente.",
        confirmButtonColor: "#2563eb",
        timer: 2000,
        timerProgressBar: true,
      });

      await fetchProcedures();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Error al eliminar el procedimiento.",
        confirmButtonColor: "#2563eb",
      });
    }
  };

  return {
    procedures,
    loading,
    error,
    submitting,
    saveProcedure,
    handleDelete,
    fetchProcedures,
  };
};

export default useProcedures;