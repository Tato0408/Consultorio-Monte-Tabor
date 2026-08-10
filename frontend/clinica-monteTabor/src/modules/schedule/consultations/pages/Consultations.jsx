import React from "react";
import useAppointments from "../../appointments/hooks/useAppointment";
import useAppointmentStats from "../../appointments/hooks/useAppointmentStats";
import useAppointmentHistory from "../../appointments/hooks/useAppointmentHistory";
import AppointmentStatsCards from "../components/AppointmentStatsCards";
import AppointmentFilters from "../components/AppointmentFilters";
import AppointmentsTable from "../components/AppointmentTable";
import TablePagination from "../components/TablePagination";
import AppointmentHistoryPanel from "../components/AppointmentHistoryPanel";


const getTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().split("T")[0];
};

const Consultations =() => {
     const today = getTodayString();

   // Por defecto la tabla muestra TODAS las fechas (el filtro de fechas es secundario, el
    // usuario lo activa si lo necesita) con citas "pending" (agendadas sin confirmar) y
    // "scheduled" (confirmadas / en espera) - las "completed" se ven en el Historial del Día en
    // vez de en esta tabla operativa. Antes arrancaba fijado a "hoy", lo que dejaba la tabla
    // vacía o casi vacía cualquier día sin citas agendadas para esa fecha exacta.
    const {
        appointments,
        pagination,
        isLoading: isLoadingAppointments,
        error: appointmentsError,
        filters,
        updateFilters,
        goToPage,
    } = useAppointments({
        status: "scheduled, pending",
        limit: 8,
    });
 
    const { stats, isLoading: isLoadingStats } = useAppointmentStats(today);
    const { history, isLoading: isLoadingHistory, error: historyError } = useAppointmentHistory(today, 5);
 
    const waitingCount = appointments.filter((a) => a.status === "scheduled").length;
    const completedCount = appointments.filter((a) => a.status === "completed").length;
 
    const handleFilterChange = (changed) => {
        // Si el usuario cambia el filtro de estado manualmente, respetamos su elección
        // en vez del default "pending, scheduled".
        if ("status" in changed) {
            updateFilters({ status: changed.status || undefined });
            return;
        }
        updateFilters(changed);
    };
 
    return (
        <div className="p-8">
            <p className="text-slate-500 mb-6">
                Listado operacional de atenciones médicas y seguimiento clínico
            </p>
 
            <AppointmentStatsCards stats={stats} isLoading={isLoadingStats} />
 
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <div>
                    <AppointmentFilters filters={filters} onChange={handleFilterChange} />
 
                    <AppointmentsTable
                        appointments={appointments}
                        isLoading={isLoadingAppointments}
                        error={appointmentsError}
                        waitingCount={waitingCount}
                        completedCount={completedCount}
                    />
 
                    <TablePagination
                        pagination={pagination}
                        onPageChange={goToPage}
                        onLimitChange={(limit) => updateFilters({ limit })}
                    />
                </div>
 
                <AppointmentHistoryPanel
                    history={history}
                    isLoading={isLoadingHistory}
                    error={historyError}
                />
            </div>
        </div>
    );

}
export default Consultations