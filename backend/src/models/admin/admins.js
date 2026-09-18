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