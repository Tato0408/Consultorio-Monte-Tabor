import { useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "../../../context/AuthContext";
import apiClient from "../../../lib/apiClient";

// Convierte el error de una subida de imagen en la causa que se le muestra al
// usuario. El backend ya manda la causa en message (ver uploadErrorHandler.js);
// aquí solo se cubren los casos sin mensaje útil: sin conexión, o un error del
// servidor que llegó sin explicación.
const describeUploadError = (err) => {
  if (err instanceof TypeError) {
    return "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
  }
  const message = String(err?.message || "");
  if (!message || /^Error \d+$/.test(message) || message === "Error interno del servidor") {
    return "El servidor no pudo procesar la imagen. Inténtalo de nuevo en unos minutos.";
  }
  return message;
};

const useProfile = () => {
  const { refetchUser, user, userType, logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  // El rol admin usa el endpoint genérico /admin/:id porque ahí solo
  // depende de validateAuthCookie, sin permiso dinámico de por medio,
  // lo que ya lo hace autoservicio de hecho. Los roles doctor, nurse y
  // receptionist en cambio tienen una ruta de autoservicio dedicada
  // (/profile/update), ya que el endpoint genérico /:id de esos tres
  // exige el permiso de administrar a otros usuarios de ese rol
  // (users.doctors, users.nurses o users.receptionist con acción
  // update), permiso que esos roles no tienen sobre sí mismos, por lo
  // que editar la propia foto ahí devolvía un error 403.
  const getEndpoint = () => {
    const routes = {
      admin:        `/admin/${user?.id}`,
      doctor:       `/doctors/profile/update`,
      nurse:        `/nurses/profile/update`,
      receptionist: `/receptionist/profile/update`,
    };
    return routes[userType];
  };

  const getImageField = () => {
    const fields = {
      admin:        "image",
      doctor:       "doctorImage",
      nurse:        "img_url",
      // receptionistController espera el archivo bajo el campo
      // receptionistImage (ver routes/receptionist/receptionist.js),
      // no img_url, que es el nombre del campo en la base de datos y
      // no el nombre del campo de subida.
      receptionist: "receptionistImage",
    };
    return fields[userType];
  };

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
      const cause = describeUploadError(err);
      setError(`Error al actualizar la foto de perfil: ${cause}`);
      Swal.fire({
        icon: "error",
        title: "Error al actualizar la foto de perfil",
        text: cause,
        confirmButtonColor: "#2563eb",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

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

  // Edición de los datos personales del propio usuario (nombre, DUI,
  // fecha de nacimiento, teléfono o género según el rol). Reutiliza el
  // mismo endpoint de autoservicio que uploadAvatar y deleteAvatar.
  // Ver EditProfileModal.jsx para los campos que envía cada rol.
  const updateProfile = async (fields) => {
    try {
      setSubmitting(true);
      setError("");

      await apiClient(getEndpoint(), {
        method: "PUT",
        body: fields,
      });

      await Swal.fire({
        icon: "success",
        title: "¡Actualizado!",
        text: "Tu información fue actualizada correctamente.",
        confirmButtonColor: "#2563eb",
        timer: 2500,
        timerProgressBar: true,
      });

      await refetchUser();
      return true;
    } catch (err) {
      setError(err.message || "Error al actualizar tu información");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Ocurrió un error al actualizar tu información.",
        confirmButtonColor: "#2563eb",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Firma y sello: solo doctor y admin los tienen (el admin también puede actuar como
  // "doctor espejo", ver is_admin_mirror en el modelo Doctors). Cada uno se guarda y quita
  // por separado — mismo criterio que uploadAvatar/deleteAvatar, pero contra las rutas
  // dedicadas de autoservicio (nunca la genérica /admin/:id ni /doctors/:id, esas las usa
  // la gestión de OTROS usuarios).
  const SIGNATURE_ENDPOINTS = {
    admin: "/admin/profile/signature",
    doctor: "/doctors/profile/signature",
  };
  const SEAL_ENDPOINTS = {
    admin: "/admin/profile/seal",
    doctor: "/doctors/profile/seal",
  };

  const saveAsset = async (endpoint, fieldName, blob, successLabel, errorLabel) => {
    try {
      setSubmitting(true);
      setError("");
      const formData = new FormData();
      formData.append(fieldName, blob, `${fieldName}.png`);
      await apiClient(endpoint, { method: "PUT", body: formData });

      await Swal.fire({
        icon: "success",
        title: "¡Guardada!",
        text: successLabel,
        confirmButtonColor: "#2563eb",
        timer: 2000,
        timerProgressBar: true,
      });

      await refetchUser();
      return true;
    } catch (err) {
      setError(err.message || errorLabel);
      Swal.fire({ icon: "error", title: "Error", text: err.message || errorLabel, confirmButtonColor: "#2563eb" });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const removeAsset = async (endpoint, successLabel, errorLabel) => {
    try {
      setSubmitting(true);
      setError("");
      await apiClient(endpoint, { method: "PUT", body: { remove: "true" } });

      await Swal.fire({
        icon: "success",
        title: "¡Eliminada!",
        text: successLabel,
        confirmButtonColor: "#2563eb",
        timer: 2000,
        timerProgressBar: true,
      });

      await refetchUser();
      return true;
    } catch (err) {
      setError(err.message || errorLabel);
      Swal.fire({ icon: "error", title: "Error", text: err.message || errorLabel, confirmButtonColor: "#2563eb" });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const saveSignatureFile = (blob) =>
    saveAsset(SIGNATURE_ENDPOINTS[userType], "signatureImage", blob, "Tu firma fue guardada correctamente.", "No se pudo guardar la firma.");
  const saveSignatureDrawn = (blob) =>
    saveAsset(SIGNATURE_ENDPOINTS[userType], "signatureImage", blob, "Tu firma fue guardada correctamente.", "No se pudo guardar la firma.");
  const removeSignature = () =>
    removeAsset(SIGNATURE_ENDPOINTS[userType], "Tu firma fue eliminada.", "No se pudo quitar la firma.");
  const saveSeal = (blob) =>
    saveAsset(SEAL_ENDPOINTS[userType], "sealImage", blob, "Tu sello fue guardado correctamente.", "No se pudo guardar el sello.");
  const removeSeal = () =>
    removeAsset(SEAL_ENDPOINTS[userType], "Tu sello fue eliminado.", "No se pudo quitar el sello.");

  return {
    error,
    submitting,
    uploadAvatar,
    deleteAvatar,
    updateProfile,
    saveSignatureFile,
    saveSignatureDrawn,
    removeSignature,
    saveSeal,
    removeSeal,
    logout
  };
};

export default useProfile;