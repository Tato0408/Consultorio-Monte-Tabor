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