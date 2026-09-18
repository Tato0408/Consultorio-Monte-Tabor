import mongoose, { Schema, model } from "mongoose";

const patientSchema = new Schema({
    name: {
        type: String
    },
    last_name: {
        type: String
    },
    // sparse:true para no chocar entre sí los pacientes que legítimamente no tienen DUI
    // (menores de edad, ver registerPatientsController.js): sin sparse, un índice único
    // trata "campo ausente" como null en todos los documentos por igual, y solo dejaría
    // existir UN paciente sin DUI en todo el sistema.
    dui: {
        type: String,
        unique: true,
        sparse: true
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
    // Antes la unicidad del correo dependía solo del findOne() en register()/verifyCode()
    // del portal público, pero el paciente no se crea hasta verifyCode() (hasta 15 min
    // después de ese findOne). Dos registros con el mismo correo dentro de esa ventana
    // podían terminar creando cada uno su propio documento con el mismo email, sin
    // ningún error. NOTA DE DESPLIEGUE: si ya existen correos o DUI duplicados en la base
    // de datos actual, Mongo no podrá construir este índice hasta que se limpien esos
    // duplicados a mano.
    email: {
        type: String,
        unique: true
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
        // true cuando lo registró personal clínico (consulta, BloodTypeCard.jsx en el panel
        // privado); false/ausente cuando lo autoreportó el paciente desde el portal
        // (BloodTypeSection.jsx). Antes ambos guardaban en el mismo campo sin distinción: un
        // dato usado en emergencias médicas no diferenciaba uno confirmado por laboratorio de
        // uno que el paciente simplemente recordaba o adivinaba.
        blood_type_verified: {
            type: Boolean,
            default: false
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
        type: Boolean,
        default: true
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