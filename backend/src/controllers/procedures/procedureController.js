import proceduresModel from '../../models/procedures/procedures.js'
import appointmentTypeModel from '../../models/appointmentTypes/appointmentType.js'
import appointmentsModel from '../../models/appointments/appointments.js'
import consultationModel from '../../models/consultations/consultation.js'
import { getNonNegativeError, escapeRegex } from '../../utils/validators.js'

const proceduresController = {}

// Un procedimiento siempre debe tener al menos un rol que lo atienda: si no
// requiere enfermera, el doctor es obligatorio sin importar lo que se haya
// mandado (nunca puede haber un procedimiento sin doctor NI enfermera). Si sí
// requiere enfermera, respeta lo que se mandó (por defecto true: es raro que
// un doctor no participe).
const resolveRequiresDoctor = (requiresNurse, requiresDoctorRaw) => {
    if (!requiresNurse) return true
    if (requiresDoctorRaw === undefined || requiresDoctorRaw === null || requiresDoctorRaw === "") return true
    return !!requiresDoctorRaw
}

// Limpia y valida la lista de tipos de cita elegidos (ver appointment_type_ids en el
// modelo): obligatorio, al menos uno, cada elemento debe ser un ObjectId con forma válida
// (24 caracteres hex) y no puede repetirse (el mismo tipo de cita elegido dos veces no
// aporta nada) — el resto (que existan de verdad en la colección) lo revisa el propio
// Mongoose al popular/guardar la referencia.
const getAppointmentTypeIdsError = (appointmentTypeIds) => {
    if (!Array.isArray(appointmentTypeIds) || appointmentTypeIds.length === 0) {
        return "Debes elegir al menos un tipo de cita."
    }
    const invalido = appointmentTypeIds.some((id) => !/^[0-9a-fA-F]{24}$/.test(String(id)))
    if (invalido) return "Uno de los tipos de cita elegidos no es válido."
    const unicos = new Set(appointmentTypeIds.map((id) => String(id)))
    if (unicos.size !== appointmentTypeIds.length) {
        return "No puedes elegir el mismo tipo de cita más de una vez."
    }
    return null
}

// No tiene sentido elegir más tipos de cita que los que existen en el catálogo: como
// getAppointmentTypeIdsError ya impide repetir uno, superar ese total implicaría
// forzosamente un duplicado. Es async (a diferencia del resto de validaciones de este
// campo) porque necesita contar el catálogo real en la base de datos.
const getAppointmentTypeIdsCountError = async (appointmentTypeIds) => {
    const total = await appointmentTypeModel.countDocuments()
    if (appointmentTypeIds.length > total) {
        return `No puedes elegir más de ${total} tipo(s) de cita: es el total que existe en el catálogo.`
    }
    return null
}

