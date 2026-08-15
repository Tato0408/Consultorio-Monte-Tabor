import mongoose, { Schema, model } from "mongoose";

const sickLeaveSchema = new Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patients",
    },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctors",
    },
    consultation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultations",
    },
    diagnosis: {
      type: String,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
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
