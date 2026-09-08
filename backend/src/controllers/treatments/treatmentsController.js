import { v2 as cloudinary } from "cloudinary";
import patientsModel from "../../models/patients/patients.js";
import consultationModel from "../../models/consultations/consultation.js";
import prescriptionModel from "../../models/consultations/prescription.js";
import adminModel from "../../models/admin/admins.js";
import doctorsModel from "../../models/doctors/doctors.js";
import nursesModel from "../../models/nurses/nurses.js";
import receptionistModel from "../../models/receptionist/receptionist.js";

//array de funciones: aqui se agregan los métodos del controller y al final se exporta este objeto
const treatmentsController = {};

// Cantidad de milisegundos que tiene un día, se usa para todos los
// cálculos de fechas (restar días, sumar semanas, etc.) sin tener que
// repetir la operación cada vez.
const MS_DAY = 24 * 60 * 60 * 1000;

// Abreviaturas de los meses en español, en el mismo orden que
// Date.getMonth() (0 es enero). Se usan para armar las tarjetas de
// próximos controles (día y mes, por ejemplo 05 AGO).
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

//Calcula la edad en años a partir de la fecha de nacimiento del paciente.
//Devuelve null si no hay fecha de nacimiento registrada, para no mostrar una edad falsa.
const calcAge = (birthDate) => {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (MS_DAY * 365.25));
};

// Da formato de fecha legible en español (dd/mm/aaaa) a cualquier
// valor Date o ISO string. Devuelve el símbolo de guion largo cuando
// no hay fecha, para que la interfaz nunca muestre Invalid Date.
const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Calcula cuántos días faltan (positivo) o han pasado (negativo)
// entre hoy y una fecha dada, ignorando la hora exacta (ambas fechas
// se normalizan a medianoche). Se usa para el texto de días
// restantes o vencidos del próximo control de cada paciente.
const daysUntil = (date) => {
  if (!date) return null;
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / MS_DAY);
};

// Modelo y prefijo de nombre según el rol de quien hace la acción
// (req.user.role, puesto por authenticate.js a partir del JWT). Se
// usa para dejar registrado quién actualizó la evolución o escribió
// una nota (ver addNote más abajo).
const ACTOR_MODELS = { admin: adminModel, doctor: doctorsModel, nurse: nursesModel, receptionist: receptionistModel };
const ACTOR_PREFIX = { doctor: "Dr.", nurse: "Enf." };

// Busca el nombre real de quien hizo la petición para firmar una nota/evolución con su nombre en
// vez de dejarlo anónimo. Si por algún motivo no se encuentra (usuario borrado, rol desconocido),
// devuelve una etiqueta genérica en vez de fallar toda la operación.
const resolveActorName = async (req) => {
  const role = req.user?.role;
  const Model = ACTOR_MODELS[role];
  if (!Model) return "Sistema";

  const actor = await Model.findById(req.user.id).select("name last_name").lean();
  const fullName = actor ? `${actor.name || ""} ${actor.last_name || ""}`.trim() : "";
  if (!fullName) return ACTOR_PREFIX[role] ? `${ACTOR_PREFIX[role]} (sin nombre)` : "Administrador";

  return ACTOR_PREFIX[role] ? `${ACTOR_PREFIX[role]} ${fullName}` : fullName;
};

// Trae al paciente completo (documento de Mongoose, no .lean(), para
// poder mutar y guardar) y localiza su procedimiento o tratamiento
// más reciente por fecha. Lo reutilizan las 4 acciones de abajo
// (evolución, nota, programar control, dar de alta): todas operan
// sobre ese mismo procedimiento, el que getFollowUp usa como el
// tratamiento actual del paciente.
const loadPatientWithLatestProcedure = async (patientId) => {
  const patient = await patientsModel.findById(patientId);
  // Un paciente inactivo se trata como inexistente para el seguimiento de
  // tratamientos: no se listan ni se editan sus datos hasta reactivarlo.
  if (!patient || patient.is_active === false) return { patient: null, latest: null };

  const procedures = patient.clinical_history?.procedures || [];
  if (!procedures.length) return { patient, latest: null };

  // .sort() se aplica sobre una copia del array, no muta el orden
  // real guardado en el documento. Los elementos siguen siendo los
  // mismos subdocumentos de Mongoose, así que modificar latest y
  // luego hacer patient.save() sí persiste el cambio.
  const latest = [...procedures].sort((a, b) => new Date(a.date) - new Date(b.date)).pop();
  return { patient, latest };
};

