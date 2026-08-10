import React, { useState, useEffect } from "react";
import { Edit, Eye, Trash2, Ban, Plus, Loader2, Search, ArrowUp, ArrowDown, X } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import useAppointments from "../hooks/useAppointment.js";
import {
    confirmDelete,
    confirmCancelAppointment,
    showSuccess,
    showError
} from "@/lib/alerts";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";

// Pantalla principal del módulo: lista de citas en tarjetas, con búsqueda,
// filtros, orden, paginación y acciones (ver, editar, cancelar, eliminar).
export default function AppointmentsGrid() {
    const navigate = useNavigate();
    const { hasPermission, userType } = useAuth();
    const canCreate = hasPermission("calendar.appointments", "create");
    const canUpdate = hasPermission("calendar.appointments", "update");
    const canDelete = hasPermission("calendar.appointments", "delete");
    // El doctor tiene su propio flujo dentro de "Citas" (aceptar/ver las
    // suyas), distinto del CRUD normal de admin/recepcionista.
    const isDoctor = userType === "doctor";
    // El admin tiene el mismo flujo de "por aceptar", pero en vez de
    // aceptar la cita él mismo, la asigna a un doctor.
    const isAdmin = userType === "admin";

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
        updateFilters,
        goToPage
    } = useAppointments({ sortOrder: "desc" });

    // Texto del buscador, separado del filtro real: ya no se dispara solo al escribir, solo con
    // el botón de buscar (o Enter) — ver handleSearch más abajo.
    const [searchInput, setSearchInput] = useState("");

    const handleSearch = () => {
        updateFilters({ search: searchInput.trim() || undefined });
    };

    // Sub-pestaña del doctor: "pending" (por aceptar) o "mine" (resueltas);
    // el backend ya limita doctor_id al propio, aquí solo se controla el status.
    const [doctorTab, setDoctorTab] = useState("pending");
    // Misma idea para el admin: "pending" (por aceptar) o "assigned" (citas
    // asignadas). El admin ve todas, no solo las de un doctor en particular.
    const [adminTab, setAdminTab] = useState("pending");
    const [appointmentToAccept, setAppointmentToAccept] = useState(null);
    const [appointmentToAssign, setAppointmentToAssign] = useState(null);
    const [pendingAppointmentDetails, setPendingAppointmentDetails] = useState(null);
    const [nurses, setNurses] = useState([]);
    const [selectedNurseId, setSelectedNurseId] = useState("");
    const [loadingNurses, setLoadingNurses] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState("");
    const [loadingDoctors, setLoadingDoctors] = useState(false);

    // Estado combinado de la sub-pestaña activa (doctor o admin), para
    // reutilizar la misma barra de pestañas y la misma lógica de filtros.
    const activeTab = isDoctor ? doctorTab : adminTab;
    const setActiveTab = isDoctor ? setDoctorTab : setAdminTab;
    const secondTabValue = isDoctor ? "mine" : "assigned";
    const secondTabLabel = isDoctor ? "Mis citas" : "Citas asignadas";

    useEffect(() => {
        if (!isDoctor) return;
        updateFilters({
            status: doctorTab === "pending" ? "pending" : "scheduled,completed,cancelled,no_show,expired",
        });
    }, [isDoctor, doctorTab, updateFilters]);

    useEffect(() => {
        if (!isAdmin) return;
        updateFilters({
            status: adminTab === "pending" ? "pending" : "scheduled,completed,cancelled,no_show,expired",
        });
    }, [isAdmin, adminTab, updateFilters]);

    // Acepta una cita pendiente asignada al doctor; el backend revalida el
    // horario y puede rechazar con un mensaje claro si ya no está libre.
    const handleAceptar = async (id, nurseId) => {
        try {
            await acceptAppointment(id, nurseId);
            showSuccess("Cita aceptada correctamente");
            setAppointmentToAccept(null);
            setSelectedNurseId("");
        } catch (err) {
            showError(err.message || "No se pudo aceptar la cita");
        }
    };

    // Query params con la fecha/hora exacta de la cita: el backend solo devuelve enfermeras
    // que tengan ese horario configurado como disponible (ver nurseScheduleController.js).
    // appointment_id evita que la enfermera ya asignada a ESTA cita se filtre por "chocar"
    // contra sí misma.
    const nurseAvailabilityParams = (appointment) => ({
        date: new Date(appointment.date).toISOString().split("T")[0],
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        appointment_id: appointment._id,
    });

    const requestAccept = async (appointment) => {
        if (!appointment.procedure_id?.requires_nurse) {
            return handleAceptar(appointment._id);
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

    // Asigna una cita pendiente a un doctor elegido por el admin; el backend
    // revalida el horario para ese doctor igual que en la aceptación normal.
    const handleAsignar = async (id, doctorId, nurseId) => {
        try {
            await assignDoctor(id, doctorId, nurseId);
            showSuccess("Cita asignada correctamente");
            setAppointmentToAssign(null);
            setSelectedDoctorId("");
            setSelectedNurseId("");
        } catch (err) {
            showError(err.message || "No se pudo asignar la cita");
        }
    };

    // Abre el modal de asignación: carga el catálogo de doctores y, si el
    // procedimiento requiere enfermera, también el de enfermeras.
    const requestAssign = async (appointment) => {
        setAppointmentToAssign(appointment);
        setSelectedDoctorId("");
        setSelectedNurseId("");
        setLoadingDoctors(true);
        try {
            // Catálogo liviano — no requiere el permiso "Ver Doctores" (ver
            // backend/src/routes/doctors/doctors.js).
            const response = await apiClient("/doctors/catalog");
            setDoctors(Array.isArray(response) ? response : response.data || []);
        } catch (error) {
            showError(error.message || "No se pudieron cargar los doctores.");
            setAppointmentToAssign(null);
            setLoadingDoctors(false);
            return;
        }
        setLoadingDoctors(false);

        if (appointment.procedure_id?.requires_nurse) {
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

    // Indica si hay algún filtro activo, para ajustar el mensaje de "sin datos".
    const hasActiveFilters = Boolean(filters.search || filters.status || filters.type);

    // Traducción de los status a texto legible; "no_show" y "expired" los
    // asigna el backend solo a una "pending" vencida o no aceptada a tiempo.
    const statusTranslations = {
        pending: "Pendiente",
        scheduled: "Programada",
        completed: "Completada",
        cancelled: "Cancelada",
        no_show: "No se presentó",
        expired: "Vencida",
    }

    const emptyMessage = isDoctor
        ? (doctorTab === "pending" ? "No tienes citas pendientes por aceptar." : "No tienes citas programadas todavía.")
        : isAdmin
            ? (adminTab === "pending" ? "No hay citas pendientes por asignar." : "No hay citas asignadas todavía.")
            : (hasActiveFilters ? "No se encontraron citas con los filtros aplicados." : "No hay citas registradas en este momento.");

    // Elimina la cita por completo; pide confirmación por ser irreversible.
    const handleEliminar = async (id) => {
        const confirmed = await confirmDelete();

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

    // Cambia el status a "cancelled" sin borrar el registro.
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
                        onClick={() => navigate("/calendar/appointments/new")}
                        className="bg-[#0b66d6] hover:bg-blue-700 text-white px-5 py-5 rounded-xl flex items-center gap-2 font-semibold shadow-md shadow-blue-100"
                    >
                        <Plus className="h-5 w-5" />
                        Nueva Cita
                    </Button>
                )}
            </div>

            {/* Sub-pestañas del doctor y del admin: separan lo que aún hay
                que aceptar/asignar de lo que ya está resuelto. El backend
                filtra doctor_id al propio para el doctor; el admin ve todas. */}
            {(isDoctor || isAdmin) && (
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

            {/* Búsqueda, filtros de estado/tipo y orden por fecha. Todo se
                resuelve en el backend vía updateFilters (query params). */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-3 md:items-center">
                {/* Búsqueda por paciente, doctor o descripción — ya no se dispara al escribir,
                    solo al hacer clic en el botón (o presionar Enter). El botón vive dentro del
                    propio input (a la derecha); "pr-10" le reserva ese espacio para que el texto
                    escrito nunca llegue a tocarlo — un <input> nativo ya hace scroll del texto
                    hacia la izquierda por su cuenta cuando se pasa de su ancho visible/relleno. */}
                <div className="relative flex-1 min-w-[220px]">
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

                {/* Filtro por estado (lo controla la sub-pestaña para doctor/admin). */}
                {!isDoctor && !isAdmin && (
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
                        </SelectContent>
                    </Select>
                )}

                {/* Filtro por tipo de procedimiento. */}
                <Select
                    value={filters.type || "all"}
                    onValueChange={(value) => updateFilters({ type: value === "all" ? undefined : value })}
                >
                    <SelectTrigger className="w-full md:w-56 border-slate-200 rounded-xl h-10">
                        <SelectValue>{filters.type || "Todos los tipos"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="Consulta Médica General">Consulta Médica General</SelectItem>
                        <SelectItem value="Procedimiento">Procedimiento</SelectItem>
                    </SelectContent>
                </Select>

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
                                className="bg-white border border-slate-100 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
                            >
                                <CardHeader className="p-5 pb-3 flex flex-row items-center gap-2 space-y-0">
                                    {/* Badge de estado; el color depende del status. */}
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cita.status === "completed"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : cita.status === "cancelled"
                                                ? "bg-rose-50 text-rose-600"
                                                : cita.status === "no_show"
                                                    ? "bg-slate-100 text-slate-500"
                                                    : cita.status === "expired"
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

                                    {/* Nombre del procedimiento si aplica; si no, el tipo general. */}
                                    <p>
                                        <span className="text-slate-400">
                                            Tipo de procedimiento:
                                        </span>{" "}
                                        {cita.procedure_id?.name || cita.type}
                                    </p>

                                    <p>
                                        <span className="text-slate-400">
                                            Hora:
                                        </span>{" "}
                                        {cita.start_time} - {cita.end_time}
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
                                            : "$15"}
                                    </p>

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
                                                : "Doctor no asignado"}
                                        </span>
                                    </div>

                                    {/* Acciones: "Aceptar"/"Asignar" reemplaza el resto mientras esté pendiente;
                                        si no, eliminar/editar/cancelar según permisos. Ver siempre está disponible. */}
                                    <div className="flex items-center gap-1">
                                        {isDoctor && cita.status === "pending" ? (
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

                                                {/* Abre el formulario en modo edición (editMode: true). */}
                                                {canUpdate && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                        onClick={() =>
                                                            navigate(
                                                                `/calendar/appointments/${cita._id}`,
                                                                {
                                                                    state: {
                                                                        editMode: true
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
                                            </>
                                        )}

                                        {/* Abre el formulario en modo solo-lectura. */}
                                        <Button
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                                            onClick={() => {
                                                if ((isDoctor || isAdmin) && cita.status === "pending") {
                                                    setPendingAppointmentDetails(cita);
                                                    return;
                                                }
                                                navigate(`/calendar/appointments/${cita._id}`);
                                            }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                    {/* Paginación: goToPage actualiza el filtro "page" y dispara el refetch. */}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-slate-900">Asignar enfermera</h2>
                        <p className="mt-1 text-sm text-slate-500">Este procedimiento requiere enfermera. Elige quién apoyará la cita antes de aceptarla.</p>
                        <select
                            value={selectedNurseId}
                            onChange={(event) => setSelectedNurseId(event.target.value)}
                            disabled={loadingNurses}
                            className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="">{loadingNurses ? "Cargando enfermeras…" : "Selecciona una enfermera"}</option>
                            {nurses.map((nurse) => <option key={nurse._id} value={nurse._id}>{nurse.name} {nurse.last_name}</option>)}
                        </select>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setAppointmentToAccept(null)}>Cancelar</Button>
                            <Button disabled={!selectedNurseId || loadingNurses} onClick={() => handleAceptar(appointmentToAccept._id, selectedNurseId)} className="bg-emerald-600 hover:bg-emerald-700">Aceptar cita</Button>
                        </div>
                    </div>
                </div>
            )}
            {appointmentToAssign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-slate-900">Asignar a un doctor</h2>
                        <p className="mt-1 text-sm text-slate-500">Elige el doctor que atenderá esta cita. Se le notificará junto con el paciente.</p>
                        <select
                            value={selectedDoctorId}
                            onChange={(event) => setSelectedDoctorId(event.target.value)}
                            disabled={loadingDoctors}
                            className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="">{loadingDoctors ? "Cargando doctores…" : "Selecciona un doctor"}</option>
                            {doctors.map((doctor) => (
                                <option key={doctor._id} value={doctor._id}>
                                    Dr. {doctor.name} {doctor.last_name}{doctor.specialty ? ` — ${doctor.specialty}` : ""}
                                </option>
                            ))}
                        </select>
                        {appointmentToAssign.procedure_id?.requires_nurse && (
                            <>
                                <p className="mt-4 text-sm text-slate-500">Este procedimiento requiere enfermera.</p>
                                <select
                                    value={selectedNurseId}
                                    onChange={(event) => setSelectedNurseId(event.target.value)}
                                    disabled={loadingNurses}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                                >
                                    <option value="">{loadingNurses ? "Cargando enfermeras…" : "Selecciona una enfermera"}</option>
                                    {nurses.map((nurse) => <option key={nurse._id} value={nurse._id}>{nurse.name} {nurse.last_name}</option>)}
                                </select>
                            </>
                        )}
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setAppointmentToAssign(null)}>Cancelar</Button>
                            <Button
                                disabled={!selectedDoctorId || loadingDoctors || (appointmentToAssign.procedure_id?.requires_nurse && !selectedNurseId)}
                                onClick={() => handleAsignar(appointmentToAssign._id, selectedDoctorId, selectedNurseId || null)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                Asignar cita
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {pendingAppointmentDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
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
                            <p><span className="font-semibold text-slate-500">Servicio: </span>{pendingAppointmentDetails.procedure_id?.name || pendingAppointmentDetails.type}</p>
                            <p><span className="font-semibold text-slate-500">Fecha: </span>{new Date(pendingAppointmentDetails.date).toLocaleDateString()}</p>
                            <p><span className="font-semibold text-slate-500">Horario: </span>{pendingAppointmentDetails.start_time} - {pendingAppointmentDetails.end_time}</p>
                            <p><span className="font-semibold text-slate-500">Duración: </span>{pendingAppointmentDetails.duration_minutes || 30} min</p>
                            <p><span className="font-semibold text-slate-500">Notas: </span>{pendingAppointmentDetails.description || "Sin notas"}</p>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setPendingAppointmentDetails(null)}>Cerrar</Button>
                            <Button
                                onClick={() => {
                                    const appointment = pendingAppointmentDetails;
                                    setPendingAppointmentDetails(null);
                                    if (isAdmin) requestAssign(appointment);
                                    else requestAccept(appointment);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isAdmin ? "Asignar cita" : "Aceptar cita"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
