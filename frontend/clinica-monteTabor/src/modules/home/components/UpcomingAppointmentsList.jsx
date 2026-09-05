import CollapsibleCard from "@/components/ui/CollapsibleCard";

const STATUS_BADGE = {
    scheduled: { label: "Confirmada", cls: "bg-emerald-50 text-emerald-600" },
    pending: { label: "Pendiente", cls: "bg-amber-50 text-amber-600" },
    completed: { label: "Completada", cls: "bg-slate-100 text-slate-600" },
    cancelled: { label: "Cancelada", cls: "bg-red-50 text-red-600" },
    no_show: { label: "No se presentó", cls: "bg-slate-100 text-slate-500" },
    expired: { label: "Vencida", cls: "bg-orange-50 text-orange-600" },
};

// Lista simple de las próximas citas del día, ordenadas por hora. Expandible/colapsable con
// el mismo componente que usa Inventario (CollapsibleCard.jsx, ver InventoryAlertsRow.jsx).
const UpcomingAppointmentsList = ({ appointments, onViewAll }) => {
    return (
        <CollapsibleCard
            title="Próximas citas"
            defaultOpen
            actions={
                <button type="button" onClick={onViewAll} className="text-xs font-semibold text-blue-600 hover:underline flex-shrink-0">
                    Ver todas
                </button>
            }
        >
            {appointments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay más citas por venir hoy.</p>
            ) : (
                <div className="flex flex-col divide-y divide-slate-50">
                    {appointments.map((a) => {
                        // Fallback sin usar a.status crudo: todos los estados reales ya están en
                        // STATUS_BADGE, así que esto solo protege contra un valor futuro no
                        // contemplado, sin arriesgarse a mostrar texto en inglés en pantalla.
                        const badge = STATUS_BADGE[a.status] || { label: "Otro estado", cls: "bg-slate-50 text-slate-500" };
                        return (
                            <div key={a._id} className="flex items-center justify-between py-2.5 gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-bold text-slate-700 w-24 flex-shrink-0">{a.start_time} - {a.end_time}</span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-700 truncate">
                                            {a.patient ? `${a.patient.name} ${a.patient.last_name}` : "Paciente"}
                                        </p>
                                        <p className="text-[11px] text-slate-400 truncate">{a.type}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${badge.cls}`}>
                                    {badge.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleCard>
    );
};

export default UpcomingAppointmentsList;
