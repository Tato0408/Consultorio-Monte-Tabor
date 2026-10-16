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

// Mismo string que la pestaña "Todos" en AppointmentTable.jsx: nunca incluye
// pending/needs_reschedule/expired/pending_payment (citas nunca confirmadas por
// ambas partes). Se reusa tanto como filtro inicial como valor al que volver
// cuando se "apaga" un filtro (ver handleStatCardClick) — apiClient descarta un
// status "undefined" del request, y sin status en la query el backend no
// restringe por estado, lo que dejaba pending visible otra vez ahí.
const DEFAULT_STATUS = "scheduled,completed,cancelled,no_show";

const Consultations =() => {
     const today = getTodayString();
     const { user, userType } = useAuth();

   // Por defecto la tabla muestra todas las fechas (el filtro de fechas es
    // secundario, se activa solo si se necesita) y el estado inicial ya excluye
    // pending/needs_reschedule/expired (citas nunca confirmadas): este módulo de
    // Consultas no debe mostrarlas bajo ningún tab, solo Calendario → "Por aceptar" las
    // muestra. Mismo string que la pestaña "Todos" en AppointmentTable.jsx — así arrancan
    // sincronizados y esa pestaña queda resaltada desde el primer render.
    const {
        appointments,
        pagination,
        isLoading: isLoadingAppointments,
        error: appointmentsError,
        filters,
        updateFilters,
        goToPage,
        fetchAppointments,
    } = useAppointments({
        limit: 8,
        status: DEFAULT_STATUS,
        // La enfermera con permiso de Ingreso también ve las citas de los
        // demás proveedores, con las suyas siempre primero (ver
        // getAppointments en el backend). Para los demás roles no aplica.
        include_others: userType === "nurse" ? "true" : undefined,
    });

    const { stats, isLoading: isLoadingStats, refetch: refetchStats } = useAppointmentStats(today);

    // Mantiene la tabla al día sin recargar la página: cuando el paciente
    // cancela una cita aceptada (llega como notificación por WebSocket) o al
    // volver a esta pestaña del navegador, se piden de nuevo las citas y las
    // tarjetas. Así una cita cancelada o no presentada pasa a su estado real
    // y deja de ofrecer el botón Continuar.
    React.useEffect(() => {
        const refresh_list = () => {
            fetchAppointments();
            refetchStats();
        };
        const handle_notification = (event) => {
            if (event.detail?.appointment_id) refresh_list();
        };
        window.addEventListener("app:notification", handle_notification);
        window.addEventListener("focus", refresh_list);
        return () => {
            window.removeEventListener("app:notification", handle_notification);
            window.removeEventListener("focus", refresh_list);
        };
    }, [fetchAppointments, refetchStats]);
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
            updateFilters({ status: DEFAULT_STATUS, doctor_id: undefined });
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
                        onDeleted={fetchAppointments}
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