import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "../../../lib/alerts";
import { useAuth } from "../../../context/AuthContext";
import apiClient from "@/lib/apiClient";

const useRegisterAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { refetchAdminStatus } = useAuth();

  // register ya no crea la cuenta de una vez: el backend manda un código de
  // verificación al correo y guarda los datos en una cookie temporal
  // (registrationCookie), la cuenta se crea recién en verifyCode. Sin esto,
  // un solo POST público (sin confirmar que quien lo hizo controla ese
  // correo) creaba de inmediato al administrador único y total del sistema.
  const register = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("name", formData.nombre);
      data.append("last_name", formData.apellido);
      data.append("dui", formData.dui);
      data.append("birth_date", formData.birth_date);
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

      showSuccess("Te enviamos un código de verificación a tu correo.");
      return true;
    } catch (err) {
      setError(err.message || "Ocurrió un error inesperado.");
      showError(err.message || "Ocurrió un error inesperado.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Segundo paso: confirma el código y con eso crea la cuenta de verdad
  // (registerAdminController.verifyCode), leyendo el resto de los datos de
  // la cookie temporal que dejó register.
  const verifyCode = async (code) => {
    setLoading(true);
    setError(null);

    try {
      await apiClient(`/registerAdmin/verifyCodeEmail`, {
        method: "POST",
        body: { verificationCodeRequest: code },
      });

      showSuccess("Cuenta de administrador creada con éxito.");

      // Actualiza el estado global para que hasAdmins pase a true.
      await refetchAdminStatus();

      // Redirige al login tras completar el registro.
      navigate("/login");
      return true;
    } catch (err) {
      setError(err.message || "Código inválido o expirado.");
      showError(err.message || "Código inválido o expirado.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, register, verifyCode };
};

export default useRegisterAdmin;