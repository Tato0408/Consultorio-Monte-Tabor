import { useState, useEffect } from "react";
import { X, Loader2, UserPen, PenLine } from "lucide-react";
import { maskLettersOnly } from "@/lib/inputMasks";
import { getMaxAdultBirthDate, validateAdultBirthDate } from "@/lib/validators";
import useProfile from "../hooks/useProfile";
import SignatureSealModal from "./SignatureSealModal";

// Firma y sello: solo doctor y admin los pueden guardar (el admin también puede actuar como
// "doctor espejo" para agendarse citas, ver is_admin_mirror en el modelo Doctors). Enfermería
// y recepción nunca ven este botón.
const CAN_SIGN_ROLES = ["doctor", "admin"];

const maskDui = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    return digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
};
const maskPhone = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
};

// Campos que cada rol puede autoeditar aquí. Mismo criterio que sus
// respectivos endpoints de autoservicio
// (doctorsController.updateOwnProfile, nursesController.updateOwnProfile,
// receptionistController.updateOwnProfile, adminController.updateAdmin).
// Ninguno acepta correo ni contraseña por esta vía: el correo del
// admin dispara un flujo de verificación aparte (código al nuevo
// correo), y la contraseña ya tiene su propio botón de modificar
// contraseña, por lo que no tiene sentido mezclar esos dos flujos con
// una edición rápida de datos personales.
const ROLE_FIELDS = {
    doctor:       ["name", "last_name", "dui", "birth_date", "phone"],
    nurse:        ["name", "last_name", "dui", "birth_date", "phone"],
    receptionist: ["name", "last_name", "dui", "birth_date", "phone"],
    admin:        ["name", "last_name", "dui", "birth_date", "gender"],
};

