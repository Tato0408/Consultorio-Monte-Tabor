const STATUS_BADGE = {
    scheduled: { label: "Confirmada", cls: "bg-emerald-50 text-emerald-600" },
    pending: { label: "Pendiente", cls: "bg-amber-50 text-amber-600" },
};

// "Próximas citas": lista simple de las siguientes citas del día, ordenadas por hora.
const UpcomingAppointmentsList = ({ appointments, onViewAll }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm">Próximas citas</h3>
                <button type="button" onClick={onViewAll} className="text-xs font-semibold text-blue-600 hover:underline">
                    Ver todas
                </button>
            </div>

            {appointments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay más citas por venir hoy.</p>
            ) : (
                <div className="flex flex-col divide-y divide-slate-50">
                    {appointments.map((a) => {
                        const badge = STATUS_BADGE[a.status] || { label: a.status, cls: "bg-slate-50 text-slate-500" };
                        return (
                            <div key={a._id} className="flex items-center justify-between py-2.5 gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-bold text-slate-700 w-12 flex-shrink-0">{a.start_time}</span>
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
        </div>
    );
};

export default UpcomingAppointmentsList;
