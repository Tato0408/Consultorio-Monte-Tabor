import { useNavigate } from "react-router-dom";
import { User, ChevronRight } from "lucide-react";

const Avatar = ({ src, name }) => (
    src
        ? <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100" />
        : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-slate-500" />
          </div>
);

const StatusPill = ({ label, count, dotColor, textColor, bg }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bg}`}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className={`text-xs font-medium ${textColor}`}>{label}</span>
        <span className={`text-xs font-bold ${textColor}`}>{count}</span>
    </div>
);

const DoctorStatusSection = ({ data }) => {
    const navigate = useNavigate();
    const counts      = data?.counts      || { inConsultation: 0, upcoming: 0, available: 0, unavailable: 0 };
    const inConsult   = data?.inConsultation || [];
    const upcoming    = data?.upcoming    || [];

    const doctorName = (d) =>
        d ? `${d.name || ""} ${d.last_name || ""}`.trim() : "—";

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800">Estado de doctores</h2>
                <button
                    onClick={() => navigate("/calendar/appointments")}
                    className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                >
                    Ver calendario de doctores <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Status pills */}
            <div className="flex flex-wrap gap-2 mb-6">
                <StatusPill label="En consulta"           count={counts.inConsultation} dotColor="bg-blue-500"  textColor="text-blue-700"   bg="bg-blue-50" />
                <StatusPill label="Consultas próximas (1h)" count={counts.upcoming}      dotColor="bg-amber-400" textColor="text-amber-700"  bg="bg-amber-50" />
                <StatusPill label="Disponibles"           count={counts.available}     dotColor="bg-emerald-500" textColor="text-emerald-700" bg="bg-emerald-50" />
                <StatusPill label="No disponibles"        count={counts.unavailable}   dotColor="bg-slate-300" textColor="text-slate-500"  bg="bg-slate-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── En consulta ahora ── */}
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                        Doctores en consulta ahora
                    </p>

                    {inConsult.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">
                            Ningún doctor en consulta actualmente.
                        </p>
                    ) : (
                        <div className="flex flex-col divide-y divide-slate-50">
                            {inConsult.map((appt) => (
                                <div key={appt._id} className="flex items-center gap-3 py-3">
                                    <Avatar src={appt.doctor?.img_url} name={doctorName(appt.doctor)} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                            {doctorName(appt.doctor)}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">
                                            {appt.doctor?.specialty || appt.type || "Medicina general"}
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 flex-shrink-0">
                                        En consulta
                                    </span>
                                    <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                                        Desde {appt.start_time}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {inConsult.length > 0 && (
                        <button
                            onClick={() => navigate("/calendar/appointments")}
                            className="mt-3 flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                        >
                            Ver todos en consulta <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* ── Consultas próximas ── */}
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                        Consultas próximas
                    </p>

                    {upcoming.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">
                            No hay consultas en la siguiente hora.
                        </p>
                    ) : (
                        <div className="flex flex-col divide-y divide-slate-50">
                            {upcoming.map((appt) => (
                                <div key={appt._id} className="flex items-center gap-3 py-3">
                                    <span className="text-sm font-bold text-slate-700 w-12 flex-shrink-0 tabular-nums">
                                        {appt.start_time}
                                    </span>
                                    <Avatar src={appt.doctor?.img_url} name={doctorName(appt.doctor)} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                            {doctorName(appt.doctor)}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">
                                            Paciente:{" "}
                                            {appt.patient
                                                ? `${appt.patient.name || ""} ${appt.patient.last_name || ""}`.trim()
                                                : "—"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {upcoming.length > 0 && (
                        <button
                            onClick={() => navigate("/calendar/appointments")}
                            className="mt-3 flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                        >
                            Ver todos en consulta <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DoctorStatusSection;
