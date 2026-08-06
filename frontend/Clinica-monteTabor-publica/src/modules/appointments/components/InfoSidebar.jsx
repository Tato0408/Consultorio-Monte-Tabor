// Barra lateral compartida por los pasos 1 y 2 del wizard: una tarjeta destacada
// (hero) arriba, una lista de datos útiles, y un aviso de ayuda al final
const InfoSidebar = ({ hero, items }) => (
  <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
    <div className="rounded-2xl border border-gray-100 shadow-sm p-6 bg-gradient-to-br from-[#3B6FCA]/5 to-transparent">
      {hero}
    </div>

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="font-semibold text-gray-800 text-sm mb-4">Información {items.tipo || "importante"}</p>
      <div className="space-y-4">
        {items.list.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex items-start gap-3">
            <Icon className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">{title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default InfoSidebar;