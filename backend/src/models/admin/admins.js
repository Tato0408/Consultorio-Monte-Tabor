import { Schema, model } from "mongoose";

const adminSchema = new Schema({
    name: {
        type: String
    },
    last_name: {
        type: String
    },
    dui: {
        type: String
    },
    birth_date: {
        type: Date
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    is_active: {
        type: Boolean
    },
    is_verified: {
        type: Boolean
    },
    public_id: {
        type: String
    },
    image: {
        type: String
    },
    loginAttempts: {
        type: Number
    },
    timeOut: {
        type: Date
    },
    // Firma y sello propios del admin (que también puede actuar como "doctor espejo" para
    // agendarse citas, ver is_admin_mirror en el modelo Doctors), guardados desde su propio
    // perfil para estamparse en los PDFs que él mismo genere. Nunca se sincronizan hacia el
    // doctor espejo: nada lee firma/sello desde ahí, solo desde la sesión activa.
    signature_url: {
        type: String,
        default: null,
    },
    signature_public_id: {
        type: String,
        default: null,
    },
    seal_url: {
        type: String,
        default: null,
    },
    seal_public_id: {
        type: String,
        default: null,
    },
    // Solo puede existir un admin a la vez en todo el sistema (no hay ningún flujo para
    // que un admin cree a otro, ver registerAdminController.js). El índice único de este
    // campo, siempre 1, es lo que hace atómico el bootstrap: si dos registros
    // concurrentes intentan guardarse a la vez, MongoDB solo deja pasar el primer
    // .save() y el segundo revienta con un error de llave duplicada (antes el único
    // chequeo era un countDocuments() > 0 sin atomicidad, con una ventana de carrera
    // real aunque angosta). Al eliminar al admin, este campo se borra con él, así que
    // un nuevo bootstrap después sigue funcionando igual que antes.
    singleton: {
        type: Number,
        default: 1,
        unique: true
    }
}, {
    timestamps: true,
    strict: false
});
export default model("Admin", adminSchema)