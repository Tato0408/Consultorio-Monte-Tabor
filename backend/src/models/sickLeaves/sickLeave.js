import mongoose, { Schema, model } from "mongoose";

const sickLeaveSchema = new Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patients",
      required: true,
    },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctors",
    },
    // Solo se llena cuando la incapacidad la emite la enfermera asignada a una cita de un
    // procedimiento sin doctor (requires_doctor false en el procedimiento).
    nurse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "nurses",
    },
    consultation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultations",
    },
    diagnosis: {
      type: String,
      required: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Activa", "Finalizada"],
      default: "Activa",
    },
  },
  {
    timestamps: true,
  }
);

export default model("SickLeaves", sickLeaveSchema);
