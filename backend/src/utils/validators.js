// Reglas de validación compartidas por los controllers de usuarios (doctores, recepcionistas,
// pacientes, enfermeras). Los regex son EXACTAMENTE los mismos que usan las máscaras del
// frontend, para que backend y frontend nunca queden desincronizados.

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

// Busca si el correo o el DUI ya están en uso por CUALQUIER rol de staff (admin, doctor,
// enfermera o recepcionista) al crear un usuario nuevo. Pacientes queda fuera a propósito:
// sí puede repetir correo/DUI con el staff. loginCommonRole depende de que el correo sea único
// entre estas 4 colecciones para saber a qué rol pertenece cada usuario al iniciar sesión —
// por eso esta validación existe. Devuelve { message } listo para responder 400, o null si
// no hay colisión.
export const findStaffDuplicate = async (email, dui) => {
    for (const { roleKey, model } of STAFF_MODELS) {
        const found = await model.findOne({ $or: [{ email }, { dui }] });
        if (found) {
            const field = found.email === email ? "correo" : "DUI";
            return {
                message: `Ya existe un ${STAFF_ROLE_LABELS[roleKey]} registrado con ese ${field}`,
            };
        }
    }
    return null;
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{4}-\d{4}$/;
export const DUI_REGEX = /^\d{8}-\d{1}$/;

// Edad mínima para el staff (doctores, recepcionistas, enfermeras, admin). Los pacientes quedan
// fuera de esta regla a propósito: la clínica sí atiende pacientes menores de edad.
export const MIN_STAFF_AGE = 18;

// Interpreta "YYYY-MM-DD" (o un ISO datetime, tomando solo la parte de fecha) como año/mes/día
// LOCALES. new Date("YYYY-MM-DD") a secas se interpreta como medianoche UTC, y luego
// getMonth()/getDate() la leen en hora local — en zonas horarias detrás de UTC eso la corre un
// día hacia atrás. Construir la fecha con el constructor (year, month, day) evita ese corrimiento.
const parseDateOnly = (value) => {
    const datePart = String(value).trim().split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
};

// Calcula la edad exacta a partir de una fecha de nacimiento, tomando en cuenta si ya pasó el
// cumpleaños de este año (no solo la diferencia de años).
const calculateAge = (birthDate, today) => {
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
    }
    return age;
};

// Devuelve un mensaje de error si la fecha de nacimiento corresponde a alguien menor de
// MIN_STAFF_AGE años, o null si la persona ya es mayor de edad. Fechas con formato inválido no
// se reportan aquí (eso ya lo cubre otro chequeo del caller).
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

// Para endpoints de creación: confirma que cada campo de requiredKeys venga presente y no vacío.
// Devuelve el mensaje del primer campo faltante, o null si todos están completos.
export const getMissingRequiredField = (fields, requiredKeys) => {
    for (const key of requiredKeys) {
        const value = fields[key];
        if (value === undefined || value === null || !String(value).trim()) {
            return `El campo ${FIELD_LABELS[key] || key} no puede estar vacío`;
        }
    }
    return null;
};

// Valida formato de los campos básicos que vengan presentes en el body (name/last_name/phone/
// email/dui/birth_date). No exige que existan — eso lo decide cada controller aparte con
// getMissingRequiredField en creación; en actualización simplemente se ignora lo que no venga,
// para no romper updates parciales (ej. solo agregar un signo vital a un paciente).
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
        if (!value) return "El campo DUI no puede estar vacío";
        if (!DUI_REGEX.test(value)) return "Formato de DUI inválido, debe ser XXXXXXXX-X";
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

// Valida la fortaleza de una contraseña nueva. Devuelve el mensaje del primer requisito
// incumplido, o null si la contraseña cumple todos los requisitos (misma regla que el
// checklist del frontend: más de 8 caracteres, mayúscula, minúscula, número y símbolo).
export const getPasswordError = (password) => {
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
