import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../../config.js";

// Modo de almacenamiento local: si el .env no trae credenciales de Cloudinary,
// los archivos subidos se guardan en backend/uploads y se sirven desde
// /uploads (ver app.js). Así el sistema funciona completo en local sin
// depender de ningún servicio en la nube. Con las credenciales completas se
// sigue usando Cloudinary igual que antes.
export const USE_LOCAL_UPLOADS = !(
    config.cloudinary.cloudinary_name &&
    config.cloudinary.cloudinary_api_key &&
    config.cloudinary.cloudinary_api_secret
);

export const UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");

// Resuelve un public_id ("CARPETA/archivo.ext") a su ruta en disco, sin
// permitir que un id manipulado ("../..") salga de la carpeta de uploads.
const resolve_public_id = (public_id) => {
    const file_path = path.resolve(UPLOADS_DIR, String(public_id));
    return file_path.startsWith(UPLOADS_DIR + path.sep) ? file_path : null;
};

// Los controladores borran archivos con cloudinary.uploader.destroy(public_id).
// En modo local se reemplaza ese método (el objeto cloudinary es el mismo en
// todo el proyecto) por uno que borra el archivo del disco, así ningún
// controlador necesita saber dónde quedó guardado el archivo.
if (USE_LOCAL_UPLOADS) {
    cloudinary.uploader.destroy = async (public_id) => {
        const file_path = public_id ? resolve_public_id(public_id) : null;
        if (!file_path) return { result: "not found" };
        try {
            await fs.promises.unlink(file_path);
            return { result: "ok" };
        } catch {
            return { result: "not found" };
        }
    };
}

// Arma un multer que guarda en backend/uploads/<folder> y deja req.file con
// la misma forma que multer-storage-cloudinary: path = URL pública del
// archivo y filename = public_id, que es lo que guardan los controladores.
export const create_local_upload = ({ folder, allowed_formats, limits }) => {
    const target_dir = path.join(UPLOADS_DIR, folder);
    fs.mkdirSync(target_dir, { recursive: true });

    const upload = multer({
        storage: multer.diskStorage({
            destination: target_dir,
            filename: (req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
            },
        }),
        limits,
        fileFilter: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
            if (allowed_formats.includes(ext)) return cb(null, true);
            const error = new Error(
                `El archivo ${ext ? ext.toUpperCase() : "sin extensión"} no está permitido. Formatos aceptados: ${allowed_formats.join(", ").toUpperCase()}.`
            );
            // uploadErrorHandler.js reconoce esta marca y responde 400 con el mensaje.
            error.local_upload = true;
            cb(error);
        },
    });

    const to_cloudinary_shape = (file) => {
        const public_id = `${folder}/${file.filename}`;
        file.path = `${config.backendPublicUrl}/uploads/${public_id}`;
        file.filename = public_id;
    };

    // Después de multer se normalizan req.file y req.files (single, array o fields).
    const normalize = (req, res, next) => {
        if (req.file) to_cloudinary_shape(req.file);
        if (Array.isArray(req.files)) req.files.forEach(to_cloudinary_shape);
        else if (req.files) Object.values(req.files).flat().forEach(to_cloudinary_shape);
        next();
    };

    const wrap = (method) => (...args) => [upload[method](...args), normalize];
    return {
        single: wrap("single"),
        fields: wrap("fields"),
        array: wrap("array"),
        none: wrap("none"),
        any: wrap("any"),
    };
};
