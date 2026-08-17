import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import InputField from "../../../components/ui/InputField";
import useInsumos from "../hooks/useInsumos";

const CATEGORIAS = ["Curación", "Protección", "Desinfección", "Procedimiento", "EPI", "Limpieza"];
const UNIDADES   = ["unidades", "pares", "ml", "litros", "kg", "cajas", "galón", "caja", "ampolla", "frasco"];

const SelectField = ({ label, required, value, onChange, options, placeholder, error }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-600">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <select
      className={`border rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500
        ${error ? "border-red-400" : "border-gray-200"}`}
      value={value} onChange={onChange}
    >
      <option value="">{placeholder || "Selecciona"}</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">{children}</h3>
);


const ProductCombobox = ({ value, onChange, onSelect, error }) => {
  const { getInsumos } = useInsumos();
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const wrapRef = useRef(null);

  // Cierra las sugerencias al hacer clic fuera del componente.
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = async (val) => {
    onChange(val);
    if (val.length < 1) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await getInsumos({ search: val, limit: 8 });
      setSuggestions(data.insumos || []);
      setOpen(true);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  };

  const pick = (insumo) => {
    onChange(insumo.name);
    onSelect(insumo);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1 col-span-2" ref={wrapRef}>
      <label className="text-xs font-medium text-gray-600">
        Nombre del producto <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          className={`w-full border rounded-lg px-3 py-2.5 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500
            ${error ? "border-red-400" : "border-gray-200"}`}
          placeholder="Buscar o escribir nombre de producto..."
          maxLength={100}
          value={value}
          onChange={(e) => search(e.target.value)}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          autoComplete="off"
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

        {open && (
          <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-3 text-sm text-gray-400">Buscando...</p>
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">
                Sin resultados — se creará como producto nuevo
              </p>
            ) : (
              suggestions.map((s) => (
                <button key={s._id} type="button" onClick={() => pick(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left">
                  {s.image
                    ? <img src={s.image} alt={s.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.category} · {s.stock} {s.unit_measure} en stock</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};


const ModalStockEntry = ({ onClose, onSuccess }) => {
  const { stockEntry } = useInsumos();
  const [form, setForm] = useState({
    name: "", category: "", unit_measure: "",
    supplier: "", quantity: "", unit_cost: "", detalle: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  // Al seleccionar un producto del combobox, auto-rellena categoría y unidad
  const handleProductSelect = (insumo) => {
    setForm((p) => ({
      ...p,
      name:         insumo.name,
      category:     insumo.category     || p.category,
      unit_measure: insumo.unit_measure || p.unit_measure,
      supplier:     insumo.supplier     || p.supplier,
    }));
    setErrors((p) => ({ ...p, name: "" }));
  };

  const costoTotal = useMemo(() => {
    const q = parseFloat(form.quantity)  || 0;
    const c = parseFloat(form.unit_cost) || 0;
    return (q * c).toFixed(2);
  }, [form.quantity, form.unit_cost]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name         = "Requerido";
    if (!form.category)     e.category     = "Requerido";
    if (!form.quantity)     e.quantity      = "Requerido";
    if (!form.unit_measure) e.unit_measure  = "Requerido";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const ve = validate();
    if (Object.keys(ve).length) { setErrors(ve); return; }
    setLoading(true);
    try {
      await stockEntry({
        name:         form.name,
        category:     form.category,
        unit_measure: form.unit_measure,
        supplier:     form.supplier,
        quantity:     form.quantity,
        unit_cost:    form.unit_cost,
        detalle:      form.detalle || `Compra a ${form.supplier || "proveedor"}`,
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
      <button type="submit" form="form-stock" disabled={loading}
        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
        {loading ? "Guardando..." : "Registrar entrada"}
      </button>
    </>
  );

  return (
    <Modal
      title="Registrar entrada de stock"
      subtitle="Registra un nuevo ingreso de productos al inventario"
      onClose={onClose}
      footer={footer}
      width="w-[480px]"
      closeDisabled={loading}
    >
      {/* El botón de envío vive fuera de este formulario (footer del
          modal, enlazado mediante el atributo form con valor
          form-stock). Por eso también se desactiva de forma manual
          en el footer. */}
      <form id="form-stock" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset disabled={loading} className="contents">
        {errors.general && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {errors.general}
          </div>
        )}

 
        <section>
          <SectionTitle>Información del producto</SectionTitle>
          <div className="grid grid-cols-2 gap-4">

            <ProductCombobox
              value={form.name}
              onChange={(val) => setForm((p) => ({ ...p, name: val }))}
              onSelect={handleProductSelect}
              error={errors.name}
            />

            <SelectField label="Categoría" required
              value={form.category} onChange={set("category")}
              options={CATEGORIAS} placeholder="Selecciona una categoría"
              error={errors.category} />

            <SelectField label="Unidad de medida" required
              value={form.unit_measure} onChange={set("unit_measure")}
              options={UNIDADES} placeholder="Selecciona unidad"
              error={errors.unit_measure} />

            <InputField label="Proveedor (opcional)" id="supplier"
              placeholder="Nombre del proveedor"
              maxLength={100}
              value={form.supplier} onChange={set("supplier")} />
          </div>
        </section>

      
        <section>
          <SectionTitle>Cantidad y costo</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Cantidad recibida *" id="quantity" type="number" min={0} max={100000}
              placeholder="Ej. 100"
              value={form.quantity} onChange={set("quantity")}
              onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }}
              error={errors.quantity} />

            <InputField label="Costo unitario (opcional)" id="unit_cost" type="number" min={0} max={999999} step="0.01"
              placeholder="$0.00"
              value={form.unit_cost} onChange={set("unit_cost")}
              onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Costo total</label>
              <div className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700">
                ${costoTotal}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Detalle (opcional)</label>
              <textarea maxLength={250} rows={3}
                placeholder="Notas adicionales sobre esta entrada..."
                value={form.detalle} onChange={set("detalle")}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 text-right">{form.detalle.length}/250</p>
            </div>
          </div>
        </section>
      </fieldset>
      </form>
    </Modal>
  );
};

export default ModalStockEntry;
