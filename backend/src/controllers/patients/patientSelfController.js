import bcryptjs from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import patientsModel from "../../models/patients/patients.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js";
import sickLeavesModel from "../../models/sickLeaves/sickLeave.js";
import { config } from "../../../config.js";
import { validateUserFieldFormats, getMissingRequiredField, getPasswordError } from "../../utils/validators.js";

// Controller de autoservicio para pacientes: a diferencia de patientsController.js (usado por
// el panel administrativo, donde el staff gestiona CUALQUIER paciente por :id y con permisos de
// rol), este es el que consume la app móvil — cada paciente solo puede crear su propia cuenta,
// y ver/actualizar ÚNICAMENTE su propio perfil (identidad tomada del token, nunca de un :id).
const patientSelfController = {};

const REQUIRED_FIELDS = ["name", "last_name", "birth_date", "gender", "phone", "email", "password"];

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// Firma el mismo tipo de token que usa el login — registrarse funciona como un "login
// escondido": el paciente queda autenticado de inmediato, sin pasar por la pantalla de login.
const signPatientToken = (patient) =>
    jsonwebtoken.sign({ id: patient._id, userType: "patient" }, config.JWT.secret, { expiresIn: "15m" });

const toUserPayload = (patient) => ({
    id: patient._id,
    email: patient.email,
    name: patient.name,
    last_name: patient.last_name,
});

// Los cinco endpoints de historia clínica repiten este chequeo; se extrae para no copiarlo
const denyIfNotPatient = (req, res) => {
    if (req.user?.role !== "patient") {
        res.status(403).json({ message: "Acceso denegado" });
        return true;
    }
    return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/patientAccount/register — público, cualquiera puede registrarse
// ─────────────────────────────────────────────────────────────────────────────
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
        // El DUI es opcional (puede haber pacientes menores de edad sin DUI todavía) — una
        // cadena vacía cuenta como "no enviado", no como un valor a validar
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

        // Único dentro de la colección de pacientes — a propósito NO se usa findStaffDuplicate:
        // los pacientes pueden compartir correo/DUI con el staff, solo no entre ellos mismos
        // (el login de pacientes busca por correo con findOne, tiene que ser único ahí)
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

        await newPatient.save();

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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patientAccount/me — requiere sesión; devuelve SOLO el perfil de quien la pide
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/patientAccount/me — requiere sesión; actualiza SOLO el perfil de quien la pide.
// La contraseña queda fuera de este endpoint a propósito: tiene su propio endpoint dedicado
// (changePassword, más abajo) porque requiere confirmar la contraseña actual primero.
// ─────────────────────────────────────────────────────────────────────────────
patientSelfController.updateMe = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        let { name, last_name, dui, birth_date, gender, phone, email } = req.body;

        if (dui === "") dui = undefined;

        const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        const fieldsToSet = {};
        if (name !== undefined) fieldsToSet.name = String(name).trim();
        if (last_name !== undefined) fieldsToSet.last_name = String(last_name).trim();
        if (dui !== undefined) fieldsToSet.dui = String(dui).trim();
        if (birth_date !== undefined) fieldsToSet.birth_date = birth_date;
        if (gender !== undefined) fieldsToSet.gender = gender;
        if (phone !== undefined) fieldsToSet.phone = String(phone).trim();
        if (email !== undefined) fieldsToSet.email = String(email).trim();

        if (Object.keys(fieldsToSet).length === 0) {
            return res.status(400).json({ message: "No data provided to update" });
        }

        // Si cambia correo o DUI, valida que no choque con OTRO paciente (a sí mismo se excluye)
        if (fieldsToSet.email || fieldsToSet.dui) {
            const orConditions = [];
            if (fieldsToSet.email) orConditions.push({ email: fieldsToSet.email });
            if (fieldsToSet.dui) orConditions.push({ dui: fieldsToSet.dui });
            const collision = await patientsModel.findOne({
                _id: { $ne: req.user.id },
                $or: orConditions,
            });
            if (collision) {
                const field = collision.email === fieldsToSet.email ? "correo" : "DUI";
                return res.status(400).json({ message: `Ya existe un paciente registrado con ese ${field}` });
            }
        }

        const updatedPatient = await patientsModel
            .findByIdAndUpdate(req.user.id, { $set: fieldsToSet }, { new: true })
            .select("-password");

        if (!updatedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        return res.status(200).json({ message: "Perfil actualizado", user: updatedPatient });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/patientAccount/me/blood-type
// Va aparte de updateMe porque este solo acepta campos del documento raíz, y el tipo de
// sangre vive dentro de clinical_history. Se usa notación de punto para tocar únicamente
// esa casilla y no pisar signos vitales, antecedentes ni procedimientos.
// ─────────────────────────────────────────────────────────────────────────────
patientSelfController.updateBloodType = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { blood_type, blood_type_date } = req.body;

        // Lista cerrada: sin esto se puede guardar cualquier texto en un dato que se usa
        // en emergencias médicas
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
                        // Campo aparte en vez de convertir blood_type en objeto: el panel
                        // administrativo ya lo lee como string y se rompería
                        "clinical_history.blood_type_date": registeredAt,
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

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/patientAccount/me/lifestyle — antecedentes no patológicos y ecológico-sociales.
// Son los dos campos de texto libre de clinical_history; se guardan juntos porque la app
// los edita en la misma pantalla.
// ─────────────────────────────────────────────────────────────────────────────
patientSelfController.updateLifestyle = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { non_pathological, ecologycal_social } = req.body;

        const fieldsToSet = {};
        // Se acepta la cadena vacía a propósito: es como el paciente borra lo que escribió
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/patientAccount/me/hereditary — agrega un antecedente familiar.
// $push y no $set: es una lista que se acumula, sobrescribirla borraría los anteriores.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/patientAccount/me/hereditary/:entryId
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/patientAccount/me/pathological — agrega una enfermedad crónica o diagnóstico
// ─────────────────────────────────────────────────────────────────────────────
patientSelfController.addPathological = async (req, res) => {
    try {
        if (denyIfNotPatient(req, res)) return;

        const { disease, diagnosis, type } = req.body;

        if (!disease?.trim()) {
            return res.status(400).json({ message: "Indica la enfermedad" });
        }

        let diagnosisDate;
        if (diagnosis) {
            const parsed = new Date(diagnosis);
            if (Number.isNaN(parsed.getTime())) {
                return res.status(400).json({ message: "Fecha de diagnóstico no válida" });
            }
            if (parsed > new Date()) {
                return res.status(400).json({ message: "La fecha de diagnóstico no puede ser futura" });
            }
            diagnosisDate = parsed;
        }

        const updatedPatient = await patientsModel
            .findByIdAndUpdate(
                req.user.id,
                {
                    $push: {
                        "clinical_history.pathological": {
                            disease: disease.trim(),
                            diagnosis: diagnosisDate,
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/patientAccount/me/pathological/:entryId
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/patientAccount/changePassword — requiere sesión. A diferencia del cambio de
// contraseña por recuperación (que verifica un código enviado al correo), aquí el paciente ya
// está autenticado y debe confirmar su contraseña actual para poder establecer una nueva.
// ─────────────────────────────────────────────────────────────────────────────
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
