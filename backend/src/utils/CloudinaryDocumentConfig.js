import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../../config.js";

// Cloudinary ya está configurado en CloudinaryConfig.js, pero ese storage
// solo acepta formatos de imagen (jpg, png, jpeg, gif, avif) y sube todo
// como resource_type "image" por defecto, un PDF o un .docx sería
// rechazado. Este storage aparte es para los documentos reales que un
// paciente puede adjuntar a su tratamiento (resultados de laboratorio,
// constancias, entre otros), donde sí hace falta aceptar PDF y Word
// además de imágenes escaneadas.
cloudinary.config({
  cloud_name: config.cloudinary.cloudinary_name,
  api_key: config.cloudinary.cloudinary_api_key,
  api_secret: config.cloudinary.cloudinary_api_secret,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "PATIENT_DOCUMENTS",
    // resource_type "auto": Cloudinary decide "image" o "raw" según el
    // archivo. Con "raw" fijo, los PDFs pierden la extensión al servirse
    // y no se pueden previsualizar bien.
    resource_type: "auto",
    allowed_formats: ["pdf", "doc", "docx", "jpg", "jpeg", "png"],
  },
});

const uploadDocument = multer({
  storage,
  // 10 MB, suficiente para un PDF escaneado y evita adjuntos gigantes.
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default uploadDocument;
