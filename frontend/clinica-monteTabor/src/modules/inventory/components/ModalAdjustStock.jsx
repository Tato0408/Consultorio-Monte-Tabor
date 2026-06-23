import { useState, useRef, useEffect } from "react";
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import InputField from "../../../components/ui/InputField";
import { adjustStock, getInsumos } from "../../../services/insumosService";

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">{children}</h3>
);

/* ── Combobox de producto existente ─────────────────────── */
const ProductCombobox = ({ value, onSelect, error }) => {
  const [query, setQuery]           = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = async (val) => {
    setQuery(val);
    onSelect(null); // limpiar selección mientras escribe
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
    setQuery(insumo.name);
    setSuggestions([]);
    setOpen(false);
    onSelect(insumo);
  };

  return (
    <div className="flex flex-col gap-1" ref={wrapRef}>
      <label className="text-xs font-medium text-gray-600">
        Producto <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          className={`w-full border rounded-lg px-3 py-2.5 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500
            ${error ? "border-red-400" : "border-gray-200"}`}
          placeholder="Buscar producto registrado..."
          value={query}
          onChange={(e) => search(e.target.value)}
          autoComplete="off"
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

        {open && (
          <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-3 text-sm text-gray-400">Buscando...</p>
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No se encontraron productos</p>
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

/* ── InfoField (campo de solo lectura auto-rellenado) ───── */
const InfoField = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-600">{label}</label>
    <div className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-600 min-h-[40px]">
      {value || <span className="text-gray-300">—</span>}
    </div>
  </div>
);

/* ── Modal principal ────────────────────────────────────── */
const ModalAdjustStock = ({ onClose, onSuccess }) => {
  const [product, setProduct]       = useState(null); // insumo seleccionado
  const [adjustType, setAdjustType] = useState("aumentar"); // "aumentar" | "disminuir"
  const [quantity, setQuantity]     = useState("");
  const [responsible, setResp]      = useState("");
  const [reason, setReason]         = useState("");
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);

  const validate = () => {
    const e = {};
    if (!product)          e.product     = "Selecciona un producto";
    if (!quantity || Number(quantity) <= 0) e.quantity = "Ingresa una cantidad válida";
    if (!responsible.trim()) e.responsible = "Requerido";
    if (!reason.trim())      e.reason      = "Requerido";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ve = validate();
    if (Object.keys(ve).length) { setErrors(ve); return; }
    setLoading(true);
    try {
      await adjustStock(product._id, {
        quantity:    Number(quantity),
        adjustType,
        reason,
        responsible,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  const stockFinal = product
    ? adjustType === "aumentar"
      ? product.stock + (Number(quantity) || 0)
      : Math.max(0, product.stock - (Number(quantity) || 0))
    : null;

  const footer = (
    <>
      <button type="button" onClick={onClose}
        className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
        Cancelar
      </button>
      <button type="submit" form="form-adjust" disabled={loading}
        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
        {loading ? "Guardando..." : "Aplicar ajuste"}
      </button>
    </>
  );

  return (
    <Modal
      title="Ajuste de inventario"
      subtitle="Corrige el stock de un producto de forma manual"
      onClose={onClose}
      footer={footer}
      width="w-[480px]"
    >
      <form id="form-adjust" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {errors.general && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        {/* ── Producto ────────────────────────────────────── */}
        <section>
          <SectionTitle>Producto</SectionTitle>

          <ProductCombobox
            value={product}
            onSelect={(insumo) => {
              setProduct(insumo);
              setErrors((p) => ({ ...p, product: "" }));
            }}
            error={errors.product}
          />

          {/* Info auto-rellenada al seleccionar */}
          {product && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <InfoField label="Categoría"      value={product.category} />
              <InfoField label="Unidad"         value={product.unit_measure} />
              <InfoField label="Proveedor"      value={product.supplier} />
            </div>
          )}
        </section>

        {/* ── Tipo de ajuste ───────────────────────────────── */}
        <section>
          <SectionTitle>Tipo de ajuste</SectionTitle>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdjustType("aumentar")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors
                ${adjustType === "aumentar"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            >
              <ArrowUp className="w-4 h-4" />
              Entrada (agregar)
            </button>

            <button
              type="button"
              onClick={() => setAdjustType("disminuir")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors
                ${adjustType === "disminuir"
                  ? "border-red-400 bg-red-50 text-red-600"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            >
              <ArrowDown className="w-4 h-4" />
              Salida (retirar)
            </button>
          </div>
        </section>

        {/* ── Cantidad ─────────────────────────────────────── */}
        <section>
          <SectionTitle>Cantidad</SectionTitle>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <InputField
                label="Cantidad *" id="quantity" type="number"
                placeholder="Ej. 10"
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value); setErrors((p) => ({ ...p, quantity: "" })); }}
                error={errors.quantity}
              />
            </div>

            {/* Stock resultante */}
            {product && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Stock resultante</label>
                <div className={`border rounded-lg px-3 py-2.5 text-sm font-bold
                  ${adjustType === "aumentar" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"}`}>
                  {product.stock} → {stockFinal} {product.unit_measure}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Responsable y motivo ─────────────────────────── */}
        <section>
          <SectionTitle>Información del ajuste</SectionTitle>

          <div className="flex flex-col gap-4">
            <InputField
              label="Responsable *" id="responsible"
              placeholder="Nombre de quien realiza el ajuste"
              value={responsible}
              onChange={(e) => { setResp(e.target.value); setErrors((p) => ({ ...p, responsible: "" })); }}
              error={errors.responsible}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Motivo del ajuste <span className="text-red-500">*</span>
              </label>
              <textarea maxLength={250} rows={3}
                placeholder="Explica por qué se realiza este ajuste..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: "" })); }}
                className={`border rounded-lg px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.reason ? "border-red-400" : "border-gray-200"}`}
              />
              <div className="flex items-center justify-between">
                {errors.reason ? <p className="text-xs text-red-500">{errors.reason}</p> : <span />}
                <p className="text-xs text-gray-400">{reason.length}/250</p>
              </div>
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
};

export default ModalAdjustStock;
