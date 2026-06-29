import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import apiClient from "@/lib/apiClient";

const useRegisterAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { refetchAdminStatus } = useAuth();

  const register = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("name", formData.nombre);
      data.append("last_name", formData.apellido);
      data.append("dui", formData.dui);
      data.append("age", formData.edad);
      data.append("gender", formData.genero);
      data.append("email", formData.correo);
      data.append("password", formData.contrasena);

      if (formData.imagen) {
        data.append("image", formData.imagen);
      }

      await apiClient(`/registerAdmin`, {
        method: "POST",
        body: data,
      });

      toast.success("Cuenta de administrador creada con éxito.");

      // Actualizamos el estado global para que hasAdmins pase a true
      await refetchAdminStatus();

      // Ahora sí redirigimos al login
      navigate("/login");

    } catch (err) {
      setError(err.message || "Ocurrió un error inesperado.");
      toast.error(err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, register };
};

export default useRegisterAdmin;