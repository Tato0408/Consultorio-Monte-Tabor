import mongoose, { Schema, model } from "mongoose";

const doctorSchema = new Schema(
  {
    img_url: {
      type: String,
      required: true,
    },
    img_public_id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    dui: {
      type: String,
      required: true,
      unique: true,
    },
  birth_date: {
  type: Date,
  required: true,
},
    gender: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    license_number: {
      type: String,
      required: true,
      unique: true,
    },
    license_url: {
      type: String,
      required: true,
    },
    license_public_id: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    // Indica si este doctor es una copia automática de un admin, creada
    // para que el admin pueda configurar su propio horario y ser asignado
    // a citas sin dejar de ser admin en el resto del sistema (ver
    // doctorsController.syncAdminMirrorDoctor). Se excluye de la gestión
    // de doctores (GET doctors) pero sí aparece en el catálogo de
    // agendamiento (GET doctors catalog).
    is_admin_mirror: {
      type: Boolean,
      default: false,
    },
    linked_admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    // Firma y sello propios del doctor, guardados una sola vez desde su perfil (ver
    // doctorsController.updateOwnSignature/updateOwnSeal) para estamparse automáticamente
    // en cualquier PDF que él mismo genere (ver PdfSignature.jsx). Opcionales: un doctor
    // que no los guarda sigue viendo el espacio en blanco de siempre. Nunca se exponen a
    // otro usuario (ver getDoctors/getDoctorsCatalog/searchDoctors, que los reemplazan por
    // los booleanos has_signature/has_seal antes de responder).
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
  },
  {
    timestamps: true,
    strict: false,
  },
);

export default model("Doctors", doctorSchema);