// Evita procedimientos duplicados (mismo nombre, sin importar
// mayúsculas o espacios extra). Dos procedimientos con el mismo
// nombre confunden cualquier selector que los liste (ProcedureModal,
// AppointmentsForm, ProceduresForm). excludeId se pasa al editar,
// para no chocar contra sí mismo.
const findDuplicateProcedureName = async (name, excludeId) => {
    const normalized = String(name || '').trim()
    if (!normalized) return null
    const found = await proceduresModel.findOne({
        name: new RegExp(`^${escapeRegex(normalized)}$`, 'i'),
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
    return found ? 'Ya existe un procedimiento registrado con ese nombre' : null
}

// Valida precio, duración y cantidad de materiales de un
// procedimiento: mismas reglas que ya exige el frontend
// (ProceduresForm.jsx y ProcedureModal.jsx), repetidas aquí porque
// el backend nunca debe confiar solo en que el cliente ya validó.
const getProcedureError = ({ price, estimated_duration, materials }) => {
    const priceError = getNonNegativeError(price, "El precio")
    if (priceError) return priceError

    if (estimated_duration !== undefined && estimated_duration !== null && estimated_duration !== "") {
        const duration = Number(estimated_duration)
        if (Number.isNaN(duration)) return "La duración estimada debe ser un número"
        if (duration <= 0) return "La duración estimada debe ser mayor a 0"
    }

    for (const material of materials || []) {
        if (material.quantity === undefined || material.quantity === null || material.quantity === "") continue
        const quantity = Number(material.quantity)
        if (Number.isNaN(quantity)) return "La cantidad de un material debe ser un número"
        if (quantity < 1) return "La cantidad de un material debe ser al menos 1"
    }

    // Un mismo material no puede repetirse en la lista: para necesitar varias
    // unidades del mismo insumo existe la cantidad. Se compara por insumo cuando
    // viene del catálogo, o por nombre normalizado cuando es un material libre
    // sin insumo vinculado.
    const materialKeys = (materials || [])
        .map((material) => {
            if (material.insumo) return `insumo:${String(material.insumo)}`
            const nombre = String(material.name || "").trim().toLowerCase()
            return nombre ? `name:${nombre}` : null
        })
        .filter(Boolean)
    if (new Set(materialKeys).size !== materialKeys.length) {
        return "No puedes elegir el mismo material más de una vez, usa la cantidad."
    }

    return null
}

// GET, trae todos los procedimientos.
proceduresController.getProcedures = async (req, res) => {
    try {
        const response = await proceduresModel.find()
            // Populate del ObjectId insumo trayendo solo el nombre del inventario
            .populate("materials.insumo", "name")
            // Populate de los tipos de cita elegibles para este procedimiento, con lo
            // necesario para mostrarlos (nombre y color) sin una segunda consulta aparte.
            .populate("appointment_type_ids", "name color category")

        if (!response) return res.status(400).json({ message: "Dato no encontrado" })
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
}

// INSERT
proceduresController.insertProcedure = async (req, res) => {
    try {
        const {
            name,
            description,
            estimated_duration,
            price,
            materials,
            pre_care_instructions,
            post_operative_instructions,
            requires_nurse,
            requires_doctor,
            appointment_type_ids,
            is_active
        } = req.body

        const procedureError = getProcedureError({ price, estimated_duration, materials })
        if (procedureError) return res.status(400).json({ message: procedureError })

        const appointmentTypeError = getAppointmentTypeIdsError(appointment_type_ids)
        if (appointmentTypeError) return res.status(400).json({ message: appointmentTypeError })

        const appointmentTypeCountError = await getAppointmentTypeIdsCountError(appointment_type_ids)
        if (appointmentTypeCountError) return res.status(400).json({ message: appointmentTypeCountError })

        const duplicateError = await findDuplicateProcedureName(name)
        if (duplicateError) return res.status(400).json({ message: duplicateError })

        // Limpia los materiales: quita el _id que pueda venir del
        // frontend y asegura que cada material tenga name como String.
        const cleanMaterials = (materials || []).map(({ _id, ...rest }) => ({
            name:     rest.name     || "",
            quantity: rest.quantity || 1,
            // insumo solo si viene como ObjectId válido
            ...(rest.insumo ? { insumo: rest.insumo } : {})
        }))

        const payload = new proceduresModel({
            name,
            description,
            estimated_duration,
            price,
            materials: cleanMaterials,
            pre_care_instructions,
            post_operative_instructions,
            requires_nurse,
            requires_doctor: resolveRequiresDoctor(requires_nurse, requires_doctor),
            appointment_type_ids,
            is_active
        })

        const savedProcedure = await payload.save()
        await savedProcedure.populate("appointment_type_ids", "name color category")
        return res.status(200).json({ message: "Dato guardado", Data: savedProcedure })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
}

// UPDATE
proceduresController.updateProcedure = async (req, res) => {
    try {
        const response = await proceduresModel.findById(req.params.id)
        if (!response) return res.status(400).json({ message: "Dato no encontrado" })

        const {
            name,
            description,
            estimated_duration,
            price,
            materials,
            pre_care_instructions,
            post_operative_instructions,
            requires_nurse,
            requires_doctor,
            appointment_type_ids,
            is_active
        } = req.body

        const procedureError = getProcedureError({ price, estimated_duration, materials })
        if (procedureError) return res.status(400).json({ message: procedureError })

        const appointmentTypeError = getAppointmentTypeIdsError(appointment_type_ids)
        if (appointmentTypeError) return res.status(400).json({ message: appointmentTypeError })

        const appointmentTypeCountError = await getAppointmentTypeIdsCountError(appointment_type_ids)
        if (appointmentTypeCountError) return res.status(400).json({ message: appointmentTypeCountError })

        const duplicateError = await findDuplicateProcedureName(name, req.params.id)
        if (duplicateError) return res.status(400).json({ message: duplicateError })

        // Limpia el _id de subdocumentos que Mongoose genera
        // automáticamente al devolver el documento, si se mandan de
        // vuelta causan CastError.
        const cleanMaterials = (materials || []).map(({ _id, ...rest }) => ({
            name:     rest.name     || "",
            quantity: rest.quantity || 1,
            ...(rest.insumo ? { insumo: rest.insumo } : {})
        }))

        const payload = {
            name,
            description,
            estimated_duration,
            price,
            materials: cleanMaterials,
            pre_care_instructions,
            post_operative_instructions,
            requires_nurse,
            requires_doctor: resolveRequiresDoctor(requires_nurse, requires_doctor),
            appointment_type_ids,
            is_active
        }

        const procedureUpdate = await proceduresModel.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        ).populate("appointment_type_ids", "name color category")
        return res.status(200).json({ message: "Dato actualizado", Data: procedureUpdate })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
}

// DELETE
proceduresController.deleteProcedure = async (req, res) => {
    try {
        // Antes se borraba sin comprobar si alguna cita o consulta histórica
        // todavía lo referencia (misma clase de bug ya resuelta para
        // pacientes y consultas): quedaban referencias fantasma a un
        // procedimiento que ya no existe.
        const [hasAppointments, hasConsultations] = await Promise.all([
            appointmentsModel.exists({ procedure_id: req.params.id }),
            consultationModel.exists({ "procedure.procedure_id": req.params.id }),
        ]);
        if (hasAppointments || hasConsultations) {
            return res.status(400).json({
                message: "No se puede eliminar: hay citas o consultas que usan este procedimiento.",
            });
        }

        const response = await proceduresModel.findByIdAndDelete(req.params.id)
        if (!response) return res.status(400).json({ message: "Dato no encontrado" })
        return res.status(200).json({ message: "Dato eliminado" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
}

export default proceduresController