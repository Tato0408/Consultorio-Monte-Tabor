// Reglas de validación compartidas por los controllers de usuarios
// (doctores, recepcionistas, pacientes, enfermeras). Los regex son
// exactamente los mismos que usan las máscaras del frontend, para que
// backend y frontend nunca queden desincronizados.

import adminModel from "../models/admin/admins.js";
import doctorsModel from "../models/doctors/doctors.js";
import nursesModel from "../models/nurses/nurses.js";
import receptionistsModel from "../models/receptionist/receptionist.js";

const STAFF_ROLE_LABELS = {
    admin: "administrador",
    doctor: "doctor",
    nurse: "enfermera",
    receptionist: "recepcionista",
};

const STAFF_MODELS = [
    { roleKey: "admin", model: adminModel },
    { roleKey: "doctor", model: doctorsModel },
    { roleKey: "nurse", model: nursesModel },
    { roleKey: "receptionist", model: receptionistsModel },
];

// Busca si el correo o el DUI ya están en uso por cualquier rol de staff
// (admin, doctor, enfermera o recepcionista) al crear o editar un
// usuario. Los pacientes quedan fuera a propósito, sí pueden repetir
// correo o DUI con el staff. loginCommonRole depende de que el correo
// sea único entre estas 4 colecciones para saber a qué rol pertenece
// cada usuario al iniciar sesión, por eso existe esta validación.
// excludeId se pasa al editar, para que un usuario no choque contra su
// propio registro cuando no cambió el correo ni el DUI. Devuelve
// { message } listo para responder 400, o null si no hay colisión.
export const findStaffDuplicate = async (email, dui, excludeId) => {
    for (const { roleKey, model } of STAFF_MODELS) {
        const found = await model.findOne({
            $or: [{ email }, { dui }],
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        });
        if (found) {
            const field = found.email === email ? "correo" : "DUI";
            return {
                message: `Ya existe un ${STAFF_ROLE_LABELS[roleKey]} registrado con ese ${field}`,
            };
        }
    }
    return null;
};

// Escapa caracteres especiales de regex antes de usar un texto libre
// dentro de un $regex de Mongo (por ejemplo una búsqueda de nombre
// insensible a mayúsculas). Evita tanto errores de sintaxis (un nombre
// con paréntesis) como que el texto se interprete como patrón en vez de
// texto literal.
export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{4}-\d{4}$/;
export const DUI_REGEX = /^\d{8}-\d{1}$/;

// Edad mínima para el staff (doctores, recepcionistas, enfermeras,
// admin). Los pacientes quedan fuera de esta regla a propósito, la
// clínica sí atiende pacientes menores de edad.
export const MIN_STAFF_AGE = 18;

// Interpreta "YYYY-MM-DD" (o un ISO datetime, tomando solo la parte de
// fecha) como año, mes y día locales. new Date("YYYY-MM-DD") a secas se
// interpreta como medianoche UTC, y luego getMonth() y getDate() la leen
// en hora local. En zonas horarias detrás de UTC eso corre la fecha un
// día hacia atrás. Construir la fecha con el constructor (year, month,
// day) evita ese corrimiento.
const parseDateOnly = (value) => {
    const datePart = String(value).trim().split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
};

// Calcula la edad exacta a partir de una fecha de nacimiento, tomando en
// cuenta si ya pasó el cumpleaños de este año (no solo la diferencia de
// años).
const calculateAge = (birthDate, today) => {
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
    }
    return age;
};

// Devuelve un mensaje de error si la fecha de nacimiento corresponde a
// alguien menor de MIN_STAFF_AGE años, o null si la persona ya es mayor
// de edad. Fechas con formato inválido no se reportan aquí, eso ya lo
// cubre otro chequeo del caller.
export const getAdultAgeError = (birthDateStr) => {
    const birthDate = parseDateOnly(birthDateStr);
    if (!birthDate) {
        return null;
    }
    const age = calculateAge(birthDate, new Date());
    if (age < MIN_STAFF_AGE) {
        return `Debe ser mayor de edad (al menos ${MIN_STAFF_AGE} años) para registrarse`;
    }
    return null;
};

