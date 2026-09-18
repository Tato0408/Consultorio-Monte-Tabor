import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../../config.js";

// Configura Cloudinary con las credenciales del proyecto.
cloudinary.config({
  cloud_name: config.cloudinary.cloudinary_name,
  api_key: config.cloudinary.cloudinary_api_key,
  api_secret: config.cloudinary.cloudinary_api_secret,
});

// Define en qué carpeta de Cloudinary se guardan las imágenes y qué
// formatos se aceptan.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "PRUEBA",
    allowed_formats: ["jpg", "png", "jpeg", "gif", "avif"]
  },
});

// Middleware de multer que sube los archivos directamente a Cloudinary
// usando el storage anterior. Mismo límite que CloudinaryDocumentConfig.js:
// sin esto, cualquier rol con permiso de creación/edición en usuarios,
// doctores, enfermeras, recepcionistas o inventario podía subir una imagen
// de tamaño arbitrario.
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;