const EditProfileModal = ({ isOpen, onClose, user, userType, onSave }) => {
    const fields = ROLE_FIELDS[userType] || [];
    const [form, setForm] = useState({});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const canSign = CAN_SIGN_ROLES.includes(userType);
    const {
        submitting: signatureSubmitting,
        saveSignatureFile,
        saveSignatureDrawn,
        removeSignature,
        saveSeal,
        removeSeal,
    } = useProfile();

    // El componente se queda montado entre aperturas, ya que el padre
    // solo cambia isOpen. Sin este efecto, el formulario conservaría
    // lo último escrito en vez de partir de los datos actuales del
    // usuario cada vez que se abre.
    useEffect(() => {
        if (!isOpen) return;
        setForm({
            name: user?.name || "",
            last_name: user?.last_name || "",
            dui: user?.dui || "",
            birth_date: user?.birth_date ? user.birth_date.split("T")[0] : "",
            phone: user?.phone || "",
            gender: user?.gender || "Masculino",
        });
        setErrors({});
    }, [isOpen, user]);

    if (!isOpen) return null;

    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const close = () => { if (!submitting) onClose(); };

    // El género no se valida como requerido, ya que es un select que
    // siempre trae un valor por defecto.
    const validate = () => {
        const e = {};
        fields.forEach((f) => {
            if (f === "gender") return;
            const value = (form[f] || "").toString().trim();
            if (!value) { e[f] = "Requerido"; return; }
            if ((f === "name" || f === "last_name") && value.length < 2) e[f] = "Debe tener al menos 2 caracteres";
            if (f === "dui" && !/^\d{8}-\d$/.test(value)) e.dui = "Formato: 00000000-0";
            if (f === "phone" && !/^\d{4}-\d{4}$/.test(value)) e.phone = "Formato: 0000-0000";
            if (f === "birth_date") {
                const adultCheck = validateAdultBirthDate(value);
                if (adultCheck !== true) e.birth_date = adultCheck;
            }
        });
        return e;
    };

    const handleSubmit = async () => {
        if (submitting) return;
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }

        setSubmitting(true);
        try {
            const payload = {};
            fields.forEach((f) => { payload[f] = form[f]; });
            const success = await onSave(payload);
            if (success) close();
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = (hasError) =>
        `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none transition-colors ${
            hasError ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
        }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">

                <button
                    onClick={close}
                    disabled={submitting}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
                        <UserPen className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Editar mi información</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4 ml-[52px]">Actualiza tus datos personales.</p>

                {canSign && (
                    <button
                        type="button"
                        onClick={() => setIsSignatureModalOpen(true)}
                        disabled={submitting}
                        className="flex items-center gap-2 mb-6 ml-[52px] px-3.5 py-2 border border-blue-200 text-blue-600 text-xs font-semibold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                        <PenLine className="w-3.5 h-3.5" />
                        Firma y sello
                    </button>
                )}

                <fieldset disabled={submitting} className="flex flex-col gap-4">
                    {(fields.includes("name") || fields.includes("last_name")) && (
                        <div className="grid grid-cols-2 gap-4">
                            {fields.includes("name") && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-600">Nombres</label>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        value={form.name || ""}
                                        onChange={(e) => set("name", maskLettersOnly(e.target.value, 50))}
                                        className={inputClass(errors.name)}
                                    />
                                    <div className="flex items-start justify-between gap-2">
                                        {errors.name ? <span className="text-[11px] text-red-500">{errors.name}</span> : <span />}
                                        <span className="text-[11px] text-gray-400 ml-auto">{(form.name || "").length}/50</span>
                                    </div>
                                </div>
                            )}
                            {fields.includes("last_name") && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-600">Apellidos</label>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        value={form.last_name || ""}
                                        onChange={(e) => set("last_name", maskLettersOnly(e.target.value, 50))}
                                        className={inputClass(errors.last_name)}
                                    />
                                    <div className="flex items-start justify-between gap-2">
                                        {errors.last_name ? <span className="text-[11px] text-red-500">{errors.last_name}</span> : <span />}
                                        <span className="text-[11px] text-gray-400 ml-auto">{(form.last_name || "").length}/50</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(fields.includes("dui") || fields.includes("phone") || fields.includes("gender")) && (
                        <div className="grid grid-cols-2 gap-4">
                            {fields.includes("dui") && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-600">DUI</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="00000000-0"
                                        value={form.dui || ""}
                                        onChange={(e) => set("dui", maskDui(e.target.value))}
                                        className={inputClass(errors.dui)}
                                    />
                                    <div className="flex items-start justify-between gap-2">
                                        {errors.dui ? <span className="text-[11px] text-red-500">{errors.dui}</span> : <span />}
                                        <span className="text-[11px] text-gray-400 ml-auto">{(form.dui || "").length}/10</span>
                                    </div>
                                </div>
                            )}
                            {fields.includes("phone") && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-600">Teléfono</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={9}
                                        placeholder="0000-0000"
                                        value={form.phone || ""}
                                        onChange={(e) => set("phone", maskPhone(e.target.value))}
                                        className={inputClass(errors.phone)}
                                    />
                                    <div className="flex items-start justify-between gap-2">
                                        {errors.phone ? <span className="text-[11px] text-red-500">{errors.phone}</span> : <span />}
                                        <span className="text-[11px] text-gray-400 ml-auto">{(form.phone || "").length}/9</span>
                                    </div>
                                </div>
                            )}
                            {fields.includes("gender") && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-600">Género</label>
                                    <select
                                        value={form.gender || "Masculino"}
                                        onChange={(e) => set("gender", e.target.value)}
                                        className={inputClass(false)}
                                    >
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {fields.includes("birth_date") && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600">Fecha de nacimiento</label>
                            <input
                                type="date"
                                max={getMaxAdultBirthDate()}
                                value={form.birth_date || ""}
                                onChange={(e) => set("birth_date", e.target.value)}
                                className={inputClass(errors.birth_date)}
                            />
                            {errors.birth_date && <span className="text-[11px] text-red-500">{errors.birth_date}</span>}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={close}
                            disabled={submitting}
                            className="px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-5 py-2.5 text-sm font-semibold bg-[#3B6FCA] text-white rounded-xl hover:bg-[#2d5ab5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {submitting ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </fieldset>
            </div>

            {canSign && (
                <SignatureSealModal
                    isOpen={isSignatureModalOpen}
                    onClose={() => setIsSignatureModalOpen(false)}
                    signatureUrl={user?.signature_url}
                    sealUrl={user?.seal_url}
                    submitting={signatureSubmitting}
                    onSaveSignatureFile={saveSignatureFile}
                    onSaveSignatureDrawn={saveSignatureDrawn}
                    onRemoveSignature={removeSignature}
                    onSaveSeal={saveSeal}
                    onRemoveSeal={removeSeal}
                />
            )}
        </div>
    );
};

export default EditProfileModal;