const FIELD_LABELS = {
    name: "Nombres",
    last_name: "Apellidos",
    phone: "Teléfono",
    email: "Correo electrónico",
    dui: "DUI",
    birth_date: "Fecha de nacimiento",
    gender: "Género",
    license_number: "Número de licencia",
    password: "Contraseña",
};

// Para endpoints de creación, confirma que cada campo de requiredKeys
// venga presente y no vacío. Devuelve el mensaje del primer campo
// faltante, o null si todos están completos.
export const getMissingRequiredField = (fields, requiredKeys) => {
    for (const key of requiredKeys) {
        const value = fields[key];
        if (value === undefined || value === null || !String(value).trim()) {
            return `El campo ${FIELD_LABELS[key] || key} no puede estar vacío`;
        }
    }
    return null;
};

// Valida el formato de los campos básicos que vengan presentes en el
// body (name, last_name, phone, email, dui, birth_date). No exige que
// existan, eso lo decide cada controller aparte con
// getMissingRequiredField en creación. En actualización simplemente se
// ignora lo que no venga, para no romper updates parciales (por ejemplo
// agregar solo un signo vital a un paciente).
export const validateUserFieldFormats = ({ name, last_name, phone, email, dui, birth_date }, { requireAdult = false } = {}) => {
    if (name !== undefined && !String(name).trim()) {
        return "El campo Nombres no puede estar vacío";
    }
    if (last_name !== undefined && !String(last_name).trim()) {
        return "El campo Apellidos no puede estar vacío";
    }
    if (phone !== undefined) {
        const value = String(phone).trim();
        if (!value) return "El campo Teléfono no puede estar vacío";
        if (!PHONE_REGEX.test(value)) return "Formato de teléfono inválido, debe ser XXXX-XXXX";
    }
    if (email !== undefined) {
        const value = String(email).trim();
        if (!value) return "El campo Correo electrónico no puede estar vacío";
        if (!EMAIL_REGEX.test(value)) return "Formato de correo electrónico inválido";
    }
    if (dui !== undefined) {
        const value = String(dui).trim();
        // El DUI no es obligatorio (hay pacientes menores de edad sin DUI): solo se valida
        // el formato cuando llega un valor no vacío. La obligatoriedad, donde aplica (staff),
        // la impone cada controller de creación con getMissingRequiredField.
        if (value && !DUI_REGEX.test(value)) return "Formato de DUI inválido, debe ser XXXXXXXX-X";
    }
    if (birth_date !== undefined) {
        const value = String(birth_date).trim();
        if (!value) return "El campo Fecha de nacimiento no puede estar vacío";
        if (requireAdult) {
            const ageError = getAdultAgeError(value);
            if (ageError) return ageError;
        }
    }
    return null;
};

// Valida la fortaleza de una contraseña nueva. Devuelve el mensaje del
// primer requisito incumplido, o null si la contraseña cumple todos los
// requisitos (misma regla que el checklist del frontend: al menos 8
// caracteres, mayúscula, minúscula, número y símbolo).
export const getPasswordError = (password) => {
    // 8 es el mínimo que exige el frontend en todos los formularios de
    // contraseña (doctor, enfermera, recepcionista, paciente), tanto en
    // registro como en recuperación y cambio desde el perfil.
    if (!password || password.length < 8) {
        return "La contraseña debe tener al menos 8 caracteres";
    }
    if (!/[A-Z]/.test(password)) {
        return "La contraseña debe contener al menos una letra mayúscula";
    }
    if (!/[a-z]/.test(password)) {
        return "La contraseña debe contener al menos una letra minúscula";
    }
    if (!/[0-9]/.test(password)) {
        return "La contraseña debe contener al menos un número";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return "La contraseña debe contener al menos un carácter especial";
    }
    return null;
};

