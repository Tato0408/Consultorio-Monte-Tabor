import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSchedule, saveSchedule } from "@/services/scheduleService";
import { showError } from "@/lib/alerts";
import AppointmentTypesSection  from "../components/AppointmentTypesSection";
import WeeklyAvailabilitySection from "../components/WeeklyAvailabilitySection";
import BreaksSection             from "../components/BreaksSection";
import ExceptionsSection         from "../components/ExceptionsSection";
import ScheduleSettingsSection   from "../components/ScheduleSettingsSection";
import SchedulePreview           from "../components/SchedulePreview";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const defaultWeekly = DAYS.map((_, i) => ({
    day: i,
    is_available: i >= 1 && i <= 5,
    time_blocks: i >= 1 && i <= 5
        ? [{ start_time: "08:00", end_time: "12:00" }, { start_time: "13:00", end_time: "17:00" }]
        : [],
}));

const defaultBreaks = [1,2,3,4,5].map(d => ({ day: d, start_time: "12:00", end_time: "13:00" }));

const EMPTY_SCHEDULE = {
    appointment_types:    [],
    weekly_availability:  defaultWeekly,
    breaks:               defaultBreaks,
    exceptions:           [],
    buffer_time:          10,
    min_block_duration:   30,
    allow_outside_hours:  false,
};

const ScheduleConfig = () => {
    const { user, isLoading: authLoading } = useAuth();

    // El user.id del JWT puede diferir del _id en la colección doctors.
    // Buscamos al usuario por email en la lista de doctores para obtener el _id correcto.
    const [doctorId, setDoctorId] = useState(null);

    const [config, setConfig]   = useState(EMPTY_SCHEDULE);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [saved, setSaved]     = useState(false);
    const [error, setError]     = useState(null);

    useEffect(() => {
        if (!user?.email) return;
        fetch("http://localhost:4000/api/doctors")
            .then(r => r.json())
            .then(list => {
                const me = Array.isArray(list) ? list.find(d => d.email === user.email) : null;
                setDoctorId(me?._id || user?.id || null);
            })
            .catch(() => setDoctorId(user?.id || null));
    }, [user]);

    useEffect(() => {
        if (!doctorId) return;
        setLoading(true);

        const applyConfig = (data) => {
            if (!data) return;
            setConfig({
                appointment_types:   data.appointment_types   ?? [],
                weekly_availability: data.weekly_availability ?? defaultWeekly,
                breaks:              data.breaks              ?? defaultBreaks,
                exceptions:          data.exceptions          ?? [],
                buffer_time:         data.buffer_time         ?? 10,
                min_block_duration:  data.min_block_duration  ?? 30,
                allow_outside_hours: data.allow_outside_hours ?? false,
            });
        };

        getSchedule(doctorId)
            .then(applyConfig)
            .catch(() => {
                // Fallback: intenta cargar con el user.id del JWT si difiere del doctorId resuelto
                if (user?.id && user.id !== doctorId) {
                    getSchedule(user.id).then(applyConfig).catch(() => {});
                }
            })
            .finally(() => setLoading(false));
    }, [doctorId]);

    const patch = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        if (!doctorId) {
            setError("No se pudo obtener el ID del doctor. Recarga la página.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await saveSchedule(doctorId, config);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            const msg = err.message || "Error al guardar. Intenta de nuevo.";
            setError(msg);
            showError(msg);
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                Cargando configuración...
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Configuración de disponibilidad</h1>
                    <p className="text-sm text-slate-400 mt-1">Define tus horarios de atención, tipos de citas y descansos.</p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Grid de secciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <AppointmentTypesSection
                    types={config.appointment_types}
                    onChange={v => patch("appointment_types", v)}
                />
                <WeeklyAvailabilitySection
                    availability={config.weekly_availability}
                    onChange={v => patch("weekly_availability", v)}
                />
                <BreaksSection
                    breaks={config.breaks}
                    availability={config.weekly_availability}
                    onChange={v => patch("breaks", v)}
                />
                <ExceptionsSection
                    exceptions={config.exceptions}
                    onChange={v => patch("exceptions", v)}
                />
                <ScheduleSettingsSection
                    bufferTime={config.buffer_time}
                    minBlockDuration={config.min_block_duration}
                    allowOutsideHours={config.allow_outside_hours}
                    onChange={(key, val) => patch(key, val)}
                />
                <SchedulePreview
                    types={config.appointment_types}
                    availability={config.weekly_availability}
                    breaks={config.breaks}
                    bufferTime={config.buffer_time}
                />
            </div>
        </div>
    );
};

export default ScheduleConfig;
