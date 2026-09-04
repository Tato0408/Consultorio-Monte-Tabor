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
            },
            type: {
                type: String
            }
        }],
        pathological: [{
            disease: {
                type: String
            },
            diagnosis: {
                type: String
            },
            type: {
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
        // Los tres ref de abajo tenían el nombre del modelo real mal escrito
        // (minúscula/plural en vez de como se registra de verdad, ver
        // models/procedures/procedures.js, consultation.js y doctors.js):
        // nadie los popula hoy, pero cualquier .populate() futuro sobre
        // clinical_history.procedures habría reventado con MissingSchemaError.
        procedures: [{
            procedure_id: {
                type: mongoose.Types.ObjectId,
                ref: "procedure"
            },
            procedure_name: {
                type: String
            },
            consultation_id: {
                type: mongoose.Types.ObjectId,
                ref: "Consultations"
            },
            doctor_id: {
                type: mongoose.Types.ObjectId,
                ref: "Doctors"
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
            // Guarda quién actualizó por última vez el campo result y cuándo,
            // para mostrarlo con el mismo formato que las notas (texto,
            // autor y fecha) en lugar de un texto suelto sin registro de
            // quién lo escribió.
            resultAuthor: {
                type: String
            },
            resultUpdatedAt: {
                type: Date
            },
            follow_up_date: {
                type: Date
            },
            // Estado manual del tratamiento, fijado desde el panel de
            // seguimiento del paciente. Si es null, el estado se calcula
            // solo a partir de follow_up_date (ver treatmentsController.js,
            // getFollowUp). Si tiene un valor, ese valor manda y se muestra
            // tal cual, sin importar la fecha de control.
            status_override: {
                type: String,
                enum: ["En tratamiento", "Requiere revisión", "Finalizado", null],
                default: null
            },
            // Bitácora de notas de seguimiento del tratamiento. A diferencia
            // del campo result, que se sobreescribe, aquí se van acumulando
            // todas las notas, cada una con quién la escribió y cuándo.
            notes: [{
                text: {
                    type: String
                },
                author: {
                    type: String
                },
                date: {
                    type: Date,
                    default: Date.now
                }
            }],
            // Documentos adjuntos del tratamiento, subidos y guardados en
            // Cloudinary, no solo un enlace externo.
            documents: [{
                name: {
                    type: String
                },
                url: {
                    type: String
                },
                public_id: {
                    type: String
                },
                uploadedBy: {
                    type: String
                },
                date: {
                    type: Date,
                    default: Date.now
                }
            }]
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