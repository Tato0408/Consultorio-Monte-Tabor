import crypto from "crypto";
import bcryptjs from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import { sendEmail } from "../../utils/sendMailMailjet.js";
import patientsModel from "../../models/patients/patients.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js";
import sickLeavesModel from "../../models/sickLeaves/sickLeave.js";
import proceduresModel from "../../models/procedures/procedures.js";
import { runAppointmentAutoTransitions } from "../appointments/appointmentsController.js";
import { config } from "../../../config.js";
import { validateUserFieldFormats, getMissingRequiredField, getPasswordError } from "../../utils/validators.js";

// Controller de autoservicio para pacientes: a diferencia de
// patientsController.js (usado por el panel administrativo, donde el
// staff gestiona cualquier paciente por :id y con permisos de rol),
// este es el que consume la app móvil. Cada paciente solo puede crear
// su propia cuenta, y ver o actualizar únicamente su propio perfil
// (identidad tomada del token, nunca de un :id).
const patientSelfController = {};

// El diagnóstico de un antecedente patológico es texto libre corto.
const MAX_DIAGNOSIS_LENGTH = 50;

const REQUIRED_FIELDS = ["name", "last_name", "birth_date", "gender", "phone", "email", "password"];

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// Mismo enum que registerPatientsController.js (portal web) y PatientFormModal.jsx
// (panel privado): ninguna otra pantalla del sistema soporta un valor distinto a estos
// dos (el ícono ♂/♀ del encabezado del paciente, por ejemplo, asume uno de los dos).
const GENEROS_VALIDOS = ["Masculino", "Femenino"];

// Firma el mismo tipo de token que usa el login. Registrarse
// funciona como un login escondido: el paciente queda autenticado de
// inmediato, sin pasar por la pantalla de login. Misma duración de 30 días que
// loginPatientController.login, para que esta sesión "escondida" no expire antes que
// una iniciada por el formulario normal.
const signPatientToken = (patient) =>
    jsonwebtoken.sign({ id: patient._id, userType: "patient" }, config.JWT.secret, { expiresIn: "30d" });

const toUserPayload = (patient) => ({
    id: patient._id,
    email: patient.email,
    name: patient.name,
    last_name: patient.last_name,
});

// Todos los endpoints con sesión repiten este chequeo; se extrae para no copiarlo
const denyIfNotPatient = (req, res) => {
    if (req.user?.role !== "patient") {
        res.status(403).json({ message: "Acceso denegado" });
        return true;
    }
    return false;
};

