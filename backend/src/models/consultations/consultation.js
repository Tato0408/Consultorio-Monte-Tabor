/*
appointment_id,
patient_id,
clinical_data{

triage {
blood_pressure,
glucose,
weight,
height
temperature,
oxygen_saturation,
},

evolution,
icd_diagnosis,
diagnosis,
diagnosis_description,

},


physical_exam {
general,
skin,
cardiopulmonary,
adbomen,
neurological,
musculoskeletal,
notes
},

procedure {
procedure_id,
doctor_id, //usar populate para llamar sus datos

material_used [{
iventory_id,
quantity
}],

}

follow_up_date,

referral {
reason,
referred_to,
referred_date
}

*/
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

  pysical_exam: {
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
      procedure_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Procedures",
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