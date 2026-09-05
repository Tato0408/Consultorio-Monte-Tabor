import { useState } from "react";
import { Loader2 } from "lucide-react";
import InputField from "@/components/ui/InputField";
import { updateMyProfile } from "@/services/profileService";
import { showSuccess, showError } from "@/lib/alerts";

const GENEROS = ["Masculino", "Femenino", "Otro", "Prefiero no decirlo"];

// ISO del backend -> "AAAA-MM-DD" para <input type="date">, siempre en UTC para que
// un nacimiento guardado a medianoche no se corra un día en El Salvador (UTC-6).
const isoToInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

const fromPatient = (p) => ({
  name: p?.name || "",
  last_name: p?.last_name || "",
  dui: p?.dui || "",
  birth_date: isoToInput(p?.birth_date),
  gender: p?.gender || "",
  phone: p?.phone || "",
  email: p?.email || "",
});

const EditProfileForm = ({ patient, onSaved, onCancel }) => {
  const [form, setForm] = useState(() => fromPatient(patient));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Ingresa tus nombres";
    if (!form.last_name.trim()) next.last_name = "Ingresa tus apellidos";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Correo no válido";
    if (!form.phone.trim()) next.phone = "Ingresa un teléfono";
    if (form.dui.trim() && !/^\d{8}-\d$/.test(form.dui.trim())) next.dui = "Formato: 12345678-9";
    if (!form.birth_date) next.birth_date = "Ingresa tu fecha de nacimiento";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const res = await updateMyProfile({
        name: form.name.trim(),
        last_name: form.last_name.trim(),
        dui: form.dui.trim(),
        birth_date: form.birth_date,
        gender: form.gender,
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      showSuccess(res?.message || "Tus cambios se guardaron.");
      onSaved?.(res?.user || null);
    } catch (err) {
      showError(err.message || "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-7 mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Información personal</p>
        <h2 className="text-base font-bold text-gray-900 mb-5">Editar mis datos</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="Nombres" value={form.name} onChange={(e) => setField("name")(e.target.value)} error={errors.name} />
          <InputField label="Apellidos" value={form.last_name} onChange={(e) => setField("last_name")(e.target.value)} error={errors.last_name} />
          <InputField label="DUI (opcional)" value={form.dui} onChange={(e) => setField("dui")(e.target.value)} placeholder="12345678-9" error={errors.dui} />
          <InputField label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={(e) => setField("birth_date")(e.target.value)} error={errors.birth_date} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Género</label>
            <select
              value={form.gender}
              onChange={(e) => setField("gender")(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-[#3B6FCA] focus:ring-2 focus:ring-[#3B6FCA]/20 transition-all"
            >
              <option value="">Seleccionar</option>
              {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-7 mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Información de contacto</p>
        <h2 className="text-base font-bold text-gray-900 mb-5">Cómo te contactamos</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="Teléfono" value={form.phone} onChange={(e) => setField("phone")(e.target.value)} error={errors.phone} />
          <InputField label="Correo electrónico" type="email" value={form.email} onChange={(e) => setField("email")(e.target.value)} error={errors.email} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar cambios
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default EditProfileForm;
