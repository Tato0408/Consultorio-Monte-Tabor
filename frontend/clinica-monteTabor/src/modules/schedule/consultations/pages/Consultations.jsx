import React from "react";
import { useAuth } from "@/context/AuthContext";
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
     const { user } = useAuth();

   // Por defecto la tabla muestra todas las fechas (el filtro de fechas es
    // secundario, se activa solo si se necesita) y todos los estados: el
    // filtro de estado ya no es un valor inicial que "arranque estrecho" y
    // necesite ampliarse después, el propio tab "Todos" (ver
    // AppointmentTable.jsx) es el punto de partida.
    const {
        appointments,
        pagination,
        isLoading: isLoadingAppointments,
        error: appointmentsError,
        filters,
        updateFilters,
        goToPage,
    } = useAppointments({
        limit: 8,
    });

    const { stats, isLoading: isLoadingStats } = useAppointmentStats(today);
    const { history, isLoading: isLoadingHistory, error: historyError } = useAppointmentHistory(today, 5);
 
    const waitingCount = appointments.filter((a) => a.status === "scheduled").length;
    const completedCount = appointments.filter((a) => a.status === "completed").length;
 
    const handleFilterChange = (changed) => {
        // Si el usuario cambia el filtro de estado manualmente, se
        // respeta esa elección en vez del valor por defecto (pending,
        // scheduled).
        if ("status" in changed) {
            updateFilters({ status: changed.status || undefined });
            return;
        }
        updateFilters(changed);
    };

    // Al hacer click en una tarjeta superior (Agendados, En espera o
    // Completados) se filtra la tabla de abajo por ese estado y por
    // las citas del usuario logueado (doctor_id), para no tener que
    // buscar entre las citas de todos los doctores. Un segundo click
    // sobre la misma tarjeta ya activa quita el filtro y vuelve a la
    // vista general por defecto.
    const handleStatCardClick = (statusValue) => {
        const isSameFilterActive = filters.status === statusValue && filters.doctor_id === user?.id;
        if (isSameFilterActive) {
            updateFilters({ status: undefined, doctor_id: undefined });
        } else {
            updateFilters({ status: statusValue, doctor_id: user?.id });
        }
    };

    return (
        <div className="p-4 sm:p-8">
            <p className="text-slate-500 mb-6">
                Listado operacional de atenciones médicas y seguimiento clínico
            </p>
 
            <AppointmentStatsCards
                stats={stats}
                isLoading={isLoadingStats}
                onFilterClick={handleStatCardClick}
                activeFilter={{ status: filters.status, doctor_id: filters.doctor_id }}
            />
 
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <div>
                    <AppointmentFilters filters={filters} onChange={handleFilterChange} />
 
                    <AppointmentsTable
                        appointments={appointments}
                        isLoading={isLoadingAppointments}
                        error={appointmentsError}
                        waitingCount={waitingCount}
                        completedCount={completedCount}
                        statusFilter={filters.status}
                        onStatusChange={(status) => handleFilterChange({ status })}
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