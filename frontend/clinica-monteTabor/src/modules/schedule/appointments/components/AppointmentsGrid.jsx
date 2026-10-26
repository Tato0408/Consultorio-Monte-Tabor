import React, { useState, useEffect } from "react";
import { Edit, Eye, Trash2, Ban, UserX, Plus, Loader2, Search, ArrowUp, ArrowDown, X } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import DataCombobox from "@/components/ui/DataCombobox";
import { doctor_option, nurse_option } from "../lib/personOptions";
import { useNavigate, useLocation } from "react-router-dom";
import useAppointments from "../hooks/useAppointment.js";
import useAppointmentTypes from "../hooks/useAppointmentTypes";
import {
    confirmDelete,
    confirmCancelAppointment,
    confirmNoShow,
    confirmProceedWithoutNurse,
    showSuccess,
    showError
} from "@/lib/alerts";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { formatTime12h } from "@/lib/timeFormat";

// Una cita puede combinar varios procedimientos (procedure_id es un array). Estos 3
// helpers reemplazan los accesos de siempre a un único procedure_id.requires_doctor/
// requires_nurse/name: "requiere doctor" es true si ALGUNO de los procedimientos lo
// requiere (sin ninguno elegido, se asume que sí, mismo comportamiento de siempre);
// "requiere enfermera" igual, con ALGUNO alcanza.
const procRequiresDoctor = (appt) => {
    const procs = appt?.procedure_id || [];
    if (procs.length === 0) return true;
    return procs.some((p) => p.requires_doctor !== false);
};
const procRequiresNurse = (appt) => (appt?.procedure_id || []).some((p) => !!p.requires_nurse);
const procNames = (appt) => (appt?.procedure_id || []).map((p) => p.name).join(", ");

