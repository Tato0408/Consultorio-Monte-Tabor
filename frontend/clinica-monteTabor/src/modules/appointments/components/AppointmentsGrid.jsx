import React from "react";
import { Edit, Eye, Trash2, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import useAppointments from "../hooks/useAppointments";
import {
  confirmDelete,
  showSuccess,
  showError
} from "@/lib/alerts";

export default function AppointmentsGrid() {
    const navigate = useNavigate();

    const {
        appointments,
        loading,
        error,
        fetchAppointments,
        deleteAppointment
    } = useAppointments();

    const statusTranslations = {
        pending: "Pendiente",
        scheduled: "Programada",
        completed: "Completada",
        cancelled: "Cancelada"
    }

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

    // Pantalla de carga
    if (loading) {
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

                <Button
                    onClick={() => navigate("/calendar/appointments/new")}
                    className="bg-[#0b66d6] hover:bg-blue-700 text-white px-5 py-5 rounded-xl flex items-center gap-2 font-semibold shadow-md shadow-blue-100"
                >
                    <Plus className="h-5 w-5" />
                    Nueva Cita
                </Button>
            </div>

            {/* Sin datos */}
            {appointments.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">
                        No hay citas registradas en este momento.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {appointments.map((cita) => (
                        <Card
                            key={cita._id}
                            className="bg-white border border-slate-100 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200"
                        >
                            <CardHeader className="p-5 pb-3 flex flex-row items-center gap-2 space-y-0">
                                {/* Estado */}
                                <Badge
                                    variant="secondary"
                                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cita.status === "completed"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : cita.status === "cancelled"
                                            ? "bg-rose-50 text-rose-600"
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

                            <CardContent className="px-5 pt-0 pb-4 text-sm text-slate-600 space-y-2">
                                <h3 className="text-base font-bold text-slate-900 mb-3">
                                    Paciente:{" "}
                                    {cita.patient_id
                                        ? `${cita.patient_id.name} ${cita.patient_id.last_name}`
                                        : "Paciente no asignado"}
                                </h3>

                                <p>
                                    <span className="text-slate-400">
                                        Tipo de procedimiento:
                                    </span>{" "}
                                    {cita.type}
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

                            <Separator className="bg-slate-100" />

                            <CardFooter className="p-4 bg-slate-50/50 flex items-center justify-between">
                                {/* Médico */}
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7 border border-slate-200">
                                        <AvatarImage
                                            src={
                                                cita.avatarUrl ||
                                                "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=150&auto=format&fit=crop"
                                            }
                                            alt={cita.doctor}
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

                                {/* Acciones */}
                                <div className="flex items-center gap-1">
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

                                    <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                                        onClick={() =>
                                            navigate(
                                                `/calendar/appointments/${cita._id}`
                                            )
                                        }
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}