import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
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
  const [imagen, setImagen]   = useState(null);
  const [preview, setPreview] = useState(null);
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
      if (item.image) setPreview(item.image);
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
    const ve = validate();
    if (Object.keys(ve).length) { setErrors(ve); return; }
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== "") data.append(k, v); });
      if (imagen) data.append("imagen", imagen);
      isEdit ? await updateInsumo(item._id, data) : await createInsumo(data);
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
      <button type="button" onClick={onClose}
        className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
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
    >
      <form id="form-producto" onSubmit={handleSubmit} className="flex flex-col gap-6">
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
              type="number" placeholder="Ej. 100"
              value={form.stock} onChange={set("stock")} error={errors.stock} />

            <SelectField label="Unidad de medida" required
              value={form.unit_measure} onChange={set("unit_measure")}
              options={UNIDADES} placeholder="Selecciona unidad"
              error={errors.unit_measure} />

            <div>
              <InputField label="Stock mínimo *" id="min_stock"
                type="number" placeholder="Ej. 10"
                value={form.min_stock} onChange={set("min_stock")} error={errors.min_stock} />
              <p className="text-xs text-gray-400 mt-1">Cantidad mínima antes de mostrar alerta</p>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>Información adicional</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Proveedor (opcional)" id="supplier"
              placeholder="Nombre del proveedor"
              value={form.supplier} onChange={set("supplier")} />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Fecha de vencimiento (opcional)</label>
              <input type="date"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.expiration_date} onChange={set("expiration_date")} />
            </div>

            <InputField label="Precio unitario (opcional)" id="price"
              type="number" placeholder="$0.00"
              value={form.price} onChange={set("price")} />
          </div>
        </section>

        <section>
          <SectionTitle>Imagen del producto (opcional)</SectionTitle>
          <label className="cursor-pointer block">
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) { setImagen(f); setPreview(URL.createObjectURL(f)); }
              }} />
            {preview ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-medium">Cambiar imagen</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-36 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-500">Arrastrar una imagen o haz clic para seleccionar</span>
                <span className="text-xs text-gray-400">Formato JPG, PNG. Máx 2MB</span>
              </div>
            )}
          </label>
        </section>
      </form>
    </Modal>
  );
};

export default ModalAgregarProducto;
