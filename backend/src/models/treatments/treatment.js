import mongoose, { Schema, model } from "mongoose";

// Entrada de la línea de tiempo del tratamiento. Es una bitácora única y
// cronológica: cada consulta de seguimiento, nota manual, cambio de plan,
// documento adjunto y cambio de estado agrega una entrada, nunca se
// reemplaza una anterior. entry_type decide el ícono y el color en la
// interfaz. consultation_id queda en null cuando la entrada no proviene de
// una consulta (por ejemplo una nota escrita a mano en el panel).
const timeline_entry_schema = new Schema(
  {
    entry_type: {
      type: String,
      enum: [
        "inicio",
        "evolucion",
        "nota",
        "cambio_plan",
        "control",
        "documento",
        "cierre",
        "reapertura",
        "pausa",
      ],
      required: true,
    },
    consultation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultations",
      default: null,
    },
    text: {
      type: String,
      default: "",
    },
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    author_name: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Documento adjunto al tratamiento, subido y guardado en Cloudinary (mismo
// formato que usaba el seguimiento anterior sobre el historial de
// procedimientos). public_id se guarda para poder borrar el archivo de
// Cloudinary al eliminar la entrada.
const treatment_document_schema = new Schema(
  {
    name: {
      type: String,
    },
    url: {
      type: String,
    },
    public_id: {
      type: String,
    },
    uploaded_by_name: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Plan de tratamiento de un paciente: el episodio de atención que va desde
// que el médico decide iniciar un seguimiento hasta que lo cierra. Nace
// siempre de una consulta (opened_by_consultation_id) y su estado cambia
// solo por acciones explícitas del personal, nunca por un cálculo de
// fechas. La evolución clínica no se captura aquí a mano: la alimenta cada
// consulta de seguimiento que se guarda para este paciente.
const treatment_schema = new Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patients",
      required: true,
    },

    // "activo": en curso. "en_pausa": detenido temporalmente, se puede
    // reanudar. "cerrado": terminado, con closed_reason siempre presente.
    status: {
      type: String,
      enum: ["activo", "en_pausa", "cerrado"],
      default: "activo",
    },
    // Motivo por el que se cerró el tratamiento. Se distingue el alta
    // médica del abandono y de la derivación a propósito, para tener la
    // estadística real de cada caso.
    closed_reason: {
      type: String,
      enum: ["finalizado", "abandono", "derivacion", "otro", null],
      default: null,
    },
    closed_at: {
      type: Date,
      default: null,
    },
    closure_note: {
      type: String,
      default: null,
    },
    pause_note: {
      type: String,
      default: null,
    },

    // Consulta desde la que se creó el tratamiento y quién lo hizo. El
    // nombre se guarda denormalizado para mostrarlo sin otra consulta.
    opened_by_consultation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultations",
      default: null,
    },
    opened_by_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    opened_by_name: {
      type: String,
      default: "",
    },
    opened_at: {
      type: Date,
      default: Date.now,
    },

    // Definición clínica del plan. diagnosis se precarga del diagnóstico de
    // la consulta de origen. objective y plan_description los escribe el
    // médico y son obligatorios al crear.
    diagnosis: {
      type: String,
      default: "",
    },
    objective: {
      type: String,
      default: "",
    },
    plan_description: {
      type: String,
      default: "",
    },
    total_sessions: {
      type: Number,
      default: null,
    },
    estimated_end_date: {
      type: Date,
      default: null,
    },

    // Fecha del próximo control. Se sincroniza con la "próxima cita
    // sugerida" de la consulta. Si ya pasó y el tratamiento sigue activo,
    // la interfaz lo marca como "Control vencido" (aviso, no un estado).
    next_control_date: {
      type: Date,
      default: null,
    },

    timeline: {
      type: [timeline_entry_schema],
      default: [],
    },
    documents: {
      type: [treatment_document_schema],
      default: [],
    },

    // Se apaga en vez de borrar el documento, igual que Patients. Un
    // tratamiento inactivo no se lista ni se edita.
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

treatment_schema.index({ patient_id: 1, status: 1 });

export default model("Treatments", treatment_schema);
