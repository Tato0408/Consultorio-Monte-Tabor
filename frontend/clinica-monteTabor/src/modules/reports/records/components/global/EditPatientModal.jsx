import { useState } from "react";
import { X, Loader2, UserPen } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";
import { maskLettersOnly, isValidCalendarDate } from "@/lib/inputMasks";

// Máscaras de teléfono/DUI: mismo criterio ya usado en Doctors/Nurses/Receptionist/Patients Form
// (solo dígitos, formato fijo con guión).
const maskPhone = (raw) => {
  let digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
};
const maskDui = (raw) => {
  let digits = raw.replace(/\D/g, "").slice(0, 9);
  return digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
};
// Solo letras (con acentos/ñ), espacios, apóstrofes y guiones — igual que el resto de los
// formularios de personas del sistema (Doctors/Nurses/Receptionist/Patients Form).
const maskName = (raw) => maskLettersOnly(raw, 50);

const TODAY_STR = new Date().toISOString().split("T")[0];
const MIN_BIRTH_YEAR = 1900;

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// Modal compacto para editar los datos personales del paciente — abierto desde el lápiz
// "Editar expediente" del encabezado (RecordsLayout.jsx). PUT /patients/:id ya acepta todos
// estos campos, no hizo falta backend nuevo.
const EditPatientModal = ({ isOpen, onClose, patient, onSaved }) => {
  const toInputDate = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");
  const [form, setForm] = useState({
    name: patient?.nombre || "",
    last_name: patient?.apellido || "",
    dui: patient?.dui || "",
    phone: patient?.telefono || "",
    email: patient?.email || "",
    birth_date: toInputDate(patient?.birthDate),
    gender: patient?.sexo || "",
    // patient.tipoSangre cae en "—" cuando no está definido (ver useRecords.js) — no es una
    // opción válida del <select>, así que se trata como vacío.
    blood_type: BLOOD_TYPES.includes(patient?.tipoSangre) ? patient.tipoSangre : "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const close = () => { if (!loading) onClose(); };

  // La fecha de nacimiento es el input que reportaste que dejaba escribir más de 4 dígitos de
  // año — se corta aquí mismo, en el onChange, antes de que ese valor roto llegue a entrar al
  // estado del formulario (además de min/max en el propio <input>, que el navegador no siempre
  // hace cumplir mientras se escribe).
  const handleBirthDateChange = (e) => {
    const val = e.target.value;
    if (val && val.length !== 10) return; // "YYYY-MM-DD" tiene que medir exactamente 10
    if (val) {
      const year = Number(val.slice(0, 4));
      // isValidCalendarDate rechaza días de calendario inexistentes (ej. 30 de febrero), que el
      // chequeo de longitud/rango de año por sí solo no detecta.
      if (year < MIN_BIRTH_YEAR || val > TODAY_STR || !isValidCalendarDate(val)) return;
    }
    set("birth_date", val);
  };

  const handleSave = async () => {
    if (loading) return;

    const nextErrors = {};
    const name = form.name.trim();
    const lastName = form.last_name.trim();
    if (name && (name.length < 2 || name.length > 50)) {
      nextErrors.name = "Debe tener entre 2 y 50 caracteres";
    }
    if (lastName && (lastName.length < 2 || lastName.length > 50)) {
      nextErrors.last_name = "Debe tener entre 2 y 50 caracteres";
    }
    if (form.dui && !/^\d{8}-\d$/.test(form.dui)) {
      nextErrors.dui = "Formato incompleto, debe ser 00000000-0";
    }
    if (form.phone && !/^\d{4}-\d{4}$/.test(form.phone)) {
      nextErrors.phone = "Formato incompleto, debe ser 0000-0000";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Correo electrónico inválido";
    }
    if (form.birth_date) {
      const year = Number(form.birth_date.slice(0, 4));
      if (
        form.birth_date.length !== 10 ||
        year < MIN_BIRTH_YEAR ||
        form.birth_date > TODAY_STR ||
        !isValidCalendarDate(form.birth_date)
      ) {
        nextErrors.birth_date = `Debe ser una fecha real entre ${MIN_BIRTH_YEAR} y hoy`;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await apiClient(`/patients/${patient.id}`, {
        method: "PUT",
        body: { ...form, name, last_name: lastName },
      });
      showSuccess("Datos del paciente actualizados correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "No se pudieron actualizar los datos del paciente");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
      hasError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-blue-500"
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserPen className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Editar datos del paciente</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Nombres</label>
              <input type="text" maxLength={50} value={form.name} onChange={(e) => set("name", maskName(e.target.value))} className={inputClass(errors.name)} />
              <div className="flex items-start justify-between gap-2">
                {errors.name && <p className="text-[11px] text-red-500">{errors.name}</p>}
                <span className="text-[11px] text-slate-400 ml-auto">{form.name.length}/50</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Apellidos</label>
              <input type="text" maxLength={50} value={form.last_name} onChange={(e) => set("last_name", maskName(e.target.value))} className={inputClass(errors.last_name)} />
              <div className="flex items-start justify-between gap-2">
                {errors.last_name && <p className="text-[11px] text-red-500">{errors.last_name}</p>}
                <span className="text-[11px] text-slate-400 ml-auto">{form.last_name.length}/50</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">DUI</label>
              <input type="text" inputMode="numeric" placeholder="00000000-0" maxLength={10} value={form.dui} onChange={(e) => set("dui", maskDui(e.target.value))} className={inputClass(errors.dui)} />
              <div className="flex items-start justify-between gap-2">
                {errors.dui && <p className="text-[11px] text-red-500">{errors.dui}</p>}
                <span className="text-[11px] text-slate-400 ml-auto">{form.dui.length}/10</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Teléfono</label>
              <input type="text" inputMode="numeric" placeholder="0000-0000" maxLength={9} value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} className={inputClass(errors.phone)} />
              <div className="flex items-start justify-between gap-2">
                {errors.phone && <p className="text-[11px] text-red-500">{errors.phone}</p>}
                <span className="text-[11px] text-slate-400 ml-auto">{form.phone.length}/9</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-slate-500">Correo electrónico</label>
              <input type="email" maxLength={100} value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass(errors.email)} />
              {errors.email && <p className="text-[11px] text-red-500">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Fecha de nacimiento</label>
              <input
                type="date"
                min={`${MIN_BIRTH_YEAR}-01-01`}
                max={TODAY_STR}
                value={form.birth_date}
                onChange={handleBirthDateChange}
                className={inputClass(errors.birth_date)}
              />
              {errors.birth_date && <p className="text-[11px] text-red-500">{errors.birth_date}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Género</label>
              <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputClass(false)}>
                <option value="">Selecciona</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            {/* Dropdown en vez de la grilla de círculos de BloodTypeModal.jsx (la de la interfaz
                de Consultas): aquí ya hay varios otros campos en el mismo modal chico, así que se
                mantiene como una fila más de una sola línea para no hacerlo más alto. */}
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-slate-500">Tipo de sangre</label>
              <select value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} className={inputClass(false)}>
                <option value="">Selecciona</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default EditPatientModal;
