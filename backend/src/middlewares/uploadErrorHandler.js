import multer from "multer";

// Formatos que aceptan las subidas de imágenes (ver CloudinaryConfig.js), en
// el texto que se le muestra al usuario.
const allowed_formats_text = "JPG, JPEG, PNG, GIF, AVIF o WEBP";

/*
 * Traduce un error de subida de archivo a una causa en lenguaje claro. Recibe
 * el error lanzado por multer o por Cloudinary y devuelve el texto de la
 * causa, o null si el error no viene de una subida.
 */
const get_upload_error_cause = (error) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return "La imagen pesa más de 10 MB. Elige una imagen más liviana.";
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return "El archivo se envió en un campo que el servidor no esperaba.";
        }
        return `No se pudo recibir el archivo (${error.code}).`;
    }

    // Cloudinary responde con http_code y un mensaje en inglés.
    if (error?.http_code) {
        const message = String(error.message || "");
        const format_match = message.match(/Image file format (\w+) not allowed/i);
        if (format_match) {
            const real_format = format_match[1].toUpperCase();
            return `El archivo es una imagen ${real_format}, aunque su nombre tenga otra extensión. Solo se aceptan imágenes ${allowed_formats_text}.`;
        }
        if (/Invalid image file/i.test(message)) {
            return `El archivo no es una imagen válida o está dañado. Solo se aceptan imágenes ${allowed_formats_text}.`;
        }
        if (/too large/i.test(message)) {
            return "La imagen es demasiado grande para el servicio de imágenes. Elige una imagen más liviana.";
        }
        return `El servicio de imágenes rechazó el archivo: ${message}`;
    }

    return null;
};

/*
 * Manejador de errores de Express para las subidas de imágenes. La subida a
 * Cloudinary ocurre en el middleware de multer, antes del controlador, así
 * que sus errores no pasan por el try/catch de ningún controlador. Sin este
 * manejador, Express respondía un 500 en HTML sin causa. Responde 400 con
 * { message, cause } cuando el error viene de una subida, y deja pasar
 * cualquier otro error.
 */
export const uploadErrorHandler = (error, req, res, next) => {
    const cause = get_upload_error_cause(error);
    if (!cause) return next(error);
    console.log("Error de subida de archivo:", error.message);
    return res.status(400).json({ message: cause, cause });
};

export default uploadErrorHandler;