// Pantalla principal del módulo: lista de citas en tarjetas, con búsqueda,
// filtros, orden, paginación y acciones (ver, editar, cancelar, eliminar).
export default function AppointmentsGrid() {
    const navigate = useNavigate();
    const location = useLocation();
    const { hasPermission, userType } = useAuth();
    const canCreate = hasPermission("calendar.appointments", "create");
    const canUpdate = hasPermission("calendar.appointments", "update");
    const canDelete = hasPermission("calendar.appointments", "delete");
    // El doctor tiene su propio flujo dentro de Citas (aceptar y ver
    // las suyas), distinto del CRUD normal de admin o recepcionista.
    const isDoctor = userType === "doctor";
    // El admin tiene el mismo flujo de por aceptar con dos casos: acepta o
    // reagenda las citas agendadas con él (su doctor espejo) y asigna a un
    // doctor las solicitudes sin doctor definido. El backend no le lista
    // las solicitudes dirigidas a otro doctor.
    const isAdmin = userType === "admin";
    // Indica si el admin acepta la cita en vez de asignarla: solo cuando el
    // paciente ya eligió doctor, que en su listado siempre es él mismo.
    const admin_accepts = (cita) => isAdmin && Boolean(cita?.doctor_id);
    // Mismo criterio que isDoctor arriba, pero para citas de un procedimiento sin doctor
    // (requires_doctor false): ahí la enfermera acepta en vez del doctor.
    const isNurse = userType === "nurse";

    const {
        appointments,
        pagination,
        filters,
        isLoading,
        error,
        fetchAppointments,
        deleteAppointment,
        updateStatus,
        acceptAppointment,
        assignDoctor,
        acceptAppointmentAsNurse,
        assignNurse,
        updateFilters,
        goToPage
    } = useAppointments({ sortOrder: "desc" });

    // Texto del buscador, separado del filtro real. Se aplica solo con
    // el botón de buscar (o Enter), ver handleSearch más abajo.
    const [searchInput, setSearchInput] = useState("");

    const handleSearch = () => {
        updateFilters({ search: searchInput.trim() || undefined });
    };

    // Id de la cita a resaltar con borde azul, si se llegó aquí desde una
    // notificación puntual (ver action_url en patientPortalController.js:
    // "Nueva cita por aceptar" manda a esta pantalla con ?highlight=<id> en
    // vez del detalle de esa cita, que todavía no tiene doctor asignado).
    const highlightId = new URLSearchParams(location.search).get("highlight");

    // Sub pestaña del doctor: pending (por aceptar) o mine (resueltas).
    // El backend ya limita doctor_id al propio, aquí solo se controla
    // el status. Si se volvió desde el detalle de una cita (botón de
    // cerrar de AppointmentsFormCalendar.jsx), location.state.initialTab
    // trae la pestaña desde la que se abrió esa cita, para no perderla.
    const [doctorTab, setDoctorTab] = useState(location.state?.initialTab || "pending");
    // Misma idea para el admin: pending (por aceptar) o assigned
    // (citas asignadas). El admin ve todas, no solo las de un doctor
    // en particular.
    const [adminTab, setAdminTab] = useState(location.state?.initialTab || "pending");
    // Mismo criterio que doctorTab: pending (por aceptar) o mine (resueltas). El backend ya
    // limita nurse_id a la propia enfermera (o pending sin asignar de un procedimiento sin
    // doctor), aquí solo se controla el status.
    const [nurseTab, setNurseTab] = useState(location.state?.initialTab || "pending");
    const [appointmentToAccept, setAppointmentToAccept] = useState(null);
    const [appointmentToAssign, setAppointmentToAssign] = useState(null);
    const [pendingAppointmentDetails, setPendingAppointmentDetails] = useState(null);
    const [nurses, setNurses] = useState([]);
    const [selectedNurseId, setSelectedNurseId] = useState("");
    const [loadingNurses, setLoadingNurses] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState("");
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    // Los botones de confirmar Aceptar/Asignar solo se deshabilitaban por
    // !selectedNurseId/!selectedDoctorId, sin ningún estado de "enviando" — un doble
    // clic en red lenta podía disparar acceptAppointment/assignDoctor dos veces antes de
    // que la primera respuesta siquiera llegara.
    const [procesandoAccion, setProcesandoAccion] = useState(false);

    // Catálogo del filtro Doctor: solo doctores que ya tienen al menos
    // una cita registrada (no el catálogo completo), para que el
    // filtro nunca ofrezca una opción que de todos modos no
    // devolvería ningún resultado.
    const [doctorFilterOptions, setDoctorFilterOptions] = useState([]);
    // Catálogo del filtro Tipo de cita: el mismo catálogo global que
    // define el admin y que aparece en la leyenda del calendario.
    const { getAppointmentTypes } = useAppointmentTypes();
    const [appointmentTypeOptions, setAppointmentTypeOptions] = useState([]);

    useEffect(() => {
        apiClient("/appointments/doctors-with-appointments")
            .then((response) => setDoctorFilterOptions(Array.isArray(response) ? response : []))
            .catch(() => setDoctorFilterOptions([]));
        getAppointmentTypes()
            .then((types) => setAppointmentTypeOptions(Array.isArray(types) ? types : []))
            .catch(() => setAppointmentTypeOptions([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Estado combinado de la sub-pestaña activa (doctor, enfermera o admin), para
    // reutilizar la misma barra de pestañas y la misma lógica de filtros.
    const activeTab = isDoctor ? doctorTab : isNurse ? nurseTab : adminTab;
    const setActiveTab = isDoctor ? setDoctorTab : isNurse ? setNurseTab : setAdminTab;
    const secondTabValue = (isDoctor || isNurse) ? "mine" : "assigned";
    const secondTabLabel = (isDoctor || isNurse) ? "Mis citas" : "Citas asignadas";

    useEffect(() => {
        if (!isDoctor) return;
        updateFilters({
            status: doctorTab === "pending" ? "pending" : "scheduled,completed,cancelled,no_show,expired,needs_reschedule",
        });
    }, [isDoctor, doctorTab, updateFilters]);

    useEffect(() => {
        if (!isNurse) return;
        updateFilters({
            status: nurseTab === "pending" ? "pending" : "scheduled,completed,cancelled,no_show,expired,needs_reschedule",
        });
    }, [isNurse, nurseTab, updateFilters]);

    useEffect(() => {
        if (!isAdmin) return;
        updateFilters({
            status: adminTab === "pending" ? "pending" : "scheduled,completed,cancelled,no_show,expired,needs_reschedule",
        });
    }, [isAdmin, adminTab, updateFilters]);

    // Acepta una cita pendiente asignada al doctor. El backend
    // revalida el horario y puede rechazar con un mensaje claro si ya
    // no está libre. Tras aceptar, salta directo al Calendario ya en la
    // semana correcta y con esta cita seleccionada (resaltada en azul, ver
    // isSelected en ApptDot/ApptCard más abajo), para que el doctor la vea
    // agendada de una vez en vez de tener que ir a buscarla él mismo.
    const handleAceptar = async (appointment, nurseId, confirmNoNurse = false) => {
        if (procesandoAccion) return;
        setProcesandoAccion(true);
        try {
            await acceptAppointment(appointment._id, nurseId, confirmNoNurse);
            showSuccess("Cita aceptada correctamente");
            setAppointmentToAccept(null);
            setSelectedNurseId("");
            navigate("/calendar/appointments", {
                state: { initialView: "calendar", selectApptId: appointment._id, selectApptDate: appointment.date },
            });
        } catch (err) {
            showError(err.message || "No se pudo aceptar la cita");
        } finally {
            setProcesandoAccion(false);
        }
    };

    // Cuando el procedimiento requiere enfermera de apoyo pero no hay ninguna disponible
    // para este horario (nurses.length === 0 tras cargar), permite continuar igual con
    // confirmación explícita en vez de dejar el modal sin ninguna salida más que cancelar.
    const handleAceptarSinEnfermera = async (appointment) => {
        const confirmed = await confirmProceedWithoutNurse();
        if (!confirmed) return;
        handleAceptar(appointment, null, true);
    };

    // Mismo flujo de arriba, pero para cuando la enfermera acepta una cita de un
    // procedimiento sin doctor (ella es la proveedora principal, no hay enfermera de
    // apoyo que elegir aparte).
    const handleAceptarComoEnfermera = async (appointment) => {
        if (procesandoAccion) return;
        setProcesandoAccion(true);
        try {
            await acceptAppointmentAsNurse(appointment._id);
            showSuccess("Cita aceptada correctamente");
            navigate("/calendar/appointments", {
                state: { initialView: "calendar", selectApptId: appointment._id, selectApptDate: appointment.date },
            });
        } catch (err) {
            showError(err.message || "No se pudo aceptar la cita");
        } finally {
            setProcesandoAccion(false);
        }
    };

    // Query params con la fecha y hora exacta de la cita: el backend
    // solo devuelve enfermeras que tengan ese horario configurado
    // como disponible (ver nurseScheduleController.js). appointment_id
    // evita que la enfermera ya asignada a esta cita se filtre por
    // chocar contra sí misma.
    const nurseAvailabilityParams = (appointment) => ({
        date: new Date(appointment.date).toISOString().split("T")[0],
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        appointment_id: appointment._id,
    });

    const requestAccept = async (appointment) => {
        // Procedimiento sin doctor: la enfermera acepta directo, no hay enfermera de
        // apoyo que elegir aparte (ella misma es la proveedora principal).
        if (!procRequiresDoctor(appointment)) {
            return handleAceptarComoEnfermera(appointment);
        }
        if (!procRequiresNurse(appointment)) {
            return handleAceptar(appointment);
        }
        setAppointmentToAccept(appointment);
        setSelectedNurseId("");
        setLoadingNurses(true);
        try {
            const response = await apiClient("/appointments/nurses-for-acceptance", {
                params: nurseAvailabilityParams(appointment),
            });
            setNurses(Array.isArray(response) ? response : response.data || []);
        } catch (error) {
            showError(error.message || "No se pudieron cargar las enfermeras.");
            setAppointmentToAccept(null);
        } finally {
            setLoadingNurses(false);
        }
    };

    // Asigna una cita pendiente a un doctor elegido por el admin. El
    // backend revalida el horario para ese doctor igual que en la
    // aceptación normal.
    const handleAsignar = async (id, doctorId, nurseId, confirmNoNurse = false) => {
        if (procesandoAccion) return;
        setProcesandoAccion(true);
        try {
            await assignDoctor(id, doctorId, nurseId, confirmNoNurse);
            showSuccess("Cita asignada correctamente");
            setAppointmentToAssign(null);
            setSelectedDoctorId("");
            setSelectedNurseId("");
        } catch (err) {
            showError(err.message || "No se pudo asignar la cita");
        } finally {
            setProcesandoAccion(false);
        }
    };

    // Mismo caso que handleAceptarSinEnfermera, pero para cuando el admin asigna
    // directamente un doctor a una cita sin enfermera disponible.
    const handleAsignarSinEnfermera = async (id, doctorId) => {
        const confirmed = await confirmProceedWithoutNurse();
        if (!confirmed) return;
        handleAsignar(id, doctorId, null, true);
    };

    // Mismo flujo de arriba, pero para asignar directamente una enfermera como
    // proveedora principal (procedimiento sin doctor).
    const handleAsignarEnfermera = async (id, nurseId) => {
        if (procesandoAccion) return;
        setProcesandoAccion(true);
        try {
            await assignNurse(id, nurseId);
            showSuccess("Cita asignada correctamente");
            setAppointmentToAssign(null);
            setSelectedNurseId("");
        } catch (err) {
            showError(err.message || "No se pudo asignar la cita");
        } finally {
            setProcesandoAccion(false);
        }
    };

    // Abre el modal de asignación: carga el catálogo de doctores y, si el
    // procedimiento requiere enfermera, también el de enfermeras. Para un
    // procedimiento sin doctor, carga directamente las enfermeras libres en ese
    // horario en vez del catálogo de doctores.
    const requestAssign = async (appointment) => {
        setAppointmentToAssign(appointment);
        setSelectedDoctorId("");
        setSelectedNurseId("");

        if (!procRequiresDoctor(appointment)) {
            setLoadingNurses(true);
            try {
                const response = await apiClient("/appointments/nurses-for-acceptance", {
                    params: nurseAvailabilityParams(appointment),
                });
                setNurses(Array.isArray(response) ? response : response.data || []);
            } catch (error) {
                showError(error.message || "No se pudieron cargar las enfermeras.");
                setAppointmentToAssign(null);
            } finally {
                setLoadingNurses(false);
            }
            return;
        }

        setLoadingDoctors(true);
        try {
            // Catálogo liviano, no requiere el permiso Ver Doctores
            // (ver backend/src/routes/doctors/doctors.js).
            const response = await apiClient("/doctors/catalog");
            setDoctors(Array.isArray(response) ? response : response.data || []);
        } catch (error) {
            showError(error.message || "No se pudieron cargar los doctores.");
            setAppointmentToAssign(null);
            setLoadingDoctors(false);
            return;
        }
        setLoadingDoctors(false);

        if (procRequiresNurse(appointment)) {
            setLoadingNurses(true);
            try {
                const response = await apiClient("/appointments/nurses-for-acceptance", {
                    params: nurseAvailabilityParams(appointment),
                });
                setNurses(Array.isArray(response) ? response : response.data || []);
            } catch (error) {
                showError(error.message || "No se pudieron cargar las enfermeras.");
            } finally {
                setLoadingNurses(false);
            }
        }
    };

    // Indica si hay algún filtro activo, para ajustar el mensaje de
    // sin datos.
    const hasActiveFilters = Boolean(filters.search || filters.status || filters.appointment_type || filters.doctor_id);

    // Traducción de los status a texto legible. no_show, expired y
    // needs_reschedule los asigna el backend solo a una cita pending
    // vencida o no aceptada a tiempo (needs_reschedule: el paciente aún
    // puede reagendarla; expired es el estado legado equivalente).
    const statusTranslations = {
        pending: "Pendiente",
        scheduled: "Programada",
        completed: "Completada",
        cancelled: "Cancelada",
        no_show: "No se presentó",
        expired: "Vencida",
        needs_reschedule: "Por reagendar",
    }

    const emptyMessage = isDoctor
        ? (doctorTab === "pending" ? "No tienes citas pendientes por aceptar." : "No tienes citas programadas todavía.")
        : isNurse
            ? (nurseTab === "pending" ? "No tienes citas pendientes por aceptar." : "No tienes citas programadas todavía.")
            : isAdmin
                ? (adminTab === "pending" ? "No hay citas pendientes por aceptar o asignar." : "No hay citas asignadas todavía.")
                : (hasActiveFilters ? "No se encontraron citas con los filtros aplicados." : "No hay citas registradas en este momento.");

    // Elimina la cita por completo. Pide confirmación por ser
    // irreversible.
    const handleEliminar = async (id) => {
        const confirmed = await confirmDelete({
            title: "¿Eliminar esta cita?",
            text: "Esta acción es irreversible y la información no se podrá recuperar.",
        });

        if (!confirmed) return;

        try {
            await deleteAppointment(id);

            showSuccess(
                "Eliminada",
                "La cita fue eliminada correctamente"
            );
        } catch (error) {
            showError(
                "Error",
                "No se pudo eliminar la cita"
            );
        }
    };

    // Cambia el status a cancelled sin borrar el registro.
    const handleCancelar = async (id) => {
        const confirmed = await confirmCancelAppointment();

        if (!confirmed) return;

        try {
            await updateStatus(id, "cancelled");

            showSuccess("La cita fue cancelada correctamente");
        } catch (error) {
            showError("No se pudo cancelar la cita");
        }
    };

    // El paciente no llegó a una cita Programada. No borra el registro, solo cambia el
    // status (igual que handleCancelar); una vez marcada, ya no se puede continuar una
    // consulta desde ella (ver AppointmentTable.jsx).
    const handleNoShow = async (id) => {
        const confirmed = await confirmNoShow();

        if (!confirmed) return;

        try {
            await updateStatus(id, "no_show");

            showSuccess("La cita quedó marcada como no presentada");
        } catch (error) {
            showError("No se pudo marcar la cita como no presentada");
        }
    };

    // Pantalla de carga
    if (isLoading) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
                <Loader2 className="h-10 w-10 text-[#0b66d6] animate-spin mb-4" />
                <p className="text-sm font-medium text-slate-500">
                    Cargando citas médicas...
                </p>
            </div>
        );
    }

    // Pantalla de error
    if (error) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md">
                    <p className="text-red-500 font-semibold mb-4">
                        {error}
                    </p>

                    <Button
                        onClick={fetchAppointments}
                        className="bg-[#0b66d6] text-white hover:bg-blue-700 rounded-xl"
                    >
                        Reintentar conexión
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full p-8 bg-[#f8fafc] min-h-screen">
            {/* Encabezado */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Citas
                    </h1>

                    <p className="text-sm text-slate-500 mt-1">
                        Gestión de citas médicas en tiempo real
                    </p>
                </div>

                {canCreate && (
                    <Button
                        onClick={() => navigate("/calendar/appointments/new", { state: { fromView: "citas" } })}
                        className="bg-[#0b66d6] hover:bg-blue-700 text-white px-5 py-5 rounded-xl flex items-center gap-2 font-semibold shadow-md shadow-blue-100"
                    >
                        <Plus className="h-5 w-5" />
                        Nueva cita
                    </Button>
                )}
            </div>

            {/* Sub pestañas del doctor, la enfermera y del admin: separan lo que aún hay
                que aceptar o asignar de lo que ya está resuelto. El backend filtra
                doctor_id/nurse_id al propio para el doctor y la enfermera, el admin ve todas. */}
            {(isDoctor || isNurse || isAdmin) && (
                <div className="border-b border-slate-100 flex gap-6 text-sm font-medium mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab("pending")}
                        className={`pb-3 transition-all ${activeTab === "pending"
                            ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                            : "text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        Por aceptar
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab(secondTabValue)}
                        className={`pb-3 transition-all ${activeTab === secondTabValue
                            ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                            : "text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        {secondTabLabel}
                    </button>
                </div>
            )}

            {/* Búsqueda, filtros de estado y tipo, y orden por fecha. Todo se
                resuelve en el backend vía updateFilters (query params). */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-3 md:items-center">
                {/* Búsqueda por paciente, doctor o descripción. Se dispara solo al
                    hacer clic en el botón (o presionar Enter). El botón vive dentro
                    del propio input (a la derecha), la clase pr-10 reserva ese
                    espacio para que el texto escrito nunca llegue a tocarlo. Un
                    <input> nativo ya hace scroll del texto hacia la izquierda por su
                    cuenta cuando se pasa de su ancho visible. */}
                <div className="flex-1 min-w-[220px] flex flex-col">
                    <div className="relative">
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                            placeholder="Buscar por paciente, doctor o descripción..."
                            maxLength={100}
                            className="pr-10 border-slate-200 focus-visible:ring-[#0b66d6] rounded-xl h-10"
                        />
                        <button
                            type="button"
                            onClick={handleSearch}
                            aria-label="Buscar"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0b66d6] hover:bg-slate-100 transition-colors"
                        >
                            <Search className="h-4 w-4" />
                        </button>
                    </div>
                    <span className="self-end text-[11px] text-slate-400 mt-0.5">
                        {searchInput.length}/100
                    </span>
                </div>

                {/* Filtro por estado (lo controla la sub pestaña para doctor, enfermera o admin). */}
                {!isDoctor && !isNurse && !isAdmin && (
                    <Select
                        value={filters.status || "all"}
                        onValueChange={(value) => updateFilters({ status: value === "all" ? undefined : value })}
                    >
                        <SelectTrigger className="w-full md:w-44 border-slate-200 rounded-xl h-10">
                            <SelectValue>{statusTranslations[filters.status] || "Todos los estados"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="scheduled">Programada</SelectItem>
                            <SelectItem value="completed">Completada</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                            <SelectItem value="no_show">No se presentó</SelectItem>
                            <SelectItem value="expired">Vencida</SelectItem>
                            <SelectItem value="needs_reschedule">Por reagendar</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                {/* Filtro por doctor, solo lista doctores que ya tienen alguna cita.
                    Un doctor o enfermera viendo su propio listado no necesita
                    filtrarse a sí mismo. */}
                {!isDoctor && !isNurse && (
                    <DataCombobox
                        value={filters.doctor_id || "all"}
                        onChange={(value) => updateFilters({ doctor_id: !value || value === "all" ? undefined : value })}
                        options={[
                            { value: "all", label: "Todos los doctores" },
                            ...doctorFilterOptions.map((d) => doctor_option(d)),
                        ]}
                        placeholder="Todos los doctores"
                        labelClassName="hidden"
                        className="w-full md:w-48"
                        triggerClassName="h-10"
                    />
                )}

                {/* Filtro por tipo de cita, el mismo catálogo global que define el
                    admin y que aparece en la leyenda del calendario. Filtra por
                    appointment_type (el campo de catálogo), no por type (que solo
                    distingue Consulta Médica General de Procedimiento). */}
                <DataCombobox
                    value={filters.appointment_type || "all"}
                    onChange={(value) => updateFilters({ appointment_type: !value || value === "all" ? undefined : value })}
                    options={[
                        { value: "all", label: "Todos los tipos" },
                        ...appointmentTypeOptions.map((t) => ({ value: t.name, label: t.name })),
                    ]}
                    placeholder="Todos los tipos"
                    labelClassName="hidden"
                    className="w-full md:w-56"
                    triggerClassName="h-10"
                />

                {/* Alterna el orden por fecha entre ascendente y descendente. */}
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateFilters({ sortOrder: filters.sortOrder === "desc" ? "asc" : "desc" })}
                    className="h-10 border-slate-200 rounded-xl text-slate-600 flex items-center gap-2 whitespace-nowrap"
                >
                    {filters.sortOrder === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    Fecha {filters.sortOrder === "desc" ? "(recientes primero)" : "(antiguas primero)"}
                </Button>
            </div>

            {/* Sin datos */}
            {appointments.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">
                        {emptyMessage}
                    </p>
                </div>
            ) : (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {appointments.map((cita) => (
                            <Card
                                key={cita._id}
                                className={`bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col h-full ${
                                    cita._id === highlightId
                                        ? "border-2 border-blue-500 ring-2 ring-blue-200"
                                        : "border border-slate-100"
                                }`}
                            >
                                <CardHeader className="p-5 pb-3 flex flex-row items-center gap-2 space-y-0">
                                    {/* Badge de estado, el color depende del status. */}
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cita.status === "completed"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : cita.status === "cancelled"
                                                ? "bg-rose-50 text-rose-600"
                                                : cita.status === "no_show"
                                                    ? "bg-slate-100 text-slate-500"
                                                    : cita.status === "expired" || cita.status === "needs_reschedule"
                                                        ? "bg-orange-50 text-orange-600"
                                                        : cita.status === "scheduled"
                                                            ? "bg-blue-50 text-blue-600"
                                                            : "bg-amber-50 text-amber-600"
                                            }`}
                                    >
                                        {statusTranslations[cita.status] ||
                                            cita.status ||
                                            "Programada"}
                                    </Badge>

                                    {/* Fecha */}
                                    <Badge
                                        variant="secondary"
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-50 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1"
                                    >
                                        {cita.fecha ||
                                            new Date(cita.date).toLocaleDateString()}
                                    </Badge>
                                </CardHeader>

                                <CardContent className="px-5 pt-0 pb-4 text-sm text-slate-600 space-y-2 flex-1">
                                    {/* Nombre del paciente. */}
                                    <h3 className="text-base font-bold text-slate-900 mb-3">
                                        Paciente:{" "}
                                        {cita.patient_id
                                            ? `${cita.patient_id.name} ${cita.patient_id.last_name}`
                                            : "Paciente no asignado"}
                                    </h3>

                                    {/* Nombre del procedimiento si aplica, si no, el tipo general. */}
                                    <p>
                                        <span className="text-slate-400">
                                            Tipo de procedimiento:
                                        </span>{" "}
                                        {procNames(cita) || cita.type}
                                    </p>

                                    <p>
                                        <span className="text-slate-400">
                                            Hora:
                                        </span>{" "}
                                        {formatTime12h(cita.start_time)} - {formatTime12h(cita.end_time)}
                                    </p>

                                    <p>
                                        <span className="text-slate-400">
                                            Descripción:
                                        </span>{" "}
                                        {cita.description ||
                                            cita.notes ||
                                            "N/A"}
                                    </p>

                                    <p>
                                        <span className="text-slate-400">
                                            Total:
                                        </span>{" "}
                                        {cita.total
                                            ? `$${cita.total}`
                                            : "—"}
                                        {/* Cita agendada desde el portal público pagando el anticipo en línea:
                                            se muestra cuánto ya se cobró aparte del total, para que el
                                            personal no vuelva a cobrarlo completo el día de la cita. */}
                                        {cita.deposit_paid && (
                                            <span className="text-emerald-600 font-semibold">
                                                {" "}— ${Number(cita.deposit_amount).toFixed(2)} pagado por anticipo
                                            </span>
                                        )}
                                    </p>

                                    {cita.deposit_paid && (
                                        <p>
                                            <span className="text-slate-400">
                                                Nota:
                                            </span>{" "}
                                            Ya se pagó ${Number(cita.deposit_amount).toFixed(2)} de anticipo en línea. Resta ${Number((cita.total || 0) - cita.deposit_amount).toFixed(2)} por cobrar en recepción.
                                        </p>
                                    )}

                                    {/* Motivo de cancelación, solo si aplica. */}
                                    {cita.status === "cancelled" && (
                                        <p>
                                            <span className="text-slate-400">
                                                Motivo de cancelación:
                                            </span>{" "}
                                            {cita.cancellation_reason ||
                                                "No se especificó un motivo."}
                                        </p>
                                    )}
                                </CardContent>

                                <CardFooter className="mt-auto p-4 bg-slate-50/50 flex items-center justify-between">
                                    {/* Doctor asignado */}
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7 border border-slate-200">
                                            <AvatarImage
                                                src={
                                                    cita.doctor_id?.img_url ||
                                                    "https://res.cloudinary.com/dgpreaeg9/image/upload/images_gb0wco.png"
                                                }
                                                alt={
                                                    cita.doctor_id
                                                        ? `${cita.doctor_id.name} ${cita.doctor_id.last_name}`
                                                        : "Doctor"
                                                }
                                            />

                                            <AvatarFallback>
                                                DR
                                            </AvatarFallback>
                                        </Avatar>

                                        <span className="text-xs font-semibold text-slate-700">
                                            {cita.doctor_id
                                                ? `Dr. ${cita.doctor_id.name} ${cita.doctor_id.last_name || ""}`
                                                : cita.nurse_id && !procRequiresDoctor(cita)
                                                    ? `${cita.nurse_id.name} ${cita.nurse_id.last_name || ""} (enfermera)`
                                                    : !procRequiresDoctor(cita)
                                                        ? "Enfermera no asignada"
                                                        : "Doctor no asignado"}
                                        </span>
                                    </div>

                                    {/* Acciones: los botones de Aceptar o Asignar reemplazan el resto
                                        mientras esté pendiente. Si no, se muestran eliminar, editar o
                                        cancelar según permisos. Ver siempre está disponible. */}
                                    <div className="flex items-center gap-1">
                                        {(isDoctor || (isNurse && !procRequiresDoctor(cita)) || admin_accepts(cita)) && cita.status === "pending" ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-semibold"
                                                onClick={() => requestAccept(cita)}
                                            >
                                                Aceptar
                                            </Button>
                                        ) : isAdmin && cita.status === "pending" ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-semibold"
                                                onClick={() => requestAssign(cita)}
                                            >
                                                Asignar
                                            </Button>
                                        ) : (
                                            <>
                                                {/* El doctor nunca elimina citas, sin importar el permiso. */}
                                                {canDelete && !isDoctor && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                        onClick={() =>
                                                            handleEliminar(cita._id)
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* Abre el formulario en modo edición (editMode: true). fromTab
                                                    recuerda desde qué sub pestaña (Por aceptar, Mis citas o Citas
                                                    asignadas) se abrió, para que el botón de cerrar del formulario
                                                    pueda regresar exactamente ahí. En "Mis citas" del doctor se
                                                    oculta: el botón de visualizar ya lleva a una pantalla que
                                                    incluye su propio botón de editar, así que este sería
                                                    redundante ahí. Reagendar aplica a Programada, Por reagendar y
                                                    Vencida (pending tiene su propio botón más abajo, porque acá ese
                                                    espacio ya lo ocupa Aceptar/Asignar). */}
                                                {canUpdate && !((isDoctor || isNurse) && activeTab === "mine") && ["scheduled", "needs_reschedule", "expired"].includes(cita.status) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                        onClick={() =>
                                                            navigate(
                                                                `/calendar/appointments/${cita._id}`,
                                                                {
                                                                    state: {
                                                                        editMode: true,
                                                                        fromView: "citas",
                                                                        fromTab: (isDoctor || isNurse || isAdmin) ? activeTab : undefined,
                                                                    }
                                                                }
                                                            )
                                                        }
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* Solo visible si la cita todavía se puede cancelar. */}
                                                {canUpdate && cita.status !== "cancelled" && cita.status !== "completed" && cita.status !== "no_show" && cita.status !== "expired" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={() =>
                                                            handleCancelar(cita._id)
                                                        }
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* Solo aplica a una cita Programada, mismo criterio que Reagendar. */}
                                                {canUpdate && cita.status === "scheduled" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                                        onClick={() =>
                                                            handleNoShow(cita._id)
                                                        }
                                                    >
                                                        <UserX className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {/* Reagendar una cita pendiente (todavía sin aceptar): abre el mismo
                                            formulario en modo edición que ya usa "Reagendar" para una cita
                                            Programada (ver el botón de más arriba y AppointmentsFormCalendar.jsx),
                                            revalidando disponibilidad igual que al aceptar. Se muestra junto al
                                            botón de Ver en vez de dentro del bloque de arriba porque para
                                            "pending" ese bloque ya está ocupado por Aceptar/Asignar. */}
                                        {canUpdate && cita.status === "pending" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                onClick={() =>
                                                    navigate(
                                                        `/calendar/appointments/${cita._id}`,
                                                        {
                                                            state: {
                                                                editMode: true,
                                                                fromView: "citas",
                                                                fromTab: (isDoctor || isNurse || isAdmin) ? activeTab : undefined,
                                                            }
                                                        }
                                                    )
                                                }
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {/* Abre el formulario en modo de solo lectura. fromTab: ver nota en el botón de editar. */}
                                        <Button
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                                            onClick={() => {
                                                if ((isDoctor || isNurse || isAdmin) && cita.status === "pending") {
                                                    setPendingAppointmentDetails(cita);
                                                    return;
                                                }
                                                navigate(`/calendar/appointments/${cita._id}`, {
                                                    state: {
                                                        fromView: "citas",
                                                        fromTab: (isDoctor || isNurse || isAdmin) ? activeTab : undefined,
                                                    },
                                                });
                                            }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                    {/* Paginación: goToPage actualiza el filtro page y dispara el refetch. */}
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <Button
                            variant="outline"
                            disabled={pagination.page === 1}
                            onClick={() => goToPage(pagination.page - 1)}
                        >
                            Anterior
                        </Button>

                        <span className="text-sm text-slate-500">
                            Página {pagination.page} de {pagination.totalPages}
                        </span>

                        <Button
                            variant="outline"
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => goToPage(pagination.page + 1)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div >
            )}
            {appointmentToAccept && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold text-slate-900">Asignar enfermera</h2>
                        <p className="mt-1 text-sm text-slate-500">Este procedimiento requiere enfermera. Elige quién apoyará la cita antes de aceptarla.</p>
                        <DataCombobox
                            value={selectedNurseId}
                            onChange={setSelectedNurseId}
                            options={nurses.map((nurse) => nurse_option(nurse))}
                            placeholder={loadingNurses ? "Cargando enfermeras…" : "Selecciona una enfermera"}
                            disabled={loadingNurses}
                            labelClassName="hidden"
                            className="mt-5"
                        />
                        {/* Sin enfermeras disponibles para este horario: en vez de dejar el modal
                            sin ninguna salida más que Cancelar, se puede reagendar (cerrando este
                            modal y editando la cita a otro horario) o continuar igual con
                            confirmación explícita (ver confirmProceedWithoutNurse en alerts.jsx). */}
                        {!loadingNurses && nurses.length === 0 && (
                            <p className="mt-2 text-xs text-amber-600">
                                No hay enfermeras disponibles para este horario. Puedes reagendar la cita a un horario donde sí haya, o continuar sin asignar una.
                            </p>
                        )}
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setAppointmentToAccept(null)}>Cancelar</Button>
                            {!loadingNurses && nurses.length === 0 ? (
                                <Button onClick={() => handleAceptarSinEnfermera(appointmentToAccept)} className="bg-amber-500 hover:bg-amber-600">Continuar sin enfermera</Button>
                            ) : (
                                <Button disabled={!selectedNurseId || loadingNurses || procesandoAccion} onClick={() => handleAceptar(appointmentToAccept, selectedNurseId)} className="bg-emerald-600 hover:bg-emerald-700">Aceptar cita</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {appointmentToAssign && !procRequiresDoctor(appointmentToAssign) ? (
                // Procedimiento sin doctor: se asigna directo una enfermera como
                // proveedora principal, no hay doctor que elegir.
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold text-slate-900">Asignar a una enfermera</h2>
                        <p className="mt-1 text-sm text-slate-500">Este procedimiento no requiere doctor. Elige la enfermera que atenderá esta cita. Se le notificará junto con el paciente.</p>
                        <DataCombobox
                            value={selectedNurseId}
                            onChange={setSelectedNurseId}
                            options={nurses.map((nurse) => nurse_option(nurse))}
                            placeholder={loadingNurses ? "Cargando enfermeras…" : "Selecciona una enfermera"}
                            disabled={loadingNurses}
                            labelClassName="hidden"
                            className="mt-5"
                        />
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setAppointmentToAssign(null)}>Cancelar</Button>
                            <Button
                                disabled={!selectedNurseId || loadingNurses || procesandoAccion}
                                onClick={() => handleAsignarEnfermera(appointmentToAssign._id, selectedNurseId)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                Asignar cita
                            </Button>
                        </div>
                    </div>
                </div>
            ) : appointmentToAssign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold text-slate-900">Asignar a un doctor</h2>
                        <p className="mt-1 text-sm text-slate-500">Elige el doctor que atenderá esta cita. Se le notificará junto con el paciente.</p>
                        <DataCombobox
                            value={selectedDoctorId}
                            onChange={setSelectedDoctorId}
                            options={doctors.map((doctor) => doctor_option(doctor, { with_specialty: true }))}
                            placeholder={loadingDoctors ? "Cargando doctores…" : "Selecciona un doctor"}
                            disabled={loadingDoctors}
                            labelClassName="hidden"
                            className="mt-5"
                        />
                        {procRequiresNurse(appointmentToAssign) && (
                            <>
                                <p className="mt-4 text-sm text-slate-500">Este procedimiento requiere enfermera.</p>
                                <DataCombobox
                                    value={selectedNurseId}
                                    onChange={setSelectedNurseId}
                                    options={nurses.map((nurse) => nurse_option(nurse))}
                                    placeholder={loadingNurses ? "Cargando enfermeras…" : "Selecciona una enfermera"}
                                    disabled={loadingNurses}
                                    labelClassName="hidden"
                                    className="mt-2"
                                />
                                {/* Igual que en el modal de aceptación: sin enfermeras disponibles,
                                    se puede reagendar (Cancelar y editar la cita) o continuar
                                    igual con confirmación explícita. */}
                                {!loadingNurses && nurses.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-600">
                                        No hay enfermeras disponibles para este horario. Puedes reagendar la cita a un horario donde sí haya, o continuar sin asignar una.
                                    </p>
                                )}
                            </>
                        )}
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setAppointmentToAssign(null)}>Cancelar</Button>
                            {procRequiresNurse(appointmentToAssign) && !loadingNurses && nurses.length === 0 ? (
                                <Button
                                    disabled={!selectedDoctorId || loadingDoctors || procesandoAccion}
                                    onClick={() => handleAsignarSinEnfermera(appointmentToAssign._id, selectedDoctorId)}
                                    className="bg-amber-500 hover:bg-amber-600"
                                >
                                    Continuar sin enfermera
                                </Button>
                            ) : (
                                <Button
                                    disabled={!selectedDoctorId || loadingDoctors || procesandoAccion || (procRequiresNurse(appointmentToAssign) && !selectedNurseId)}
                                    onClick={() => handleAsignar(appointmentToAssign._id, selectedDoctorId, selectedNurseId || null)}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Asignar cita
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {pendingAppointmentDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Solicitud pendiente</p>
                                <h2 className="mt-1 text-lg font-bold text-slate-900">Detalle de la cita</h2>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setPendingAppointmentDetails(null)} aria-label="Cerrar detalle">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                            <p><span className="font-semibold text-slate-500">Paciente: </span>{pendingAppointmentDetails.patient_id ? `${pendingAppointmentDetails.patient_id.name} ${pendingAppointmentDetails.patient_id.last_name}` : "—"}</p>
                            <p><span className="font-semibold text-slate-500">Servicio: </span>{procNames(pendingAppointmentDetails) || pendingAppointmentDetails.type}</p>
                            <p><span className="font-semibold text-slate-500">Fecha: </span>{new Date(pendingAppointmentDetails.date).toLocaleDateString()}</p>
                            <p><span className="font-semibold text-slate-500">Horario: </span>{formatTime12h(pendingAppointmentDetails.start_time)} - {formatTime12h(pendingAppointmentDetails.end_time)}</p>
                            <p><span className="font-semibold text-slate-500">Duración: </span>{pendingAppointmentDetails.duration_minutes || 30} min</p>
                            <p>
                                <span className="font-semibold text-slate-500">Total: </span>
                                {pendingAppointmentDetails.total ? `$${pendingAppointmentDetails.total}` : "—"}
                                {pendingAppointmentDetails.deposit_paid && (
                                    <span className="text-emerald-600 font-semibold">
                                        {" "}— ${Number(pendingAppointmentDetails.deposit_amount).toFixed(2)} pagado por anticipo
                                    </span>
                                )}
                            </p>
                            {pendingAppointmentDetails.deposit_paid && (
                                <p>
                                    <span className="font-semibold text-slate-500">Nota: </span>
                                    Ya se pagó ${Number(pendingAppointmentDetails.deposit_amount).toFixed(2)} de anticipo en línea. Resta ${Number((pendingAppointmentDetails.total || 0) - pendingAppointmentDetails.deposit_amount).toFixed(2)} por cobrar en recepción.
                                </p>
                            )}
                            <p><span className="font-semibold text-slate-500">Notas: </span>{pendingAppointmentDetails.description || "Sin notas"}</p>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setPendingAppointmentDetails(null)}>Cerrar</Button>
                            <Button
                                onClick={() => {
                                    const appointment = pendingAppointmentDetails;
                                    setPendingAppointmentDetails(null);
                                    if (isAdmin && !admin_accepts(appointment)) requestAssign(appointment);
                                    else requestAccept(appointment);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isAdmin && !admin_accepts(pendingAppointmentDetails) ? "Asignar cita" : "Aceptar cita"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
