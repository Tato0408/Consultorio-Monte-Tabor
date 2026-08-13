import { useState, forwardRef } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";
import { maskLettersOnly, isValidCalendarDate } from "@/lib/inputMasks";

const EMPTY = { name: "", last_name: "", dui: "", birth_date: "", gender: "Masculino", phone: "", email: "", password: "", referred_by: "" };

// Un paciente no puede haber nacido en el futuro.
const TODAY_STR = new Date().toISOString().split("T")[0];

const maskPhone = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 8);
    return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
};
const maskDui = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 9);
    return digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
};

// "Registro de pacientes": versión condensada de PatientFormModal.jsx para el dashboard de
// recepción — mismos campos y mismo endpoint (createPatient de usePatients.js), solo que
// embebido inline en vez de un modal aparte.
const QuickPatientForm = forwardRef(({ createPatient, onCreated }, ref) => {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const set = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };
    // Igual que "set" pero pasando el valor por una máscara (letras, teléfono, DUI) antes de
    // guardarlo — el resto de los formularios de personas del sistema hacen exactamente esto.
    const setMasked = (field, maskFn) => (e) => {
        setForm((f) => ({ ...f, [field]: maskFn(e.target.value) }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Requerido";
        if (!form.last_name.trim()) e.last_name = "Requerido";
        if (!form.dui.trim()) e.dui = "Requerido";
        else if (!/^\d{8}-\d$/.test(form.dui)) e.dui = "Formato: 00000000-0";
        if (!form.birth_date) e.birth_date = "Requerido";
        else if (!isValidCalendarDate(form.birth_date) || form.birth_date > TODAY_STR) e.birth_date = "Fecha inválida";
        if (!form.phone.trim()) e.phone = "Requerido";
        else if (!/^\d{4}-\d{4}$/.test(form.phone)) e.phone = "Formato: 0000-0000";
        if (!form.email.trim()) e.email = "Requerido";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Correo inválido";
        if (!form.password) e.password = "Requerido";
        else if (form.password.length < 8) e.password = "Mínimo 8 caracteres";
        return e;
    };

    const clear = () => { setForm(EMPTY); setErrors({}); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setSubmitting(true);
        const result = await createPatient({
            name: form.name.trim(),
            last_name: form.last_name.trim(),
            dui: form.dui,
            birth_date: form.birth_date,
            gender: form.gender,
            phone: form.phone,
            email: form.email.trim(),
            password: form.password,
            referred_by: form.referred_by.trim() || undefined,
        });
        setSubmitting(false);

        if (result.success) {
            showSuccess("Paciente registrado correctamente.");
            clear();
            onCreated?.();
        } else {
            showError(result.error || "No se pudo registrar el paciente.");
        }
    };

    const inputClass = (hasError) =>
        `w-full px-3 py-2 text-xs border rounded-lg focus:outline-none transition-colors ${
            hasError ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-400"
        }`;

    return (
        <div ref={ref} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Registro de pacientes</h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <fieldset disabled={submitting} className="contents">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Nombre(s)</label>
                        <input value={form.name} maxLength={50} onChange={setMasked("name", (v) => maskLettersOnly(v, 50))} placeholder="Nombre(s)" className={inputClass(errors.name)} />
                        <div className="flex items-start justify-between gap-2">
                            {errors.name && <span className="text-[10px] text-red-500">{errors.name}</span>}
                            <span className="text-[10px] text-slate-400 ml-auto">{form.name.length}/50</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Correo electrónico</label>
                        <input type="email" value={form.email} maxLength={100} onChange={set("email")} placeholder="correo@ejemplo.com" className={inputClass(errors.email)} />
                        {errors.email && <span className="text-[10px] text-red-500">{errors.email}</span>}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Apellido(s)</label>
                        <input value={form.last_name} maxLength={50} onChange={setMasked("last_name", (v) => maskLettersOnly(v, 50))} placeholder="Apellido(s)" className={inputClass(errors.last_name)} />
                        <div className="flex items-start justify-between gap-2">
                            {errors.last_name && <span className="text-[10px] text-red-500">{errors.last_name}</span>}
                            <span className="text-[10px] text-slate-400 ml-auto">{form.last_name.length}/50</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">DUI</label>
                        <input value={form.dui} inputMode="numeric" maxLength={10} onChange={setMasked("dui", maskDui)} placeholder="12345678-9" className={inputClass(errors.dui)} />
                        <div className="flex items-start justify-between gap-2">
                            {errors.dui && <span className="text-[10px] text-red-500">{errors.dui}</span>}
                            <span className="text-[10px] text-slate-400 ml-auto">{form.dui.length}/10</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Fecha de nacimiento</label>
                        <input type="date" max={TODAY_STR} value={form.birth_date} onChange={set("birth_date")} className={inputClass(errors.birth_date)} />
                        {errors.birth_date && <span className="text-[10px] text-red-500">{errors.birth_date}</span>}
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Teléfono</label>
                        <input value={form.phone} inputMode="numeric" maxLength={9} onChange={setMasked("phone", maskPhone)} placeholder="7890-1234" className={inputClass(errors.phone)} />
                        <div className="flex items-start justify-between gap-2">
                            {errors.phone && <span className="text-[10px] text-red-500">{errors.phone}</span>}
                            <span className="text-[10px] text-slate-400 ml-auto">{form.phone.length}/9</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Género</label>
                        <select value={form.gender} onChange={set("gender")} className={inputClass(false)}>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={form.password}
                                maxLength={100}
                                onChange={set("password")}
                                placeholder="Contraseña inicial"
                                className={`${inputClass(errors.password)} pr-8`}
                            />
                            <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {errors.password && <span className="text-[10px] text-red-500">{errors.password}</span>}
                    </div>

                    <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Notas (opcional)</label>
                        <input value={form.referred_by} maxLength={150} onChange={set("referred_by")} placeholder="Referido por, información adicional..." className={inputClass(false)} />
                        <div className="flex items-start justify-end gap-2">
                            <span className="text-[10px] text-slate-400">{form.referred_by.length}/150</span>
                        </div>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-end gap-2 mt-1">
                        <button type="button" onClick={clear} className="px-4 py-2 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                            Limpiar
                        </button>
                        <button type="submit" className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-60">
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Guardar paciente
                        </button>
                    </div>
                </fieldset>
            </form>
        </div>
    );
});

QuickPatientForm.displayName = "QuickPatientForm";

export default QuickPatientForm;
