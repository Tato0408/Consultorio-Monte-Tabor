// Tarjeta base para las secciones del formulario. Muestra un ícono y un
// título opcionales encima del contenido recibido en children.
const SectionCard = ({ icon, title, children, className = "" }) => {
    return (
        <div className={`bg-white border border-slate-100 rounded-xl p-5 ${className}`}>
            <div className="flex items-center gap-2 mb-4">
                {icon && <span className="text-[#0b66d6]">{icon}</span>}
                <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
            </div>
            {children}
        </div>
    );
};

export default SectionCard;