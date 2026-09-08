// Card simple y siempre visible para las secciones de la pantalla de
// disponibilidad. A diferencia de CollapsibleCard, no se colapsa: en el
// rediseno cada seccion queda abierta y legible desde que se abre la pantalla.
// number, title y subtitle arman el encabezado. actions es un slot opcional
// a la derecha (un boton de agregar o un grupo de tabs).
const ScheduleCard = ({ number, title, subtitle, actions, children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
                {number != null && (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#eaf4fd] text-[#2E6DA4] text-xs font-bold flex-shrink-0 mt-0.5">
                        {number}
                    </span>
                )}
                <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
                    {subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{subtitle}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        <div className="px-5 pb-5 sm:px-6">{children}</div>
    </div>
);

export default ScheduleCard;
