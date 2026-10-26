import multer from "multer";
import { trim_request_body } from "../middlewares/trimRequestBody.js";
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
    allowed_formats: ["jpg", "png", "jpeg", "gif", "avif", "webp"]
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

// Cada middleware de subida va seguido de trim_request_body: multer arma
// req.body dentro de la ruta, después del recorte general de app.js, así que
// sin esto los textos de un formulario con archivo llegarían sin recortar.
// Express acepta el arreglo como si fueran dos middlewares seguidos.
const with_trim = (middleware) => [middleware, trim_request_body];

export default {
  single: (...args) => with_trim(upload.single(...args)),
  fields: (...args) => with_trim(upload.fields(...args)),
  array: (...args) => with_trim(upload.array(...args)),
  none: (...args) => with_trim(upload.none(...args)),
  any: (...args) => with_trim(upload.any(...args)),
};