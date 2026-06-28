import { useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "../../../context/AuthContext";
import apiClient from "../../../lib/apiClient";

const useProfile = () => {
  const { refetchUser, user, userType } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  // Endpoint PUT según el rol
  const getEndpoint = () => {
    const routes = {
      admin:        `/admin/${user?.id}`,
      doctor:       `/doctors/${user?.id}`,
      nurse:        `/nurses/${user?.id}`,
      receptionist: `/receptionist/${user?.id}`,
    };
    return routes[userType];
  };

  // Nombre del campo de imagen según el modelo del rol
  const getImageField = () => {
    const fields = {
      admin:        "image",
      doctor:       "doctorImage",
      nurse:        "img_url",
      receptionist: "img_url",
    };
    return fields[userType];
  };

  // ── Subir / cambiar foto ──────────────────────────────────────────────────
  const uploadAvatar = async (file) => {
    try {
      setSubmitting(true);
      setError("");

      // FormData para que el backend lo reciba como multipart (multer/cloudinary)
      const formData = new FormData();
      formData.append(getImageField(), file);

      // apiClient detecta FormData y NO agrega Content-Type manualmente
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

      // Refresca el AuthContext para que la nueva imagen aparezca en pantalla
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

  // ── Eliminar foto ─────────────────────────────────────────────────────────
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

      // Mandamos JSON normal — el backend borra la imagen de Cloudinary y limpia el campo
      await apiClient(getEndpoint(), {
        method: "PUT",
        body: {
          [getImageField()]: null,
          public_id: user?.public_id,
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
    error,
    submitting,
    uploadAvatar,
    deleteAvatar,
  };
};

export default useProfile;