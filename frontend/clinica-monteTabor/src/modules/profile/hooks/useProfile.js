import { useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "../../../context/AuthContext";
import apiClient from "../../../lib/apiClient";

const useProfile = () => {
  const { refetchUser, user, userType } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Endpoint dinámico según el rol
  const getEndpoint = () => {
    const routes = {
      admin: `/admin/${user?.id}`,
      doctor: `/doctors/${user?.id}`,
      nurse: `/nurses/${user?.id}`,
      receptionist: `/receptionist/${user?.id}`,
    };
    return routes[userType];
  };

  // Nombre del campo de imagen según el modelo de cada rol
  const getImageField = () => {
    const fields = {
      admin: "image",
      doctor: "doctorImage",
      nurse: "img_url",
      receptionist: "img_url",
    };
    return fields[userType];
  };

  // Nombre del public_id según el modelo de cada rol
  const getPublicIdField = () => {
    const fields = {
      admin: user?.public_id,       // campo: public_id
      doctor: user?.img_public_id,  // campo: img_public_id
      nurse: user?.public_id,       // campo: public_id
      receptionist: user?.public_id, // no tiene public_id en el modelo, ajusta si lo agregas
    };
    return fields[userType];
  };

  // Subir o actualizar foto
  const uploadAvatar = async (file) => {
    try {
      setSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append(getImageField(), file);

      await apiClient(getEndpoint(), {
        method: "PUT",
        body: formData,
      });

      await Swal.fire({
        icon: "success",
        title: "¡Actualizada!",
        text: "La foto de perfil fue actualizada correctamente.",
        confirmButtonColor: "#2563eb",
        timer: 2500,
        timerProgressBar: true,
      });

      await refetchUser();
      return true;
    } catch (err) {
      setError(err.message || "Error al subir la imagen");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Ocurrió un error al subir la foto.",
        confirmButtonColor: "#2563eb",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar foto
  const deleteAvatar = async () => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar foto de perfil?",
      text: "Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (!confirm.isConfirmed) return;

    try {
      setSubmitting(true);
      setError("");

      // Enviamos el public_id correcto según el rol para que Cloudinary elimine la imagen
      await apiClient(getEndpoint(), {
        method: "PUT",
        body: { 
          [getImageField()]: null,           // limpia la imagen
          public_id: getPublicIdField(),     // para que el backend la elimine de Cloudinary
        },
      });

      await Swal.fire({
        icon: "success",
        title: "¡Eliminada!",
        text: "La foto de perfil fue eliminada correctamente.",
        confirmButtonColor: "#2563eb",
        timer: 2000,
        timerProgressBar: true,
      });

      await refetchUser();
    } catch (err) {
      setError(err.message || "Error al eliminar la imagen");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Error al eliminar la foto de perfil.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    loading,
    error,
    submitting,
    uploadAvatar,
    deleteAvatar,
  };
};

export default useProfile;