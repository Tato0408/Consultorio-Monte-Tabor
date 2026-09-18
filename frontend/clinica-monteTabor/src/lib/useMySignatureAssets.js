import { useAuth } from "@/context/AuthContext";

// Firma y sello a estampar en un PDF que se está generando ahora mismo: siempre los de la
// sesión activa, nunca los del doctor de la cita/consulta que el documento describe (ver
// PdfSignature.jsx). Solo doctor y admin pueden guardarlos (el admin también puede actuar
// como "doctor espejo", ver is_admin_mirror en el modelo Doctors); para cualquier otro rol
// (enfermera, recepción) queda en undefined y PdfSignature se ve igual que siempre, con el
// espacio en blanco para firmar/sellar a mano.
export const useMySignatureAssets = () => {
  const { user, userType } = useAuth();
  const canSign = userType === "doctor" || userType === "admin";
  return {
    signatureUrl: canSign ? user?.signature_url || undefined : undefined,
    sealUrl: canSign ? user?.seal_url || undefined : undefined,
  };
};

export default useMySignatureAssets;