// POST /api/patientAccount/register, público, cualquiera puede registrarse.
// Exclusivo de la app móvil (a diferencia de registerPatientsController.register, el
// registro del portal público web). Decisión de producto, no un descuido: la app se
// instala desde las tiendas oficiales, un canal ya menos anónimo que un formulario
// abierto en cualquier navegador, así que acá se crea al paciente de inmediato, ya
// activo y verificado (is_verified:true), sin pedir un código de confirmación por
// correo. El registro web sí lo exige (ver registerPatientsController.js), porque un
// formulario público en internet está mucho más expuesto a registros falsos o de spam.
// La verificación de duplicados tampoco es idéntica entre ambos (acá va combinada con
// $or en una sola consulta, allá en dos separadas): no hay una razón funcional para esa
// diferencia puntual, es simplemente cómo se escribió cada endpoint por separado.
patientSelfController.register = async (req, res) => {
    try {
        let { name, last_name, dui, birth_date, gender, phone, email, password } = req.body;

        const requiredError = getMissingRequiredField(
            { name, last_name, birth_date, gender, phone, email, password },
            REQUIRED_FIELDS
        );
        if (requiredError) {
            return res.status(400).json({ message: requiredError });
        }

        name = name.trim();
        last_name = last_name.trim();
        phone = phone.trim();
        email = email.trim();
        password = password.trim();
        // El DUI es opcional (puede haber pacientes menores de edad
        // sin DUI todavía), una cadena vacía cuenta como no enviado,
        // no como un valor a validar.
        dui = dui ? String(dui).trim() : undefined;
        if (dui === "") dui = undefined;

        const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        const passwordError = getPasswordError(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        // Único dentro de la colección de pacientes, a propósito no
        // se usa findStaffDuplicate: los pacientes pueden compartir
        // correo o DUI con el staff, solo no entre ellos mismos (el
        // login de pacientes busca por correo con findOne, tiene que
        // ser único ahí).
        const duplicateFilter = dui ? { $or: [{ email }, { dui }] } : { email };
        const existsPatient = await patientsModel.findOne(duplicateFilter);
        if (existsPatient) {
            const field = existsPatient.email === email ? "correo" : "DUI";
            return res.status(400).json({ message: `Ya existe un paciente registrado con ese ${field}` });
        }

        const passwordHashed = await bcryptjs.hash(password, 10);

        const newPatient = new patientsModel({
            name,
            last_name,
            dui,
            birth_date,
            gender,
            phone,
            email,
            password: passwordHashed,
            is_active: true,
            is_verified: true,
            loginAttemps: 0,
            timeOut: null,
        });

        try {
            await newPatient.save();
        } catch (saveError) {
            // El índice único de email/dui (ver el modelo) es la garantía real contra dos
            // registros simultáneos con el mismo correo/DUI; el findOne de arriba por sí
            // solo no es atómico.
            if (saveError?.code === 11000) {
                const field = saveError.keyPattern?.dui ? "DUI" : "correo";
                return res.status(400).json({ message: `Ya existe un paciente registrado con ese ${field}` });
            }
            throw saveError;
        }

        const token = signPatientToken(newPatient);

        return res.status(201).json({
            message: "Registro exitoso",
            token,
            userType: "patient",
            user: toUserPayload(newPatient),
        });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/patientAccount/me, requiere sesión, devuelve solo el perfil de quien la pide.
patientSelfController.getMe = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const patient = await patientsModel.findById(req.user.id).select("-password");
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        return res.status(200).json(patient);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// PUT /api/patientAccount/me, requiere sesión, actualiza solo el
// perfil de quien la pide.
// La contraseña queda fuera de este endpoint a propósito: tiene su
// propio endpoint dedicado (changePassword, más abajo) porque
// requiere confirmar la contraseña actual primero.
patientSelfController.updateMe = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        let { name, last_name, dui, birth_date, gender, phone, email } = req.body;

        const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        // Mismo enum que registerPatientsController.js y el formulario de pacientes del
        // panel privado (PatientFormModal.jsx): antes este endpoint aceptaba cualquier
        // valor de gender sin validar, así que un paciente podía terminar con un valor
        // que el resto del sistema (que asume Masculino/Femenino) no espera.
        if (gender !== undefined && !GENEROS_VALIDOS.includes(gender)) {
            return res.status(400).json({ message: "Género no válido" });
        }

        const currentPatient = await patientsModel.findById(req.user.id).select("email");
        if (!currentPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        // El correo NO se aplica de inmediato aquí abajo: cambia de dueño el
        // acceso a la recuperación de contraseña, así que primero hay que
        // confirmar que el paciente de verdad controla esa bandeja de
        // entrada (ver verifyEmailChange más abajo). Antes se guardaba tal
        // cual, sin tocar is_verified: el badge "Cuenta verificada" seguía
        // en verde aunque el correo actual jamás se hubiera probado.
        const wantsEmailChange = email !== undefined && String(email).trim() !== currentPatient.email;
        const newEmail = wantsEmailChange ? String(email).trim() : undefined;

        const fieldsToSet = {};
        const fieldsToUnset = {};
        if (name !== undefined) fieldsToSet.name = String(name).trim();
        if (last_name !== undefined) fieldsToSet.last_name = String(last_name).trim();
        // Un DUI vacío borra el que tuviera, igual que ya hace patientsController.updatePatient
        // (panel privado) — antes "" se convertía en undefined antes de llegar aquí, así que
        // este endpoint interpretaba "vaciar el campo" como "no tocarlo": el paciente veía el
        // campo en blanco tras guardar, pero al recargar el DUI viejo seguía ahí.
        if (dui !== undefined) {
            const duiClean = String(dui).trim();
            if (duiClean) fieldsToSet.dui = duiClean;
            else fieldsToUnset.dui = "";
        }
        if (birth_date !== undefined) fieldsToSet.birth_date = birth_date;
        if (gender !== undefined) fieldsToSet.gender = gender;
        if (phone !== undefined) fieldsToSet.phone = String(phone).trim();

        if (Object.keys(fieldsToSet).length === 0 && Object.keys(fieldsToUnset).length === 0 && !wantsEmailChange) {
            return res.status(400).json({ message: "No data provided to update" });
        }

        // Si cambia correo o DUI, valida que no choque con OTRO paciente (a sí mismo se excluye)
        if (newEmail || fieldsToSet.dui) {
            const orConditions = [];
            if (newEmail) orConditions.push({ email: newEmail });
            if (fieldsToSet.dui) orConditions.push({ dui: fieldsToSet.dui });
            const collision = await patientsModel.findOne({
                _id: { $ne: req.user.id },
                $or: orConditions,
            });
            if (collision) {
                const field = collision.email === newEmail ? "correo" : "DUI";
                return res.status(400).json({ message: `Ya existe un paciente registrado con ese ${field}` });
            }
        }

        const updateOps = {};
        if (Object.keys(fieldsToSet).length > 0) updateOps.$set = fieldsToSet;
        if (Object.keys(fieldsToUnset).length > 0) updateOps.$unset = fieldsToUnset;

        const updatedPatient = await patientsModel
            .findByIdAndUpdate(req.user.id, updateOps, { new: true })
            .select("-password");

        if (!updatedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        if (!wantsEmailChange) {
            return res.status(200).json({ message: "Perfil actualizado", user: updatedPatient });
        }

        // Igual que el cambio de correo de administrador
        // (adminController.updateAdmin/verifyEmailChange): se manda un
        // código al correo NUEVO y el cambio solo se aplica al confirmarlo.
        const randomCode = crypto.randomBytes(3).toString("hex");
        const token = jsonwebtoken.sign(
            { patient_id: req.user.id, newEmail, randomCode },
            config.JWT.secret,
            { expiresIn: "15m" },
        );
        res.cookie("patientEmailChangeCookie", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 15 * 60 * 1000,
        });

        const htmlContent =
            "Para confirmar tu nuevo correo utiliza este código: " + randomCode + ". Expira en 15 minutos.";
        try {
            await sendEmail(newEmail, "Verificación de cambio de correo", htmlContent);
        } catch (error) {
            console.log("error " + error);
            return res.status(500).json({ message: "Error al enviar el correo de verificación" });
        }

        return res.status(200).json({
            message: "Perfil actualizado. Revisa tu nuevo correo para confirmar el cambio.",
            user: updatedPatient,
            pendingEmailVerification: true,
        });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// PUT /api/patientAccount/verifyEmailChange — confirma el código enviado al
// correo nuevo y recién ahí lo aplica, marcándolo como verificado. Mientras
// tanto, el correo verificado que sigue en efecto (y el que usa recuperar
// contraseña) es el anterior.
patientSelfController.verifyEmailChange = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { verificationCodeRequest } = req.body;
        const token = req.cookies.patientEmailChangeCookie;
        if (!token) {
            return res.status(400).json({ message: "No hay un cambio de correo pendiente de confirmar." });
        }

        let decoded;
        try {
            decoded = jsonwebtoken.verify(token, config.JWT.secret);
        } catch (error) {
            return res.status(400).json({ message: "El código expiró. Solicita el cambio de correo de nuevo." });
        }

        const { patient_id, newEmail, randomCode: storedCode } = decoded;
        if (patient_id !== req.user.id) {
            return res.status(403).json({ message: "No tienes permiso para confirmar este cambio." });
        }
        if (verificationCodeRequest !== storedCode) {
            return res.status(400).json({ message: "Código inválido" });
        }

        const emailInUse = await patientsModel.findOne({ email: newEmail, _id: { $ne: req.user.id } });
        if (emailInUse) {
            return res.status(400).json({ message: "Ya existe un paciente registrado con ese correo" });
        }

        const updatedPatient = await patientsModel
            .findByIdAndUpdate(req.user.id, { $set: { email: newEmail, is_verified: true } }, { new: true })
            .select("-password");

        res.clearCookie("patientEmailChangeCookie", { httpOnly: true, secure: true, sameSite: "none" });

        return res.status(200).json({ message: "Correo actualizado y verificado", user: updatedPatient });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// PUT /api/patientAccount/me/blood-type.
// Va aparte de updateMe porque este solo acepta campos del documento
// raíz, y el tipo de sangre vive dentro de clinical_history. Se usa
// notación de punto para tocar únicamente esa casilla y no pisar
// signos vitales, antecedentes ni procedimientos.
patientSelfController.updateBloodType = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { blood_type, blood_type_date } = req.body;

        // Lista cerrada: sin esto se puede guardar cualquier texto en
        // un dato que se usa en emergencias médicas.
        if (!BLOOD_TYPES.includes(blood_type)) {
            return res.status(400).json({ message: "Tipo de sangre no válido" });
        }

        let registeredAt = new Date();
        if (blood_type_date) {
            const parsed = new Date(blood_type_date);
            if (Number.isNaN(parsed.getTime())) {
                return res.status(400).json({ message: "Fecha de registro no válida" });
            }
            if (parsed > new Date()) {
                return res.status(400).json({ message: "La fecha de registro no puede ser futura" });
            }
            registeredAt = parsed;
        }

        const updatedPatient = await patientsModel
            .findByIdAndUpdate(
                req.user.id,
                {
                    $set: {
                        "clinical_history.blood_type": blood_type,
                        // Campo aparte en vez de convertir blood_type
                        // en objeto: el panel administrativo ya lo lee
                        // como string y se rompería.
                        "clinical_history.blood_type_date": registeredAt,
                        // Autoreportado por el paciente, no confirmado por personal clínico
                        // (ver blood_type_verified en el modelo). Si ya estaba verificado por
                        // un doctor/enfermera y el paciente lo vuelve a editar, se marca de
                        // nuevo como no verificado: el valor cambió y ya no es el que el
                        // personal clínico confirmó.
                        "clinical_history.blood_type_verified": false,
                    },
                },
                { new: true }
            )
            .select("-password");

        if (!updatedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        return res.status(200).json({ message: "Tipo de sangre guardado", user: updatedPatient });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// PUT /api/patientAccount/me/lifestyle, antecedentes no patológicos
// y ecológico-sociales.
// Son los dos campos de texto libre de clinical_history, se guardan
// juntos porque la app los edita en la misma pantalla.
patientSelfController.updateLifestyle = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { non_pathological, ecologycal_social } = req.body;

        const fieldsToSet = {};
        // Se acepta la cadena vacía a propósito: es como el paciente
        // borra lo que escribió.
        if (non_pathological !== undefined) {
            fieldsToSet["clinical_history.non_pathological"] = String(non_pathological).trim();
        }
        if (ecologycal_social !== undefined) {
            fieldsToSet["clinical_history.ecologycal_social"] = String(ecologycal_social).trim();
        }

        if (Object.keys(fieldsToSet).length === 0) {
            return res.status(400).json({ message: "No data provided to update" });
        }

        const updatedPatient = await patientsModel
            .findByIdAndUpdate(req.user.id, { $set: fieldsToSet }, { new: true })
            .select("-password");

        if (!updatedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        return res.status(200).json({ message: "Información guardada", user: updatedPatient });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// POST /api/patientAccount/me/hereditary, agrega un antecedente familiar.
// Usa $push y no $set: es una lista que se acumula, sobrescribirla
// borraría los anteriores.
patientSelfController.addHereditary = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { relationship, condition, type } = req.body;

        if (!relationship?.trim()) {
            return res.status(400).json({ message: "Indica el parentesco" });
        }
        if (!condition?.trim()) {
            return res.status(400).json({ message: "Indica la condición o enfermedad" });
        }

        const updatedPatient = await patientsModel
            .findByIdAndUpdate(
                req.user.id,
                {
                    $push: {
                        "clinical_history.hereditary": {
                            relationship: relationship.trim(),
                            condition: condition.trim(),
                            type: type?.trim() || undefined,
                        },
                    },
                },
                { new: true }
            )
            .select("-password");

        if (!updatedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        return res.status(201).json({ message: "Antecedente familiar agregado", user: updatedPatient });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// DELETE /api/patientAccount/me/hereditary/:entryId.
patientSelfController.deleteHereditary = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const patient = await patientsModel.findById(req.user.id);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const entry = patient.clinical_history?.hereditary?.id(req.params.entryId);
        if (!entry) {
            return res.status(404).json({ message: "Antecedente no encontrado" });
        }

        patient.clinical_history.hereditary.pull(req.params.entryId);
        await patient.save();

        return res.status(200).json({ message: "Antecedente eliminado" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// PUT /api/patientAccount/me/hereditary/:entryId, edita un antecedente
// familiar ya registrado. type solo se toca si viene en el body: el portal
// del paciente no lo edita y no debe borrar lo que haya puesto el personal.
patientSelfController.updateHereditary = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { relationship, condition, type } = req.body;
        if (!relationship?.trim()) {
            return res.status(400).json({ message: "Indica el parentesco" });
        }
        if (!condition?.trim()) {
            return res.status(400).json({ message: "Indica la condición o enfermedad" });
        }

        const patient = await patientsModel.findById(req.user.id);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const entry = patient.clinical_history?.hereditary?.id(req.params.entryId);
        if (!entry) {
            return res.status(404).json({ message: "Antecedente no encontrado" });
        }

        entry.relationship = relationship.trim();
        entry.condition = condition.trim();
        if (type !== undefined) {
            entry.type = type?.trim() || undefined;
        }
        await patient.save();

        const updatedPatient = await patientsModel.findById(req.user.id).select("-password");
        return res.status(200).json({ message: "Antecedente actualizado", user: updatedPatient });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// POST /api/patientAccount/me/pathological, agrega una enfermedad
// crónica o diagnóstico.
patientSelfController.addPathological = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { disease, diagnosis, type } = req.body;

        if (!disease?.trim()) {
            return res.status(400).json({ message: "Indica la enfermedad" });
        }

        // El diagnóstico es texto libre corto (ej. "Confirmado en 2019"), no
        // una fecha: se guarda tal cual como string.
        const diagnosisText = diagnosis?.trim() || undefined;
        if (diagnosisText && diagnosisText.length > MAX_DIAGNOSIS_LENGTH) {
            return res.status(400).json({ message: `El diagnóstico admite máximo ${MAX_DIAGNOSIS_LENGTH} caracteres` });
        }

        const updatedPatient = await patientsModel
            .findByIdAndUpdate(
                req.user.id,
                {
                    $push: {
                        "clinical_history.pathological": {
                            disease: disease.trim(),
                            diagnosis: diagnosisText,
                            type: type?.trim() || undefined,
                        },
                    },
                },
                { new: true }
            )
            .select("-password");

        if (!updatedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        return res.status(201).json({ message: "Enfermedad agregada", user: updatedPatient });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// DELETE /api/patientAccount/me/pathological/:entryId.
patientSelfController.deletePathological = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const patient = await patientsModel.findById(req.user.id);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const entry = patient.clinical_history?.pathological?.id(req.params.entryId);
        if (!entry) {
            return res.status(404).json({ message: "Enfermedad no encontrada" });
        }

        patient.clinical_history.pathological.pull(req.params.entryId);
        await patient.save();

        return res.status(200).json({ message: "Enfermedad eliminada" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// PUT /api/patientAccount/me/pathological/:entryId, edita una enfermedad
// crónica ya registrada. diagnosis es texto libre corto (no una fecha).
patientSelfController.updatePathological = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { disease, diagnosis, type } = req.body;
        if (!disease?.trim()) {
            return res.status(400).json({ message: "Indica la enfermedad" });
        }

        const diagnosisText = diagnosis?.trim() || undefined;
        if (diagnosisText && diagnosisText.length > MAX_DIAGNOSIS_LENGTH) {
            return res.status(400).json({ message: `El diagnóstico admite máximo ${MAX_DIAGNOSIS_LENGTH} caracteres` });
        }

        const patient = await patientsModel.findById(req.user.id);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const entry = patient.clinical_history?.pathological?.id(req.params.entryId);
        if (!entry) {
            return res.status(404).json({ message: "Enfermedad no encontrada" });
        }

        entry.disease = disease.trim();
        entry.diagnosis = diagnosisText;
        if (type !== undefined) {
            entry.type = type?.trim() || undefined;
        }
        await patient.save();

        const updatedPatient = await patientsModel.findById(req.user.id).select("-password");
        return res.status(200).json({ message: "Enfermedad actualizada", user: updatedPatient });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/patientAccount/consultations, requiere sesión, historial
// de mis consultas del paciente autenticado.
// A diferencia de /api/consultations (uso del personal, filtra por
// :patient_id y exige permiso calendar.consultations), aquí no hay
// parámetro de paciente ni matriz de permisos: la identidad sale del
// token (igual que getMe y updateMe) y arma en un solo viaje lo que
// la tarjeta de la app necesita: cada cita del paciente, cruzada con
// su consulta (si ya fue atendida), su prescripción y si generó una
// incapacidad. Mismo cruce de datos que
// usePatientRecordDetail.buildExtra hace en la web, adaptado a un
// solo endpoint self-service.
patientSelfController.getMyConsultations = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const patientId = req.user.id;

        // Mismas transiciones perezosas que corren al leer las citas (no se presentó,
        // por reagendar): así el dashboard de la app móvil las refleja aunque el paciente
        // abra la app directo en esa pantalla.
        await runAppointmentAutoTransitions();

        const [appointments, consultations, sickLeaves] = await Promise.all([
            appointmentsModel
                .find({ patient_id: patientId })
                .populate("doctor_id", "name last_name specialty img_url")
                .populate("procedure_id", "name requires_doctor estimated_duration price")
                .sort({ date: -1, start_time: -1 }),
            consultationsModel.find({ patient_id: patientId }).select("appointment_id clinical_data referral"),
            sickLeavesModel.find({ patient_id: patientId }).select("consultation_id"),
        ]);

        const consultationIds = consultations.map((c) => c._id);
        const prescriptions = await prescriptionsModel
            .find({ consultation_id: { $in: consultationIds } })
            .select("consultation_id medications");

        const prescriptionByConsultationId = new Map(
            prescriptions.map((p) => [String(p.consultation_id), p])
        );
        const consultationByAppointmentId = new Map(
            consultations.filter((c) => c.appointment_id).map((c) => [String(c.appointment_id), c])
        );
        const sickLeaveConsultationIds = new Set(
            sickLeaves.filter((s) => s.consultation_id).map((s) => String(s.consultation_id))
        );

        const data = appointments.map((appointment) => {
            const consultation = consultationByAppointmentId.get(String(appointment._id)) || null;
            const prescription = consultation ? prescriptionByConsultationId.get(String(consultation._id)) : null;

            return {
                appointment_id: appointment._id,
                consultation_id: consultation?._id || null,
                date: appointment.date,
                start_time: appointment.start_time,
                end_time: appointment.end_time,
                type: appointment.type,
                status: appointment.status,
                reschedule_reason: appointment.reschedule_reason || null,
                procedure: appointment.procedure_id
                    ? {
                        _id: appointment.procedure_id._id,
                        name: appointment.procedure_id.name,
                        requires_doctor: appointment.procedure_id.requires_doctor,
                        estimated_duration: appointment.procedure_id.estimated_duration,
                        price: appointment.procedure_id.price,
                    }
                    : null,
                doctor_id_raw: appointment.doctor_id?._id || null,
                doctor: appointment.doctor_id
                    ? {
                        name: appointment.doctor_id.name,
                        last_name: appointment.doctor_id.last_name,
                        specialty: appointment.doctor_id.specialty || null,
                        img_url: appointment.doctor_id.img_url || null,
                    }
                    : null,
                diagnosis:
                    consultation?.clinical_data?.diagnosis_description ||
                    consultation?.clinical_data?.diagnosis ||
                    null,
                badges: {
                    prescription: Boolean(prescription?.medications?.length),
                    referral: Boolean(consultation?.referral?.reason),
                    sickLeave: Boolean(consultation && sickLeaveConsultationIds.has(String(consultation._id))),
                },
            };
        });

        return res.status(200).json(data);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/patientAccount/consultations/:consultationId, requiere sesión.
// Detalle completo de UNA consulta propia (a diferencia de getMyConsultations,
// que solo arma un resumen por tarjeta). El filtro patient_id: req.user.id evita
// que un paciente pueda leer la consulta de otro cambiando el id en la URL.
patientSelfController.getMyConsultationById = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const consultation = await consultationsModel
            .findOne({ _id: req.params.consultationId, patient_id: req.user.id })
            .populate({
                path: "appointment_id",
                // model: "procedure" a mano porque el ref del schema de Appointments dice
                // "Procedure" (con mayúscula) pero el modelo real está registrado como
                // "procedure" (minúscula) — sin esto, populate tira MissingSchemaError,
                // mismo mismatch que ya resuelve así patientPortalController.getMyAppointments.
                populate: [
                    { path: "doctor_id", select: "name last_name specialty img_url" },
                    { path: "procedure_id", model: "procedure", select: "name" },
                ],
            });

        if (!consultation) {
            return res.status(404).json({ message: "Consulta no encontrada." });
        }

        const [prescription, sickLeave] = await Promise.all([
            prescriptionsModel.findOne({ consultations_id: consultation._id }),
            sickLeavesModel.findOne({ consultation_id: consultation._id }),
        ]);

        // No se usa populate para procedure.procedure_id: el modelo de
        // procedimientos está registrado como "procedure" (ver
        // proceduresModel), pero el schema de Consultations lo referencia
        // como "Procedures" — populate tira MissingSchemaError con ese
        // mismatch, así que se resuelven los nombres a mano, igual que ya
        // hace consultationController.buildClinicalHistoryUpdate.
        const procedureIds = (consultation.procedure || [])
            .map((p) => p.procedure_id)
            .filter(Boolean);
        const procedureDocs = procedureIds.length
            ? await proceduresModel.find({ _id: { $in: procedureIds } }).select("name").lean()
            : [];
        const procedureNameById = new Map(procedureDocs.map((p) => [String(p._id), p.name]));

        const consultationObject = consultation.toObject();
        consultationObject.procedure = (consultationObject.procedure || []).map((p) => ({
            ...p,
            procedure_name: p.procedure_id ? procedureNameById.get(String(p.procedure_id)) || null : null,
        }));

        return res.status(200).json({
            ...consultationObject,
            prescription: prescription || null,
            sickLeave: sickLeave || null,
        });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// PUT /api/patientAccount/changePassword, requiere sesión.
// A diferencia del cambio de contraseña por recuperación (que
// verifica un código enviado al correo), aquí el paciente ya está
// autenticado y debe confirmar su contraseña actual para poder
// establecer una nueva.
patientSelfController.changePassword = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { oldPassword, newPassword, confirmNewPassword } = req.body;

        if (!oldPassword?.trim() || !newPassword?.trim() || !confirmNewPassword?.trim()) {
            return res.status(400).json({ message: "Todos los campos son requeridos" });
        }

        const patient = await patientsModel.findById(req.user.id);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const oldPasswordMatches = await bcryptjs.compare(oldPassword, patient.password);
        if (!oldPasswordMatches) {
            return res.status(400).json({ message: "La contraseña actual es incorrecta" });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: "Las contraseñas no coinciden" });
        }

        if (newPassword === oldPassword) {
            return res.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });
        }

        const passwordError = getPasswordError(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const passwordHashed = await bcryptjs.hash(newPassword, 10);
        await patientsModel.findByIdAndUpdate(req.user.id, { password: passwordHashed });

        return res.status(200).json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default patientSelfController;
