import apiClient from "@/lib/apiClient";

// Perfil del paciente autenticado. Todos estos endpoints van bajo /api/patientAccount
// y se identifican por la cookie de sesión (req.user.id), nunca por un :id en la URL.

export const getMyProfile = () => apiClient("/patientAccount/me");

// Solo campos del documento raíz: name, last_name, dui, birth_date, gender, phone, email.
export const updateMyProfile = (data) =>
  apiClient("/patientAccount/me", { method: "PUT", body: data });

// Cambia la contraseña estando ya logueado: exige confirmar la actual.
export const changeMyPassword = (oldPassword, newPassword, confirmNewPassword) =>
  apiClient("/patientAccount/changePassword", {
    method: "PUT",
    body: { oldPassword, newPassword, confirmNewPassword },
  });

// clinical_history: van en rutas propias porque updateMe solo toca el documento raíz.
export const updateMyBloodType = (blood_type, blood_type_date) =>
  apiClient("/patientAccount/me/blood-type", {
    method: "PUT",
    body: { blood_type, blood_type_date },
  });

export const updateMyLifestyle = (non_pathological, ecologycal_social) =>
  apiClient("/patientAccount/me/lifestyle", {
    method: "PUT",
    body: { non_pathological, ecologycal_social },
  });

export const addMyPathological = (disease, diagnosis) =>
  apiClient("/patientAccount/me/pathological", { method: "POST", body: { disease, diagnosis } });

export const deleteMyPathological = (entryId) =>
  apiClient(`/patientAccount/me/pathological/${entryId}`, { method: "DELETE" });

export const addMyHereditary = (relationship, condition) =>
  apiClient("/patientAccount/me/hereditary", { method: "POST", body: { relationship, condition } });

export const deleteMyHereditary = (entryId) =>
  apiClient(`/patientAccount/me/hereditary/${entryId}`, { method: "DELETE" });
