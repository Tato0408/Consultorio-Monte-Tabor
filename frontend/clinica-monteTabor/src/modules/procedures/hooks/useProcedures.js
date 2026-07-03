// src/features/procedures/hooks/useProcedures.js
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import apiClient from "@/lib/apiClient";

const useProcedures = () => {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchProcedures = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      // apiClient ya devuelve el JSON parseado directo (sin envoltorio { data }), así que aquí asignamos la respuesta tal cual.
      const data = await apiClient("/procedures");
      setProcedures(data);
    } catch (err) {
      setError(err.message || "Error al cargar los procedimientos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

   const getProcedureById = useCallback((id) => {
    if (!id) return null;
    return procedures.find(proc => proc._id === id) || null;
  }, [procedures]);


  const getProcedureName = useCallback((id) => {
    const procedure = getProcedureById(id);
    return procedure?.name || "Procedimiento no encontrado";
  }, [getProcedureById]);

  const saveProcedure = async (id, data) => {
    try {
      setSubmitting(true);
      setError("");

      const cleanedData = {
        ...data,
        materials: (data.materials || []).map(({ _id, ...rest }) => rest),
      };

      await apiClient(id ? `/procedures/${id}` : "/procedures", {
        method: id ? "PUT" : "POST",
        body: cleanedData,
      });

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
      await apiClient(`/procedures/${id}`, { method: "DELETE" });

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

  return { procedures, loading, error, submitting, saveProcedure, handleDelete, fetchProcedures , getProcedureById, getProcedureName};
};

export default useProcedures;