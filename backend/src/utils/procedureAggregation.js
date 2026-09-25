import proceduresModel from "../models/procedures/procedures.js";

const GENERAL_CONSULT_NAME = "Consulta Médica General";
const DEFAULT_INSTRUCTIONS = "Llega 10 minutos antes de tu cita con tu documento de identidad (DUI) a mano.";

// Normaliza uno o varios ids a un array de strings sin vacíos ni duplicados, conservando
// el orden en que aparecen. Acepta: un array (req.body, o req.query si el mismo query
// param se repite), un solo id suelto, o un único string separado por comas — los 3
// clientes (móvil, portal público, panel privado) mandan "id1,id2" como query param para
// /schedule/patient-available-slots y afines, porque URLSearchParams no serializa un
// array de forma que Express lo vuelva a leer como array.
const normalizeIds = (procedureIds) => {
    const list = Array.isArray(procedureIds) ? procedureIds : [procedureIds];
    const seen = new Set();
    const out = [];
    for (const entry of list) {
        const raw = entry?.toString?.() ?? String(entry ?? "");
        const parts = raw.includes(",") ? raw.split(",") : [raw];
        for (const part of parts) {
            const str = part.trim();
            if (!str || str === "undefined" || str === "null" || seen.has(str)) continue;
            seen.add(str);
            out.push(str);
        }
    }
    return out;
};

// Punto único donde se resuelve una cita a partir de uno o varios procedimientos del
// catálogo. Reemplaza la lógica que antes vivía duplicada en resolvePatientService
// (appointmentsController.js) y en patientPortalController.bookAppointment, cada una con
// su propia copia de "duración/precio/tipo salen del único procedimiento elegido".
//
//   - duration_minutes / total: suma de cada procedimiento.
//   - type ("Consulta Médica General" vs "Procedimiento"): solo es la primera si se
//     eligió exactamente ese único procedimiento; cualquier otra combinación (2+, o uno
//     solo distinto) es "Procedimiento". Mantiene sin cambios reportsController.js, que
//     agrupa ingresos/conteos por este string binario.
//   - requiresDoctor / requiresNurse: true si ALGÚN procedimiento elegido lo requiere
//     (mezclar uno que exige doctor con uno que no, el doctor pasa a ser el proveedor
//     principal — generaliza la regla de un solo procedimiento sin doctor).
//   - appointmentTypeName: del primer procedimiento elegido (appointment_type solo
//     colorea el calendario, no afecta precio ni duración, ver el modelo de Appointment).
//   - instructions: unión de las pre_care_instructions no vacías y distintas de cada
//     procedimiento; si ninguna trae, el aviso genérico de siempre.
//
// Devuelve null si no se pasó ningún id, o si alguno no resuelve a un procedimiento
// activo del catálogo — nunca se agenda con un procedimiento parcialmente inválido.
export async function resolveProcedures(procedureIds) {
    const ids = normalizeIds(procedureIds);
    if (ids.length === 0) return null;

    // $ne: false, no is_active: true: procedimientos de antes de que existiera este campo
    // quedaron sin valor (undefined), y deben seguir contando como activos.
    const found = await proceduresModel
        .find({ _id: { $in: ids }, is_active: { $ne: false } })
        .populate("appointment_type_ids", "name");
    if (found.length !== ids.length) return null;

    // find() con $in no garantiza el orden de ids: se reordena tal como el cliente los eligió.
    const byId = new Map(found.map((p) => [p._id.toString(), p]));
    const ordered = ids.map((id) => byId.get(id));

    const duration_minutes = ordered.reduce((sum, p) => sum + (Number(p.estimated_duration) || 30), 0);
    const total = ordered.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

    const type = ordered.length === 1 && ordered[0].name === GENERAL_CONSULT_NAME
        ? GENERAL_CONSULT_NAME
        : "Procedimiento";

    const requiresDoctor = ordered.some((p) => p.requires_doctor !== false);
    const requiresNurse = ordered.some((p) => !!p.requires_nurse);

    const appointmentTypeName = ordered[0]?.appointment_type_ids?.[0]?.name;

    const instructions =
        [...new Set(ordered.map((p) => p.pre_care_instructions?.trim()).filter(Boolean))].join(" ") ||
        DEFAULT_INSTRUCTIONS;

    return {
        procedure_ids: ordered.map((p) => p._id),
        procedures: ordered,
        names: ordered.map((p) => p.name),
        type,
        duration_minutes,
        total,
        requiresDoctor,
        requiresNurse,
        appointmentTypeName,
        instructions,
    };
}

// Igual que resolveProcedures, pero solo para recalcular requiresDoctor/requiresNurse a
// partir del array ya guardado en una cita existente (reagendar, aceptar, notificaciones):
// no hace falta la suma de duración/precio ahí, así que se evita el populate de más.
export async function resolveProcedureFlags(procedureIds) {
    const ids = normalizeIds(procedureIds);
    if (ids.length === 0) return { requiresDoctor: true, requiresNurse: false };

    const found = await proceduresModel
        .find({ _id: { $in: ids } })
        .select("requires_doctor requires_nurse");

    return {
        requiresDoctor: found.some((p) => p.requires_doctor !== false),
        requiresNurse: found.some((p) => !!p.requires_nurse),
    };
}