// GET /api/treatments/follow-up
// Reemplaza los datos quemados que antes mostraba la pantalla de
// tratamientos (mock en modules/treatments/data/treatmentsData.js).
// No existe una colección de tratamientos propia en el sistema, así
// que se arma el seguimiento de cada paciente a partir de lo más
// cercano que sí existe: su historial real de procedimientos
// (Patients.clinical_history.procedures), que ya trae diagnóstico,
// doctor y fecha de control (follow_up_date), más la consulta y
// receta asociadas a cada procedimiento (para la observación más
// reciente y los medicamentos).
treatmentsController.getFollowUp = async (req, res) => {
  try {
    // Solo interesan los pacientes que tienen al menos un
    // procedimiento en su historial clínico, sin eso no hay ningún
    // tratamiento real que mostrar. Se traen solo los campos que se
    // van a usar (name, last_name, birth_date, gender, procedures)
    // para no cargar todo el documento del paciente, y .lean() porque
    // esta respuesta es de solo lectura.
    const patients = await patientsModel
      .find({ "clinical_history.procedures.0": { $exists: true }, is_active: { $ne: false } })
      .select("name last_name birth_date gender clinical_history.procedures")
      .lean();

    // Si ningún paciente tiene procedimientos todavía, se responde con listas vacías en vez de
    // seguir armando el resto del cálculo (que no tendría nada sobre lo que trabajar).
    if (!patients.length) {
      return res.status(200).json({
        stats: { activeTreatments: 0, upcomingControls: 0, patientsInFollowUp: 0, finishedTreatments: 0 },
        patients: [],
        chartData: [],
        upcomingControls: [],
      });
    }

    // Recolecta, sin duplicados, los ids de todas las consultas ligadas a algún procedimiento de
    // cualquier paciente, para poder traer esas consultas y sus recetas en un solo query cada
    // una (en vez de una consulta a la base de datos por cada procedimiento de cada paciente).
    const consultationIds = [
      ...new Set(
        patients.flatMap((p) => (p.clinical_history?.procedures || []).map((pr) => pr.consultation_id).filter(Boolean))
      ),
    ];
    const [consultations, prescriptions] = await Promise.all([
      // Solo se trae lo necesario para la última observación: la
      // evolución o diagnóstico registrado en esa consulta y su fecha.
      consultationModel
        .find({ _id: { $in: consultationIds } })
        .select("clinical_data.evolution clinical_data.diagnosis_description date")
        .lean(),
      // El schema declara el campo consultations_id, pero todo el
      // sistema realmente guarda y consulta por consultation_id (ver
      // consultationController.js), se sigue esa convención real.
      prescriptionModel.find({ consultation_id: { $in: consultationIds } }).lean(),
    ]);
    // Mapas por id (en vez de arrays) para poder buscar la consulta/receta de un procedimiento
    // en O(1) más abajo, sin tener que recorrer el array completo cada vez.
    const consultationById = new Map(consultations.map((c) => [String(c._id), c]));
    const prescriptionByConsultationId = new Map(prescriptions.map((p) => [String(p.consultation_id), p]));

    // Hoy, normalizado a medianoche: se reutiliza en todas las
    // comparaciones de fecha de esta función (status, próximos
    // controles, gráfica) para que todas usen el mismo corte de día.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Arma, por cada paciente, el objeto de seguimiento con la misma forma que antes tenían los
    // datos quemados (treatmentsPatients en treatmentsData.js), pero calculado a partir de su
    // historial real de procedimientos.
    const followUpPatients = patients.map((p) => {
      // Se ordenan los procedimientos del paciente del más antiguo al
      // más reciente: el último del array pasa a ser el tratamiento
      // actual (latest) y el primero da la fecha de inicio.
      const procedures = [...(p.clinical_history?.procedures || [])].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const latest = procedures[procedures.length - 1];
      const followUpDate = latest?.follow_up_date ? new Date(latest.follow_up_date) : null;

      // El estado se deriva de la fecha de control: sin control programado
      // se asume finalizado, con control futuro sigue activo, y si el
      // control ya pasó y no hay un procedimiento más nuevo, requiere
      // revisión. status_override, fijado desde el selector de estado del
      // panel del paciente (PATCH /treatments/:id/status), reemplaza este
      // cálculo cuando alguien lo fija a mano.
      let status;
      if (!followUpDate) status = "Finalizado";
      else if (followUpDate >= today) status = "En tratamiento";
      else status = "Requiere revisión";
      const statusIsManual = !!latest?.status_override;
      if (statusIsManual) status = latest.status_override;

      // Receta y consulta asociadas al procedimiento más reciente (si
      // tiene consultation_id), de ahí salen los medicamentos y la
      // última observación clínica del paciente.
      const latestPrescription = latest?.consultation_id
        ? prescriptionByConsultationId.get(String(latest.consultation_id))
        : null;
      const latestConsultation = latest?.consultation_id
        ? consultationById.get(String(latest.consultation_id))
        : null;

      // Convierte los medicamentos de la receta (campos name, dose,
      // frequency, instructions) al formato name, detail que espera
      // la tarjeta de tratamiento actual del panel del paciente.
      const treatmentItems = (latestPrescription?.medications || [])
        .filter((m) => m?.name)
        .map((m) => ({
          name: m.name,
          detail: [m.dose, m.frequency].filter(Boolean).join(" · ") || m.instructions || "",
        }));

      // Convierte cada procedimiento del historial en un paso del
      // seguimiento del tratamiento: completado si ya pasó su fecha,
      // pendiente si es futuro.
      const followUpSteps = procedures.map((pr) => ({
        label: `${pr.procedure_name || "Procedimiento"} — ${formatDate(pr.date)}`,
        detail: pr.diagnosis || "Sin diagnóstico registrado",
        status: new Date(pr.date) <= today ? "Completado" : "Pendiente",
      }));
      // Si el procedimiento más reciente tiene un control futuro
      // programado, se agrega como un paso extra pendiente al final
      // de la línea de tiempo (no es un procedimiento ya realizado,
      // es la próxima cita de seguimiento).
      if (followUpDate && followUpDate > today) {
        followUpSteps.push({
          label: `Control de seguimiento — ${formatDate(followUpDate)}`,
          detail: "Próximo control programado",
          status: "Pendiente",
        });
      }

      // Días que faltan (o que ya pasaron) para el próximo control,
      // usado para el texto de días restantes o vencidos que se
      // muestra junto a la fecha.
      const remaining = followUpDate ? daysUntil(followUpDate) : null;

      // Objeto final de este paciente, con exactamente la misma forma
      // que usaba el mock (treatmentsPatients), para que ningún
      // componente del frontend tuviera que cambiar.
      return {
        id: String(p._id),
        name: `${p.name || ""} ${p.last_name || ""}`.trim(),
        age: calcAge(p.birth_date),
        gender: p.gender || "—",
        diagnosis: latest?.diagnosis || "Sin diagnóstico registrado",
        diagnosisDetail: "",
        currentTreatment: latest?.procedure_name || "Sin tratamiento activo",
        currentTreatmentDetail: treatmentItems.length ? `${treatmentItems.length} medicamento(s) recetados` : "",
        doctor: latest?.doctor_name || "—",
        startDate: formatDate(procedures[0]?.date),
        nextControl: followUpDate ? formatDate(followUpDate) : "—",
        nextControlIn:
          remaining === null
            ? ""
            : remaining >= 0
            ? `En ${remaining} día(s)`
            : `Vencido hace ${Math.abs(remaining)} día(s)`,
        status,
        // Indica al frontend si el estado de arriba viene del selector
        // manual o del cálculo automático, para poder preseleccionar la
        // opción correcta en el selector de estado del panel del paciente.
        statusIsManual,
        clinicalInfo: {
          diagnostico: latest?.diagnosis || "Sin diagnóstico registrado",
          medicoResponsable: latest?.doctor_name || "—",
          fechaInicio: formatDate(procedures[0]?.date),
          fechaEstimadaAlta: followUpDate ? formatDate(followUpDate) : "—",
        },
        treatmentItems: treatmentItems.length
          ? treatmentItems
          : [{ name: "Sin medicamentos recetados", detail: "" }],
        followUpSteps,
        lastObservation: {
          text:
            latestConsultation?.clinical_data?.evolution ||
            latestConsultation?.clinical_data?.diagnosis_description ||
            "Sin observaciones registradas en la última consulta.",
          date: formatDate(latestConsultation?.date || latest?.date),
          author: latest?.doctor_name || "—",
        },
        // Pestaña evolución del panel del paciente, mismo formato que
        // una nota (texto, quién la escribió, cuándo). Se actualiza
        // con el botón actualizar evolución (PATCH
        // /treatments/:id/evolution). El texto queda vacío hasta la
        // primera vez que alguien lo llene, no hay evolución
        // inventada por defecto.
        evolution: {
          text: latest?.result || "",
          author: latest?.resultAuthor || "—",
          date: latest?.resultUpdatedAt ? formatDate(latest.resultUpdatedAt) : "",
        },
        // Pestaña notas del panel del paciente, bitácora que se llena
        // con el botón agregar nota (POST /treatments/:id/notes). Se
        // muestra la más reciente primero. El id es el _id real del
        // subdocumento (Mongoose lo autogenera en cada elemento del
        // array), lo necesita el frontend para poder editar o
        // eliminar una nota puntual sin afectar las demás.
        notes: [...(latest?.notes || [])]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((n) => ({ id: String(n._id), text: n.text, author: n.author || "—", date: formatDate(n.date) })),
        // Pestaña documentos del panel del paciente, archivos subidos
        // con el botón subir documento (POST
        // /treatments/:id/documents), guardados en Cloudinary. Más
        // reciente primero.
        documents: [...(latest?.documents || [])]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((d) => ({
            id: String(d._id),
            name: d.name,
            url: d.url,
            uploadedBy: d.uploadedBy || "—",
            date: formatDate(d.date),
          })),
        // Fecha del próximo control en formato yyyy-mm-dd (a
        // diferencia de nextControl, que ya viene formateada
        // dd/mm/aaaa), la necesita el input de tipo date del modal
        // programar control para precargar el valor actual.
        nextControlISO: followUpDate ? followUpDate.toISOString().slice(0, 10) : "",
        // Campo interno, con guion bajo al inicio, no se manda al
        // frontend: se necesita como objeto Date real (no como string
        // ya formateado) para las comparaciones y el orden de más
        // abajo (stats, próximos controles). Se descarta justo antes
        // de responder (ver patientsResponse).
        _followUpDate: followUpDate,
      };
    });

    // Tarjetas de estadísticas (TreatmentsStats).
    // Cuenta cuántos pacientes cayeron en cada status calculado arriba.
    const activeTreatments = followUpPatients.filter((p) => p.status === "En tratamiento").length;
    const finishedTreatments = followUpPatients.filter((p) => p.status === "Finalizado").length;

    // Cuántos pacientes tienen su próximo control dentro de los
    // siguientes 7 días (ventana que usa la tarjeta de próximos
    // controles de las estadísticas).
    const in7Days = new Date(today.getTime() + 7 * MS_DAY);
    const upcomingControlsCount = followUpPatients.filter(
      (p) => p._followUpDate && p._followUpDate >= today && p._followUpDate <= in7Days
    ).length;

    // Panel de próximos controles (UpcomingControls).
    // Toma los pacientes con control programado dentro de los
    // próximos 30 días, los ordena por fecha más próxima primero y se
    // queda solo con los 5 primeros para no saturar el panel.
    const in30Days = new Date(today.getTime() + 30 * MS_DAY);
    const upcomingControlsList = followUpPatients
      .filter((p) => p._followUpDate && p._followUpDate >= today && p._followUpDate <= in30Days)
      .sort((a, b) => a._followUpDate - b._followUpDate)
      .slice(0, 5)
      .map((p) => ({
        day: String(p._followUpDate.getDate()).padStart(2, "0"),
        month: MONTHS[p._followUpDate.getMonth()],
        name: p.name,
        time: "Todo el día",
        detail: `Control de seguimiento — ${p.diagnosis}`,
        doctor: p.doctor,
      }));

    // Gráfica de tratamientos iniciados por semana (EvolutionChart).
    // No existe ningún campo que clasifique la evolución clínica de
    // un paciente (mejorando, sin cambios, empeorando), esa parte del
    // mock era pura decoración. La única métrica que se puede sacar
    // honestamente de datos reales es cuántos tratamientos nuevos
    // empezaron cada semana, así que la gráfica se redujo a esa única
    // serie real en vez de inventar categorías.
    // Arma las últimas 6 semanas (cada una de 7 días), de la más
    // antigua a la más reciente.
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const end = new Date(today.getTime() - (5 - i) * 7 * MS_DAY);
      const start = new Date(end.getTime() - 6 * MS_DAY);
      return { start, end, label: formatDate(end).slice(0, 5) };
    });
    // Junta en un solo array las fechas de TODOS los procedimientos de TODOS los pacientes, para
    // luego contar cuántas cayeron dentro de cada semana.
    const allProcedureDates = patients.flatMap((p) =>
      (p.clinical_history?.procedures || []).map((pr) => pr.date).filter(Boolean)
    );
    const chartData = weeks.map(({ start, end, label }) => ({
      label,
      iniciados: allProcedureDates.filter((d) => {
        const date = new Date(d);
        return date >= start && date <= end;
      }).length,
    }));

    // Quita el campo interno _followUpDate (solo era necesario para
    // los cálculos de arriba) antes de mandar la lista de pacientes
    // al frontend.
    const patientsResponse = followUpPatients.map(({ _followUpDate, ...rest }) => rest);

    return res.status(200).json({
      stats: {
        activeTreatments,
        upcomingControls: upcomingControlsCount,
        patientsInFollowUp: followUpPatients.length,
        finishedTreatments,
      },
      patients: patientsResponse,
      chartData,
      upcomingControls: upcomingControlsList,
    });
  } catch (error) {
    // Si ocurre cualquier error durante la consulta o el armado de la
    // respuesta, se registra en consola y se responde con un 500
    // genérico, igual que el resto de los controllers.
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PATCH /api/treatments/:patientId/evolution, botón para actualizar
// la evolución.
// Sobrescribe el campo result del tratamiento o procedimiento más
// reciente del paciente (se pisa el valor anterior a propósito: es
// el estado actual de la evolución, no un historial) y deja
// registrado quién lo actualizó y cuándo, para mostrarlo con el
// mismo formato que una nota.
treatmentsController.updateEvolution = async (req, res) => {
  try {
    const { result } = req.body;
    if (!result || !result.trim()) {
      return res.status(400).json({ message: "La evolución no puede estar vacía." });
    }

    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    latest.result = result.trim();
    latest.resultAuthor = await resolveActorName(req);
    latest.resultUpdatedAt = new Date();
    await patient.save();

    return res.status(200).json({ message: "Evolución actualizada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /api/treatments/:patientId/evolution, botón eliminar de la
// pestaña evolución.
// Vacía el campo result (y quién y cuándo lo escribió) del
// tratamiento actual, volviendo al estado sin evolución registrada.
treatmentsController.deleteEvolution = async (req, res) => {
  try {
    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    latest.result = undefined;
    latest.resultAuthor = undefined;
    latest.resultUpdatedAt = undefined;
    await patient.save();

    return res.status(200).json({ message: "Evolución eliminada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// POST /api/treatments/:patientId/notes, botón agregar nota.
// A diferencia de la evolución, las notas se acumulan (cada clic
// agrega una entrada nueva a la bitácora, nunca reemplaza una
// anterior), firmada con el nombre de quien la escribió.
treatmentsController.addNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "La nota no puede estar vacía." });
    }

    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    const author = await resolveActorName(req);
    latest.notes = latest.notes || [];
    latest.notes.push({ text: text.trim(), author, date: new Date() });
    await patient.save();

    return res.status(200).json({ message: "Nota agregada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PATCH /api/treatments/:patientId/notes/:noteId, botón editar de
// una nota puntual.
// Cambia el texto de una nota ya existente sin tocar las demás
// (busca el subdocumento por su propio _id dentro de latest.notes
// con .id(), el helper que Mongoose da a todo DocumentArray).
treatmentsController.updateNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "La nota no puede estar vacía." });
    }

    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    const note = latest.notes?.id(req.params.noteId);
    if (!note) return res.status(404).json({ message: "Nota no encontrada" });

    note.text = text.trim();
    await patient.save();

    return res.status(200).json({ message: "Nota actualizada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /api/treatments/:patientId/notes/:noteId, botón eliminar de
// una nota puntual.
treatmentsController.deleteNote = async (req, res) => {
  try {
    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    const note = latest.notes?.id(req.params.noteId);
    if (!note) return res.status(404).json({ message: "Nota no encontrada" });

    // .pull() es el método que Mongoose da a los DocumentArray para
    // quitar un subdocumento por su _id, sin afectar la posición ni
    // el orden de los demás.
    latest.notes.pull(req.params.noteId);
    await patient.save();

    return res.status(200).json({ message: "Nota eliminada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// POST /api/treatments/:patientId/documents, botón subir documento
// de la pestaña documentos.
// El archivo ya está en Cloudinary cuando este código corre (lo sube
// el middleware de multer, uploadDocument, antes de llegar aquí, ver
// routes/treatments/treatments.js). req.file trae la URL pública
// (path) y el public_id que hace falta para poder borrarlo después.
treatmentsController.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Selecciona un archivo para subir." });
    }

    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    const uploadedBy = await resolveActorName(req);
    latest.documents = latest.documents || [];
    latest.documents.push({
      name: req.file.originalname,
      url: req.file.path,
      public_id: req.file.filename,
      uploadedBy,
      date: new Date(),
    });
    await patient.save();

    return res.status(200).json({ message: "Documento subido" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /api/treatments/:patientId/documents/:documentId, botón
// eliminar de un documento.
treatmentsController.deleteDocument = async (req, res) => {
  try {
    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    const document = latest.documents?.id(req.params.documentId);
    if (!document) return res.status(404).json({ message: "Documento no encontrado" });

    // Se borra primero de Cloudinary (resource_type auto también
    // aplica a la eliminación, por eso se prueba primero como raw,
    // el tipo real que usan los PDF y Word ahí, y si no existe con
    // ese tipo, se prueba como imagen) y luego el registro en el
    // paciente.
    if (document.public_id) {
      await cloudinary.uploader.destroy(document.public_id, { resource_type: "raw" }).catch(() =>
        cloudinary.uploader.destroy(document.public_id, { resource_type: "image" }).catch(() => {})
      );
    }

    latest.documents.pull(req.params.documentId);
    await patient.save();

    return res.status(200).json({ message: "Documento eliminado" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PATCH /api/treatments/:patientId/follow-up, botón programar
// control.
// Establece (o reprograma) la fecha de control del tratamiento
// actual. Esto es lo único que getFollowUp lee para decidir el
// status del paciente y su próximo control, así que este botón es lo
// que realmente mueve a un paciente entre en tratamiento y requiere
// revisión.
treatmentsController.scheduleControl = async (req, res) => {
  try {
    const { follow_up_date } = req.body;
    if (!follow_up_date || isNaN(new Date(follow_up_date).getTime())) {
      return res.status(400).json({ message: "Selecciona una fecha de control válida." });
    }

    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    latest.follow_up_date = new Date(follow_up_date);
    await patient.save();

    return res.status(200).json({ message: "Control programado" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Valores válidos para el selector de estado del panel del paciente.
// "auto" no se guarda tal cual: significa borrar status_override y volver
// a dejar que getFollowUp calcule el estado a partir de follow_up_date.
const MANUAL_STATUS_VALUES = ["En tratamiento", "Requiere revisión", "Finalizado"];

// PATCH /api/treatments/:patientId/status, selector de estado del panel
// del paciente.
// No existía ningún lugar en el sistema donde el estado de un tratamiento
// (En tratamiento, Requiere revisión, Finalizado) se pudiera configurar:
// getFollowUp lo calculaba siempre a partir de follow_up_date, sin
// excepción. Este endpoint agrega status_override al procedimiento o
// tratamiento actual del paciente, para poder fijar el estado a mano
// cuando el cálculo automático no aplica a un caso puntual.
treatmentsController.setStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== "auto" && !MANUAL_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "Selecciona un estado válido." });
    }

    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    latest.status_override = status === "auto" ? null : status;
    await patient.save();

    return res.status(200).json({ message: "Estado actualizado" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PATCH /api/treatments/:patientId/discharge, botón dar de alta.
// Limpia la fecha de control pendiente del tratamiento actual. No
// borra ni desactiva al paciente (is_active es para el login, no
// para esto), solo cierra este tratamiento: al no quedar ningún
// control programado, getFollowUp lo reclasifica automáticamente
// como finalizado la próxima vez que se cargue la pantalla.
treatmentsController.discharge = async (req, res) => {
  try {
    const { patient, latest } = await loadPatientWithLatestProcedure(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    if (!latest) return res.status(404).json({ message: "El paciente no tiene tratamientos registrados" });

    latest.follow_up_date = undefined;
    await patient.save();

    return res.status(200).json({ message: "Paciente dado de alta" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default treatmentsController;
