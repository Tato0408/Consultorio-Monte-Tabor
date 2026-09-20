import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import InputField from "../../../components/ui/InputField";
import { Combobox, ComboboxTrigger, ComboboxContent, ComboboxItem } from "@/components/ui/combobox";
import useInsumos from "../hooks/useInsumos";
import { showWarning } from "@/lib/alerts";

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">{children}</h3>
);

const InfoField = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-600">{label}</label>
    <div className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-600 min-h-[40px]">
      {value || <span className="text-gray-300">—</span>}
    </div>
  </div>
);

const ModalAdjustStock = ({ onClose, onSuccess }) => {
  const { adjustStock, getInsumos } = useInsumos();
  // El catálogo se carga una vez y el <Combobox> (mismo que en citas) filtra
  // en el cliente mientras se escribe.
  const [insumos, setInsumos]       = useState([]);
  const [productId, setProductId]   = useState("");
  const product = insumos.find((i) => i._id === productId) || null;
  // Puede ser aumentar o disminuir.
  const [adjustType, setAdjustType] = useState("aumentar");
  const [quantity, setQuantity]     = useState("");
  const [responsible, setResp]      = useState("");
  const [reason, setReason]         = useState("");
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    getInsumos({ limit: 500 })
      .then((data) => setInsumos(data.insumos || []))
      .catch(() => setInsumos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (loading) return;
    const ve = validate();
    if (Object.keys(ve).length) { setErrors(ve); return; }
    setLoading(true);
    try {
      const response = await adjustStock(product._id, {
        quantity:    Number(quantity),
        adjustType,
        reason,
        responsible,
      });
      // Si se pidió disminuir más de lo que había en stock, el backend solo
      // descuenta lo disponible y lo avisa aquí (antes no había ningún
      // aviso: el stock quedaba en 0 sin que quien hizo el ajuste lo supiera).
      if (response?.capped) showWarning(response.message);
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
      <button type="button" onClick={onClose} disabled={loading}
        className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
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
      closeDisabled={loading}
    >
      {/* El botón de envío vive fuera de este formulario (footer del
          modal, enlazado mediante el atributo form con valor
          form-adjust), así que el fieldset no lo alcanza. Por eso
          también se desactiva de forma manual en el footer. */}
      <form id="form-adjust" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset disabled={loading} className="contents">
        {errors.general && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        <section>
          <SectionTitle>Producto</SectionTitle>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Producto <span className="text-red-500">*</span>
            </label>
            <Combobox
              value={productId}
              onValueChange={(value) => {
                setProductId(value ?? "");
                setErrors((p) => ({ ...p, product: "" }));
              }}
            >
              <ComboboxTrigger
                placeholder="Buscar producto registrado..."
                className={errors.product ? "border-red-400" : "border-gray-200"}
              />
              <ComboboxContent>
                {insumos.map((i) => (
                  <ComboboxItem key={i._id} value={i._id}>{i.name}</ComboboxItem>
                ))}
              </ComboboxContent>
            </Combobox>
            {errors.product && <p className="text-xs text-red-500">{errors.product}</p>}
          </div>


          {product && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <InfoField label="Categoría"      value={product.category} />
              <InfoField label="Unidad"         value={product.unit_measure} />
              <InfoField label="Proveedor"      value={product.supplier} />
            </div>
          )}
        </section>

       
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

        
        <section>
          <SectionTitle>Cantidad</SectionTitle>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <InputField
                label="Cantidad *" id="quantity" type="number" min={0} max={100000}
                placeholder="Ej. 10"
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value); setErrors((p) => ({ ...p, quantity: "" })); }}
                onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }}
                error={errors.quantity}
              />
            </div>

       
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

     
        <section>
          <SectionTitle>Información del ajuste</SectionTitle>

          <div className="flex flex-col gap-4">
            <InputField
              label="Responsable *" id="responsible"
              placeholder="Nombre de quien realiza el ajuste"
              maxLength={100}
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
      </fieldset>
      </form>
    </Modal>
  );
};

export default ModalAdjustStock;
