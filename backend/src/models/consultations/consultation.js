import mongoose, { Schema, model } from "mongoose";

const consultationSchema = new Schema({
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointments",
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patients",
  },

  clinical_data: {
    triage: {
      blood_pressure: {
        type: String,
      },
      glucose: {
        type: Number,
      },
      weight: {
        type: Number,
      },
      height: {
        type: Number,
      },
      temperature: {
        type: Number,
      },
      oxygen_saturation: {
        type: Number,
      },
    },
    evolution: {
      type: String,
    },
    icd_diagnosis: {
      type: String,
    },
    diagnosis: {
      type: String,
    },
    diagnosis_description: {
      type: String,
    },
  },

  physical_exam: {
    general: {
      type: String,
    },
    skin: {
      type: String,
    },
    cardiopulmonary: {
      type: String,
    },
    abdomen: {
      type: String,
    },
    neurological: {
      type: String,
    },
    musculoskeletal: {
      type: String,
    },
    notes: {
      type: String,
    },
  },

  procedure: [
    {
      // El modelo real se registra como "procedure" (minúscula, singular,
      // ver models/procedures/procedures.js). Nadie popula este campo hoy,
      // pero con el ref mal escrito cualquier .populate() futuro tronaría.
      procedure_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "procedure",
      },
      doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctors",
      },

      material_used: [
        {
          inventory_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "inventory",
          },
          quantity: {
            type: Number,
          },
        },
      ],
    },
  ],

  follow_up_date: {
    type: Date,
  },

  // Nota de enfermería del procedimiento. Solo la escribe la enfermera
  // asignada a la cita, y solo después de que la consulta ya existe (el
  // doctor la finaliza, o la enfermera la crea en un procedimiento sin
  // doctor). Queda en null mientras la enfermera no la haya llenado, aunque
  // el procedimiento exija enfermera (ver PATCH /consultations/:id/nurse-note).
  nurse_note: {
    type: String,
    default: null,
  },
  nurse_note_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "nurses",
    default: null,
  },
  nurse_note_at: {
    type: Date,
    default: null,
  },

  referral: {
    reason: {
      type: String,
    },
    referred_to: {
      type: String,
    },
    referred_date: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pendiente", "Completada"],
      default: "Pendiente",
    },
    // Campos que la hoja de referencia (CONSULTORIO MEDICO FAMILIAR) pide y
    // que no se capturan en el resto de la consulta: el doctor los llena en
    // el panel "Referencia". FC/FR van como texto libre (unidades incluidas).
    // referred_doctor_address y referred_doctor_phone son los datos de
    // contacto del medico al que se refiere. El telefono del paciente sale
    // del propio paciente, no se guarda aqui.
    address: {
      type: String,
    },
    referred_doctor_address: {
      type: String,
    },
    referred_doctor_phone: {
      type: String,
    },
    heart_rate: {
      type: String,
    },
    respiratory_rate: {
      type: String,
    },
  },
  date:{
    type: Date
  }
},
{
    timestamps: true,
    strict: false
});
export default model ("Consultations", consultationSchema)