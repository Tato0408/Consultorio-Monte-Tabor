import { useState } from "react";
import { Check, X, ChevronRight } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError, confirmCancelAppointment } from "@/lib/alerts";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import { formatTime12h } from "@/lib/timeFormat";

// Panel de confirmación y cancelación de citas: pestañas de pendientes
// y confirmadas, con acciones reales contra el endpoint
// PATCH /api/appointments/:id/status, el mismo que usa el módulo de
// Citas. Expandible/colapsable con el mismo componente que usa Inventario
// (CollapsibleCard.jsx, ver InventoryAlertsRow.jsx).
const PendingConfirmationsPanel = ({ data, onChanged, onViewAll }) => {
    const [tab, setTab] = useState("pending");
    const [busyId, setBusyId] = useState(null);

    const list = tab === "pending" ? data.pending : data.confirmed;

    const updateStatus = async (id, status) => {
        if (busyId) return;
        setBusyId(id);
        try {
            await apiClient(`/appointments/${id}/status`, { method: "PATCH", body: { status } });
            showSuccess(status === "scheduled" ? "Cita confirmada." : "Cita cancelada.");
            onChanged?.();
        } catch (err) {
            showError(err.message || "No se pudo actualizar la cita.");
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async (appt) => {
        const confirmed = await confirmCancelAppointment();
        if (!confirmed) return;
        updateStatus(appt._id, "cancelled");
    };

    return (
        <CollapsibleCard title="Confirmación / cancelación de citas" defaultOpen>
            <div className="flex items-center gap-2 mb-3">
                <button
                    type="button"
                    onClick={() => setTab("pending")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        tab === "pending" ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:bg-slate-50"
                    }`}
                >
                    Pendientes
                    <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{data.counts.pending}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setTab("confirmed")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        tab === "confirmed" ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:bg-slate-50"
                    }`}
                >
                    Confirmadas
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5">{data.counts.confirmed}</span>
                </button>
            </div>

            {list.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                    {tab === "pending" ? "No hay citas pendientes por confirmar." : "No hay citas confirmadas hoy."}
                </p>
            ) : (
                <div className="flex flex-col divide-y divide-slate-50">
                    {list.map((a) => (
                        <div key={a._id} className="flex items-center justify-between py-2.5 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs font-bold text-slate-700 w-24 flex-shrink-0">{formatTime12h(a.start_time)} - {formatTime12h(a.end_time)}</span>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">
                                        {a.patient ? `${a.patient.name} ${a.patient.last_name}` : "Paciente"}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">{a.type}</p>
                                </div>
                            </div>
                            {tab === "pending" ? (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                        type="button"
                                        disabled={busyId === a._id}
                                        onClick={() => updateStatus(a._id, "scheduled")}
                                        className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center disabled:opacity-50"
                                        title="Confirmar"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busyId === a._id}
                                        onClick={() => handleReject(a)}
                                        className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center disabled:opacity-50"
                                        title="Cancelar"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">
                                    Confirmada
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={onViewAll}
                className="w-full mt-3 pt-3 border-t border-slate-50 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
                Ver todas las citas pendientes <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </CollapsibleCard>
    );
};

export default PendingConfirmationsPanel;