// Mismo patrón que exige TriageCard.jsx (Consultas) y
// VitalSignsFormModal.jsx (Expediente) para la presión arterial: valor
// sistólico sobre diastólico, de 2 a 3 dígitos por lado.
const BLOOD_PRESSURE_PATTERN = /^\d{2,3}\/\d{2,3}$/;

// Mismos rangos fisiológicos razonables que usan esos dos formularios en
// el frontend. Se repiten aquí porque el backend nunca debe confiar en
// que el frontend ya validó, sobre todo en endpoints como este que
// también se pueden llamar directo (por ejemplo Swagger). El campo
// "height" llega en metros, no en centímetros, porque así lo manda el
// frontend después de convertir lo que el usuario digitó.
const VITAL_SIGNS_RANGES = {
    glucosa_mgdl: { min: 0, max: 999, label: "Glucosa" },
    weight: { min: 0, max: 500, label: "Peso" },
    height: { min: 0, max: 3, label: "Talla" },
    temperature: { min: 30, max: 45, label: "Temperatura" },
    spo2: { min: 0, max: 100, label: "Saturación de O2" },
};

// Valida una toma de signos vitales (blood_pressure, glucosa_mgdl,
// weight, height, temperature, spo2, mismas llaves que usa
// Patients.clinical_history.vital_signs). Cada campo es opcional (se
// puede guardar una toma parcial), pero si viene, tiene que tener
// formato y rango válidos. Devuelve el mensaje del primer problema
// encontrado, o null si todo está bien.
export const getVitalSignsError = (vitals = {}) => {
    const { blood_pressure } = vitals;
    if (blood_pressure !== undefined && blood_pressure !== null && blood_pressure !== "" && !BLOOD_PRESSURE_PATTERN.test(blood_pressure)) {
        return "Formato de presión arterial inválido, debe ser sistólica/diastólica (ej. 120/80)";
    }
    for (const [key, range] of Object.entries(VITAL_SIGNS_RANGES)) {
        const value = vitals[key];
        if (value === undefined || value === null || value === "") continue;
        const num = Number(value);
        if (Number.isNaN(num)) return `${range.label} debe ser un número`;
        if (num < range.min || num > range.max) return `${range.label} debe estar entre ${range.min} y ${range.max}`;
    }
    return null;
};

// Campos mínimos para poder guardar una consulta (ver
// ConsultationForm.jsx): síntomas y evolución, triage básico (presión
// arterial y temperatura) y diagnóstico completo (CIE-10, nombre y
// descripción). El resto de la consulta (examen físico, procedimientos,
// receta, referencia, antecedentes) queda opcional a propósito. Devuelve
// el mensaje del primer campo faltante, o null.
export const getRequiredConsultationFieldsError = (clinical_data = {}) => {
    const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

    if (isBlank(clinical_data.evolution)) {
        return "La evolución clínica (síntomas) es obligatoria";
    }
    if (isBlank(clinical_data.triage?.blood_pressure)) {
        return "La presión arterial del triage es obligatoria";
    }
    if (isBlank(clinical_data.triage?.temperature)) {
        return "La temperatura del triage es obligatoria";
    }
    if (isBlank(clinical_data.icd_diagnosis)) {
        return "El código CIE-10 del diagnóstico es obligatorio";
    }
    if (isBlank(clinical_data.diagnosis)) {
        return "El nombre del diagnóstico es obligatorio";
    }
    if (isBlank(clinical_data.diagnosis_description)) {
        return "La descripción del diagnóstico es obligatoria";
    }
    return null;
};

// Valida que un campo numérico (precio, stock, cantidad, duración,
// costo, entre otros) no sea negativo. El valor undefined, null o
// cadena vacía se considera "no enviado" y no es un error aquí, cada
// controller decide aparte si el campo es obligatorio. Mismo motivo que
// el resto de este archivo: el frontend ya bloquea el signo "-" al
// escribir, pero el backend nunca debe confiar solo en eso (por ejemplo
// una llamada directa por Swagger).
export const getNonNegativeError = (value, label) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    if (Number.isNaN(num)) return `${label} debe ser un número`;
    if (num < 0) return `${label} no puede ser negativo`;
    return null;
};
