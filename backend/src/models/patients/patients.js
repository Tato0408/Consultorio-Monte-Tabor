/*
name,
last_name,
dui,
birth_date,
gender,
phone,
email,
password,
clinical_history:{
hereditary:[{
relationship,
condition
}],
pathological: [{
disease,
diagnosis
}],
non_pathological,
blood_types
vital_signs: [{
blood_pressure,
glucosa_mgdl,
weight,
height,
imc,
temperature,
spo2,
last_date_taken
}],
procedures: [{
procedure_id,
procedure_name,
consultation_id,
doctor_id,
doctor_name,
date,
diagnosis,
result,
follo_up_date
}],
referred_by,
is_active
}
*/
import mongoose, { Schema, model } from "mongoose";

const patientSchema = new Schema({
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
    phone: {
        type: String
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    clinical_history: {
        hereditary: [{
            relationship: {
                type: String
            },
            condition: {
                type: String
            }
        }],
        pathological: [{
            disease: {
                type: String
            },
            diagnosis: {
                type: String
            }
        }],
        non_pathological: {
            type: String
        },
        ecologycal_social:{
            type: String
        },
        blood_type: {
            type: String
        },
        vital_signs: [{
            blood_pressure: {
                type: String
            },
            glucosa_mgdl: {
                type: Number
            },
            weight: {
                type: Number
            },
            height: {
                type: Number
            },
            imc: {
                type: Number
            },
            temperature: {
                type: Number
            },
            spo2: {
                type: Number
            },
            last_date_taken: {
                type: Date
            }
        }],
        procedures: [{
            procedure_id: {
                type: mongoose.Types.ObjectId,
                ref: "procedures"
            },
            procedure_name: {
                type: String
            },
            consultation_id: {
                type: mongoose.Types.ObjectId,
                ref: "consultations"
            },
            doctor_id: {
                type: mongoose.Types.ObjectId,
                ref: "doctors"
            },
            doctor_name: {
                type: String
            },
            date: {
                type: Date
            },
            diagnosis: {
                type: String
            },
            result: {
                type: String
            },
            follow_up_date: {
                type: Date
            }
        }]
    },
    referred_by: {
        type: String
    },
    is_active: {
        type: Boolean
    },
    is_verified: {
        type: Boolean
    },
    loginAttemps: {
        type: Number
    },
    timeOut: {
        type: Date
    }
}, {
    timestamps: true,
    strict: false
});
export default model("Patients", patientSchema)