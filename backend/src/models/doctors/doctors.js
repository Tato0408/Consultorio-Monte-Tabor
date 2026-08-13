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
    // Un admin también ejerce como doctor (puede configurar su propio horario y ser asignado a
    // citas), sin dejar de ser admin en el resto del sistema — para lograrlo sin duplicar toda la
    // lógica de horarios/citas en otro lado, se le crea automáticamente este "doctor espejo"
    // (ver doctorsController.syncAdminMirrorDoctor). Se excluye de la gestión de doctores
    // (GET /doctors) para no confundirlo con personal médico real, pero sí aparece en el
    // catálogo de agendamiento (GET /doctors/catalog).
    is_admin_mirror: {
      type: Boolean,
      default: false,
    },
    linked_admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

export default model("Doctors", doctorSchema);