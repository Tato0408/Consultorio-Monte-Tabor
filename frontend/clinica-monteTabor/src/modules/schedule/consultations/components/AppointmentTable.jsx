import { useNavigate } from "react-router-dom";

// El ciclo real de una cita es pending -> scheduled -> completed / cancelled
// (ver AppointmentsForm.jsx); "scheduled" ("Programada") equivale a "en espera".
const STATUS_BADGE = {
    pending: { className: "bg-slate-100 text-slate-600" },
    scheduled: { className: "bg-amber-100 text-amber-700" },
    completed: { className: "bg-emerald-100 text-emerald-700" },
    cancelled: { className: "bg-red-100 text-red-700" },
};

const formatPersonName = (person) =>
    person ? `${person.name} ${person.last_name}` : "—";

const AppointmentsTable = ({ appointments, isLoading, error, waitingCount, completedCount }) => {
    const navigate = useNavigate();

    const handleContinue = (appointmentId) => {
        // Navega al formulario de consulta; el cambio de estado a "completed"
        // ocurre al guardar la consulta, no en este click.
        navigate(`/calendar/consultations/${appointmentId}`);
    };

    return (
        <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
                <h3 className="font-semibold text-slate-800">Consultas del día</h3>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {waitingCount} En espera
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {completedCount} Atendidas
                </span>
            </div>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                        <th className="py-2 font-medium">Hora</th>
                        <th className="py-2 font-medium">Paciente</th>
                        <th className="py-2 font-medium">Médico atendiendo</th>
                        <th className="py-2 font-medium">Estado</th>
                        <th className="py-2 font-medium">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading && (
                        <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                                Cargando consultas...
                            </td>
                        </tr>
                    )}

                    {!isLoading && error && (
                        <tr>
                            <td colSpan={5} className="py-8 text-center text-red-500">
                                No se pudieron cargar las consultas. {error}
                            </td>
                        </tr>
                    )}

                    {!isLoading && !error && appointments.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                                No hay consultas para los filtros seleccionados.
                            </td>
                        </tr>
                    )}

                    {!isLoading && !error && appointments.map((appt) => {
                        const badge = STATUS_BADGE[appt.status] || STATUS_BADGE.pending;
                        const isWaiting = appt.status === "scheduled";

                        return (
                            <tr
                                key={appt._id}
                                className={`border-b border-slate-50 last:border-0 ${isWaiting ? "bg-blue-50/40" : ""}`}
                            >
                                <td className="py-3 text-slate-700">{appt.start_time}</td>
                                <td className="py-3 text-slate-700">{formatPersonName(appt.patient_id)}</td>
                                <td className="py-3 text-slate-700">{formatPersonName(appt.doctor_id)}</td>
                                <td className="py-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                        {appt.status}
                                    </span>
                                </td>
                                <td className="py-3">
                                    {appt.status === "completed" ? (
                                        <button
                                            onClick={() => navigate(`/calendar/consultations/${appt._id}?mode=view`)}
                                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            Ver registro
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleContinue(appt._id)}
                                            className="bg-[#0b66d6] text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-[#0a59ba]"
                                        >
                                            Continuar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default AppointmentsTable;