import { useState } from "react";
import { Plus, Trash2, Minus } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import InputField from "../../../components/ui/InputField";
import useInsumos from "../hooks/useInsumos";

const newRow = () => ({
  insumoId: "", name: "", unit_measure: "",
  quantity: 1, search: "", suggestions: [], open: false,
});

const ModalManualUsage = ({ onClose, onSuccess }) => {
  const { getInsumos, manualUsage } = useInsumos();
  const [responsible, setResp]  = useState("");
  const [reason, setReason]     = useState("");
  const [patient, setPatient]   = useState("");
  const [items, setItems]       = useState([newRow()]);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

 
  const searchInsumo = async (val, idx) => {
    updateRow(idx, { search: val, name: "", insumoId: "", suggestions: [], open: false });
    if (val.length < 2) return;
    try {
      const data = await getInsumos({ search: val, limit: 6 });
      updateRow(idx, { suggestions: data.insumos || [], open: true });
    } catch { }
  };

  const selectInsumo = (insumo, idx) =>
    updateRow(idx, {
      insumoId:     insumo._id,
      name:         insumo.name,
      unit_measure: insumo.unit_measure || "",
      search:       insumo.name,
      suggestions:  [],
      open:         false,
    });

  const updateRow = (idx, patch) =>
    setItems((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));

  const changeQty = (idx, delta) =>
    setItems((prev) => prev.map((r, i) =>
      i === idx ? { ...r, quantity: Math.max(1, Number(r.quantity) + delta) } : r
    ));


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const ve = {};
    if (!responsible.trim()) ve.responsible = "Requerido";
    if (!reason.trim())      ve.reason      = "Requerido";
    if (items.some((r) => !r.insumoId)) ve.items = "Selecciona un insumo válido en cada fila";
    if (Object.keys(ve).length) { setErrors(ve); return; }

    setLoading(true);
    try {
      await manualUsage({
        responsible,
        reason,
        patient,
        items: items.map(({ insumoId, quantity }) => ({ insumoId, quantity: Number(quantity) })),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} disabled={loading}
        className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        Cancelar
      </button>
      <button type="submit" form="form-manual" disabled={loading}
        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
        {loading ? "Registrando..." : "Registrar uso"}
      </button>
    </>
  );

  return (
    <Modal
      title="Registrar uso manual"
      subtitle="Registra el uso de insumos que no están asociados a un tratamiento"
      onClose={onClose}
      footer={footer}
      width="w-[560px]"
      closeDisabled={loading}
    >
      {/* El botón de envío vive fuera de este formulario (footer del
          modal, enlazado mediante el atributo form con valor
          form-manual). Por eso también se desactiva de forma manual
          en el footer. */}
      <form id="form-manual" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset disabled={loading} className="contents">
        {errors.general && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {errors.general}
          </div>
        )}


        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
            Información general
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Responsable *" id="responsible"
              placeholder="Dr. / Enf. nombre"
              maxLength={100}
              value={responsible}
              onChange={(e) => { setResp(e.target.value); setErrors((p) => ({ ...p, responsible: "" })); }}
              error={errors.responsible} />

            <InputField label="Paciente (opcional)" id="patient"
              placeholder="Nombre del paciente"
              maxLength={100}
              value={patient} onChange={(e) => setPatient(e.target.value)} />
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Motivo / Descripción <span className="text-red-500">*</span>
            </label>
            <textarea maxLength={250} rows={3}
              placeholder="Describe el motivo del uso de los insumos..."
              value={reason}
              onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: "" })); }}
              className={`border rounded-lg px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.reason ? "border-red-400" : "border-gray-200"}`} />
            <div className="flex items-center justify-between">
              {errors.reason
                ? <p className="text-xs text-red-500">{errors.reason}</p>
                : <span />}
              <p className="text-xs text-gray-400">{reason.length}/250</p>
            </div>
          </div>
        </section>


        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
            Seleccionar insumos utilizados
          </h3>

          {errors.items && <p className="text-xs text-red-500 mb-2">{errors.items}</p>}

          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-1 mb-2">
            <span className="text-xs text-gray-400 font-medium">Producto</span>
            <span className="text-xs text-gray-400 font-medium text-center w-28">Cantidad</span>
            <span className="text-xs text-gray-400 font-medium text-center w-16">Unidad</span>
            <span className="w-8" />
          </div>

          <div className="flex flex-col gap-3">
            {items.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">

                <div className="relative">
                  {row.insumoId ? (
                    <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5 bg-white">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-xs flex-shrink-0">📦</div>
                      <p className="text-sm font-semibold text-gray-800 truncate flex-1">{row.name}</p>
                      <button type="button" onClick={() => updateRow(idx, newRow())}
                        className="text-xs text-blue-500 hover:underline flex-shrink-0">
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Buscar insumo..."
                        maxLength={100}
                        value={row.search}
                        onChange={(e) => searchInsumo(e.target.value, idx)}
                      />
                      {row.open && row.suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                          {row.suggestions.map((s) => (
                            <button key={s._id} type="button"
                              onClick={() => selectInsumo(s, idx)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 text-left">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs flex-shrink-0">📦</div>
                              <div>
                                <p className="font-medium text-gray-800">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.stock} {s.unit_measure} disponibles</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>


                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden w-28">
                  <button type="button" onClick={() => changeQty(idx, -1)}
                    className="px-2.5 py-2 hover:bg-gray-100 text-gray-600 transition-colors">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input type="number" min={1} max={10000}
                    className="w-10 text-center text-sm font-medium text-gray-800 outline-none bg-transparent"
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, { quantity: Math.min(10000, Math.max(1, Number(e.target.value))) })}
                    onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }} />
                  <button type="button" onClick={() => changeQty(idx, 1)}
                    className="px-2.5 py-2 hover:bg-gray-100 text-gray-600 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-xs text-gray-500 w-16 text-center truncate">
                  {row.unit_measure || "—"}
                </span>

                {items.length > 1
                  ? <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 w-8">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  : <span className="w-8" />}
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setItems((p) => [...p, newRow()])}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-blue-600 font-medium hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Agregar otro insumo
          </button>
        </section>
      </fieldset>
      </form>
    </Modal>
  );
};

export default ModalManualUsage;
