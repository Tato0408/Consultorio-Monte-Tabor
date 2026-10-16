import apiClient from "@/lib/apiClient";

// Tiempo que se reutiliza la firma ya consultada de un doctor antes de
// pedirla de nuevo, para no repetir la petición en cada PDF.
const cache_ttl_ms = 60 * 1000;
const signature_cache = new Map();

/*
 * Resuelve la firma y el sello que lleva un PDF emitido a nombre del doctor
 * asignado a la cita, según quién lo descarga:
 * el propio doctor usa los de su sesión, el admin recibe los del doctor
 * asignado (o los suyos si la cita es de su doctor espejo), y enfermería,
 * recepción o un doctor distinto al asignado reciben el PDF sin firma ni
 * sello por seguridad. Recibe el id del doctor asignado y el usuario de la
 * sesión, y devuelve { signatureUrl, sealUrl } con undefined donde no
 * corresponda estampar nada.
 */
export const get_document_signature = async (doctor_id, { user, userType }) => {
    if (!doctor_id) return {};

    if (userType === "doctor") {
        if (String(doctor_id) !== String(user?.id)) return {};
        return {
            signatureUrl: user?.signature_url || undefined,
            sealUrl: user?.seal_url || undefined,
        };
    }

    if (userType !== "admin") return {};

    const key = String(doctor_id);
    const cached = signature_cache.get(key);
    if (cached && Date.now() - cached.at < cache_ttl_ms) return cached.value;

    try {
        const response = await apiClient(`/doctors/${key}/signature-assets`);
        const value = {
            signatureUrl: response?.signature_url || undefined,
            sealUrl: response?.seal_url || undefined,
        };
        signature_cache.set(key, { at: Date.now(), value });
        return value;
    } catch {
        // Sin acceso o sin red, el PDF sale con el espacio para firmar a mano.
        return {};
    }
};
