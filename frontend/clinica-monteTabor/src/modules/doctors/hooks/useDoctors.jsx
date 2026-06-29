// src/features/doctors/hooks/useDoctors.js
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

export const useDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // apiClient ya devuelve el JSON parseado directo (sin envoltorio { data }), así que aquí asignamos la respuesta tal cual.
      const data = await apiClient("/doctors");
      setDoctors(data);
    } catch (err) {
      console.error("Error al obtener los doctores:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getDoctorById = async (id) => {
    try {
      return await apiClient(`/doctors/${id}`);
    } catch (err) {
      console.error(`Error al obtener el doctor con ID ${id}:`, err);
      throw err;
    }
  };

  // CREATE — FormData pasa intacto por apiClient (ya confirmamos que no
  // fuerza Content-Type ni hace JSON.stringify cuando body es FormData).
  const createDoctor = async (formData) => {
    try {
      const data = await apiClient("/doctors", { method: "POST", body: formData });
      await getDoctors();
      return data;
    } catch (err) {
      console.error("Error al crear el doctor:", err);
      throw err;
    }
  };

  const updateDoctor = async (id, formData) => {
    try {
      const data = await apiClient(`/doctors/${id}`, { method: "PUT", body: formData });
      await getDoctors();
      return data;
    } catch (err) {
      console.error(`Error al actualizar el doctor con ID ${id}:`, err);
      throw err;
    }
  };

  const deleteDoctor = async (id) => {
    try {
      const data = await apiClient(`/doctors/${id}`, { method: "DELETE" });
      await getDoctors();
      return data;
    } catch (err) {
      console.error(`Error al eliminar el doctor con ID ${id}:`, err);
      throw err;
    }
  };

  useEffect(() => {
    getDoctors();
  }, [getDoctors]);

  return { doctors, loading, error, getDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor };
};