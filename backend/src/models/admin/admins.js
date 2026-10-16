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
    gender: {
        type: String
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
    // Firma y sello propios del admin, guardados desde su perfil para
    // estamparse en los PDF que él mismo genere (el admin también atiende
    // citas como doctor espejo, ver is_admin_mirror en el modelo Doctors).
    // Nunca se copian al doctor espejo, se leen solo desde la sesión activa.
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
    // Solo puede existir un admin a la vez (no hay flujo para que un admin
    // cree a otro, ver registerAdminController.js). El índice único de este
    // campo, siempre 1, hace atómico el registro inicial: si dos registros
    // concurrentes intentan guardarse, MongoDB acepta el primero y rechaza el
    // segundo con un error de llave duplicada. Al eliminar al admin el campo
    // se borra con él, y un registro nuevo vuelve a funcionar.
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