import { useState } from "react";
import { Loader2, Droplet } from "lucide-react";
import { BLOOD_TYPES, BLOOD_COMPAT, describeBloodType } from "../bloodCompat";
import { updateMyBloodType } from "@/services/profileService";
import { showSuccess, showError } from "@/lib/alerts";

const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;

const hoyInput = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

const Chips = ({ label, values }) => (
  <>
    <p className="text-xs font-semibold text-gray-500 mt-3 mb-2">{label}</p>
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <span key={v} className="px-2.5 py-1 rounded-lg bg-[#3B6FCA]/10 text-[#3B6FCA] text-xs font-semibold">{v}</span>
      ))}
    </div>
  </>
);

const BloodTypeSection = ({ patient, onSaved }) => {
  const actual = patient?.clinical_history?.blood_type || "";
  const registrado = fmtFecha(patient?.clinical_history?.blood_type_date);
  // true solo cuando lo confirmó personal clínico en una consulta (ver
  // BloodTypeCard.jsx en el panel privado). Guardarlo desde aquí siempre lo
  // deja en false: es un dato autoreportado, no confirmado por laboratorio.
  const verificado = !!patient?.clinical_history?.blood_type_verified;

  const [modo, setModo] = useState(actual ? "detalle" : "form");
  const [seleccion, setSeleccion] = useState(actual);
  const [fecha, setFecha] = useState(hoyInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const compat = actual ? BLOOD_COMPAT[actual] : null;

  const guardar = async () => {
    if (saving) return;
    if (!seleccion) { setError("Selecciona tu tipo de sangre"); return; }
    setSaving(true);
    try {
      const res = await updateMyBloodType(seleccion, fecha || undefined);
      showSuccess(res?.message || "Tipo de sangre guardado.");
      onSaved?.(res?.user || null);
      setModo("detalle");
    } catch (err) {
      showError(err.message || "No se pudo guardar tu tipo de sangre.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Formulario (agregar / actualizar) ----
  if (modo === "form") {
    return (
      <div className="max-w-xl">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-7 mb-5">
          <div className="flex flex-col items-center mb-5">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <Droplet className="w-8 h-8 text-red-500 fill-red-500" />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Selecciona tu tipo de sangre</p>
          <div className="grid grid-cols-4 gap-2.5">
            {BLOOD_TYPES.map((t) => {
              const on = seleccion === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setSeleccion(t); setError(""); }}
                  className={`py-3.5 rounded-xl border-2 text-base font-bold transition-all ${
                    on ? "bg-[#3B6FCA] border-[#3B6FCA] text-white" : "border-gray-100 text-gray-600 hover:border-[#3B6FCA]/40"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          <label className="block text-sm font-medium text-gray-700 mt-5 mb-1.5">Fecha del registro</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-[#3B6FCA] focus:ring-2 focus:ring-[#3B6FCA]/20 transition-all"
          />

          <div className="flex items-start gap-2 bg-[#3B6FCA]/5 rounded-xl p-3 mt-4">
            <svg className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            <p className="text-xs text-gray-500">Esta información es vital en una emergencia médica. Confírmala con un examen de laboratorio antes de registrarla.</p>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
            </button>
            {actual && (
              <button
                type="button"
                onClick={() => { setSeleccion(actual); setModo("detalle"); }}
                className="px-6 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Detalle ----
  return (
    <div className="max-w-xl">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 mb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <Droplet className="w-8 h-8 text-red-500 fill-red-500" />
        </div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-3">Tu tipo de sangre</p>
        <p className="text-4xl font-extrabold text-red-600 mt-1">{actual}</p>
        <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
          verificado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}>
          {verificado ? "Confirmado por personal clínico" : "Autoreportado, sin confirmar"}
        </span>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
        <p className="text-base font-bold text-gray-900 mb-2">¿Qué significa?</p>
        <p className="text-sm text-gray-600 leading-relaxed">{describeBloodType(actual)}</p>
      </div>

      {compat && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
          <p className="text-base font-bold text-gray-900 mb-1">Compatibilidad</p>
          <Chips label="Puedes donar a" values={compat.donateTo} />
          <Chips label="Puedes recibir de" values={compat.receiveFrom} />
        </div>
      )}

      {registrado && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-5">
          <p className="text-base font-bold text-gray-900 mb-2">Fecha de registro</p>
          <p className="text-xs text-gray-400">Registrado el</p>
          <p className="text-sm font-medium text-gray-700">{registrado}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => { setSeleccion(actual); setFecha(hoyInput()); setError(""); setModo("form"); }}
        className="px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors"
      >
        Actualizar tipo de sangre
      </button>
    </div>
  );
};

export default BloodTypeSection;
