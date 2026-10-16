import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { get_document_signature } from "@/lib/documentSignature";

// Firma y sello del doctor asignado a la cita, para los PDF que se generan
// desde una pantalla de una sola cita (consulta u orden de laboratorio). La
// regla de quién la recibe vive en get_document_signature.
export const useDocumentSignature = (doctorId) => {
  const { user, userType } = useAuth();
  const [assets, setAssets] = useState({});

  useEffect(() => {
    let cancelled = false;
    get_document_signature(doctorId, { user, userType }).then((value) => {
      if (!cancelled) setAssets(value);
    });
    return () => { cancelled = true; };
  }, [doctorId, user, userType]);

  return { signatureUrl: assets.signatureUrl, sealUrl: assets.sealUrl };
};

export default useDocumentSignature;
