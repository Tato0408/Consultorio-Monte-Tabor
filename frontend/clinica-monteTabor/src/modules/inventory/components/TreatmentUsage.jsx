const TREATMENTS = [
  {
    name: "Retiro de uñero",
    icon: "🔵",
    items: [
      { name: "Gasas estériles", qty: "2 unidades" },
      { name: "Antiséptico clorhexidina", qty: "1 unidad" },
      { name: "Anestesia lidocaína 2%", qty: "1 unidad" },
      { name: "Guantes de látex", qty: "1 par" },
    ],
  },
  {
    name: "Curación simple",
    icon: "✚",
    items: [
      { name: "Gasas estériles", qty: "1 unidad" },
      { name: "Antiséptico clorhexidina", qty: "1 unidad" },
      { name: "Vendajes elásticos", qty: "1 unidad" },
      { name: "Guantes de látex", qty: "1 par" },
    ],
  },
  {
    name: "Suturas básicas",
    icon: "🔧",
    items: [
      { name: "Sutura nylon 3-0", qty: "1 unidad" },
      { name: "Agujas desechables 21G", qty: "1 unidad" },
      { name: "Gasas estériles", qty: "2 unidades" },
      { name: "Antiséptico clorhexidina", qty: "1 unidad" },
    ],
  },
];

const TreatmentUsage = () => (
  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
    <div className="mb-4">
      <h3 className="text-base font-semibold text-slate-800">Insumos utilizados por tratamiento</h3>
      <p className="text-xs text-slate-400 mt-0.5">Cantidad promedio de insumos por procedimiento</p>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {TREATMENTS.map((t) => (
        <div key={t.name} className="border border-slate-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{t.icon}</span>
            <h4 className="text-sm font-semibold text-slate-800">{t.name}</h4>
          </div>
          <div className="flex flex-col gap-2">
            {t.items.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{item.name}</span>
                <span className="text-xs text-slate-500 font-medium">{item.qty}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 text-xs text-blue-600 hover:underline font-medium">
            Ver detalle
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default TreatmentUsage;
