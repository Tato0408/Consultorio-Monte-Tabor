import { useState, useEffect } from "react";
import Modal from "../../../components/ui/Modal";
import InputField from "../../../components/ui/InputField";
import useInsumos from "../hooks/useInsumos";

const CATEGORIAS = ["Curación", "Protección", "Desinfección", "Procedimiento", "EPI", "Limpieza"];
const UNIDADES   = ["unidades", "pares", "ml", "litros", "kg", "cajas", "galón", "caja", "ampolla", "frasco"];

const EMPTY = {
  name: "", category: "", description: "",
  stock: "", unit_measure: "", min_stock: "",
  supplier: "", expiration_date: "", price: "",
};

// Campos opcionales de texto/fecha donde "" es un valor real (vaciar el
// campo), a diferencia de los numéricos (stock, min_stock, price), donde un
// "" vacío nunca debe llegar al backend (Number("") revienta el cast de
// Mongoose). El backend ya soporta vaciar expiration_date (ver
// inventoryController.update), pero esa rama era código muerto porque el
// filtro de abajo nunca dejaba pasar un "" para editar.
const CLEARABLE_FIELDS = ["description", "supplier", "expiration_date"];

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

const ModalAgregarProducto = ({ onClose, onSuccess, item }) => {
  const { createInsumo, updateInsumo } = useInsumos();
  const isEdit = Boolean(item);

  const [form, setForm]       = useState(EMPTY);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name:            item.name          || "",
        category:        item.category      || "",
        description:     item.description   || "",
        stock:           String(item.stock  ?? ""),
        unit_measure:    item.unit_measure  || "",
        min_stock:       String(item.min_stock ?? ""),
        supplier:        item.supplier      || "",
        expiration_date: item.expiration_date
          ? new Date(item.expiration_date).toISOString().split("T")[0]
          : "",
        price: String(item.price ?? ""),
      });
    }
  }, [item]);

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name         = "Requerido";
    if (!form.category)     e.category     = "Requerido";
    if (!form.unit_measure) e.unit_measure = "Requerido";
    if (!form.min_stock)    e.min_stock    = "Requerido";
    if (!isEdit && !form.stock) e.stock    = "Requerido";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const ve = validate();
    if (Object.keys(ve).length) { setErrors(ve); return; }
    setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([k, v]) => v !== "" || (isEdit && CLEARABLE_FIELDS.includes(k)))
      );
      isEdit ? await updateInsumo(item._id, payload) : await createInsumo(payload);
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
      <button type="submit" form="form-producto" disabled={loading}
        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
        {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar producto"}
      </button>
    </>
  );

  return (
    <Modal
      title={isEdit ? "Editar producto" : "Agregar nuevo producto"}
      subtitle={isEdit
        ? "Modifica la información del producto."
        : "Completa la información del producto para agregarlo al inventario."}
      onClose={onClose}
      footer={footer}
      closeDisabled={loading}
    >
      {/* El botón de envío vive fuera de este formulario (footer del
          modal, enlazado mediante el atributo form con valor
          form-producto). Por eso también se desactiva de forma
          manual en el footer. */}
      <form id="form-producto" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset disabled={loading} className="contents">
        {errors.general && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        <section>
          <SectionTitle>Información básica</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nombre del producto *" id="name"
              placeholder="Ej. Gasas estériles 10x10"
              maxLength={100}
              value={form.name} onChange={set("name")} error={errors.name} />

            <SelectField label="Categoría" required
              value={form.category} onChange={set("category")}
              options={CATEGORIAS} placeholder="Selecciona una categoría"
              error={errors.category} />
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Descripción (opcional)</label>
            <textarea maxLength={500} rows={3}
              placeholder="Descripción detallada del producto, usos, especificaciones, etc."
              value={form.description} onChange={set("description")}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 text-right">{form.description.length}/500</p>
          </div>
        </section>

        <section>
          <SectionTitle>Inventario inicial</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            <InputField label={isEdit ? "Stock actual *" : "Stock inicial *"} id="stock"
              type="number" min={0} max={1000000} placeholder="Ej. 100"
              value={form.stock} onChange={set("stock")}
              onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }}
              error={errors.stock} />

            <SelectField label="Unidad de medida" required
              value={form.unit_measure} onChange={set("unit_measure")}
              options={UNIDADES} placeholder="Selecciona unidad"
              error={errors.unit_measure} />

            <div>
              <InputField label="Stock mínimo *" id="min_stock"
                type="number" min={0} max={1000000} placeholder="Ej. 10"
                value={form.min_stock} onChange={set("min_stock")}
                onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }}
                error={errors.min_stock} />
              <p className="text-xs text-gray-400 mt-1">Cantidad mínima antes de mostrar alerta</p>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>Información adicional</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Proveedor (opcional)" id="supplier"
              placeholder="Nombre del proveedor"
              maxLength={100}
              value={form.supplier} onChange={set("supplier")} />
            {/* Fecha de vencimiento/vida útil opcional para productos que no cuentan con fecha de caducidad */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Fecha de vencimiento/vida útil (opcional)</label>
              <input type="date"
                min="2000-01-01"
                max={`${new Date().getFullYear() + 20}-12-31`}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.expiration_date} onChange={set("expiration_date")} />
            </div>

            <InputField label="Precio unitario (opcional)" id="price"
              type="number" min={0} max={999999} step="0.01" placeholder="$0.00"
              value={form.price} onChange={set("price")}
              onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }} />
          </div>
        </section>
      </fieldset>
      </form>
    </Modal>
  );
};

export default ModalAgregarProducto;
