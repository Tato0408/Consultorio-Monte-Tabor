import { useState, useEffect } from "react";
import { Save, Pencil, Info } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import useSchedule from "../hooks/useSchedule";
import useNurseSchedule from "../hooks/useNurseSchedule";
import { showError, showSuccess } from "@/lib/alerts";
import AppointmentTypesSection  from "../components/AppointmentTypesSection";
import WeeklyAvailabilitySection from "../components/WeeklyAvailabilitySection";
import BreaksSection             from "../components/BreaksSection";
import ExceptionsSection         from "../components/ExceptionsSection";
import ScheduleSettingsSection   from "../components/ScheduleSettingsSection";
import ScheduleStatusHero        from "../components/ScheduleStatusHero";
import CalendarViewPanel         from "../components/CalendarViewPanel";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const defaultWeekly = DAYS.map((_, i) => ({
    day: i,
    is_available: i >= 1 && i <= 5,
    time_blocks: i >= 1 && i <= 5
        ? [{ start_time: "08:00", end_time: "12:00" }, { start_time: "13:00", end_time: "17:00" }]
        : [],
}));

const defaultBreaks = [1,2,3,4,5].map(d => ({ day: d, start_time: "12:00", end_time: "13:00" }));

const DEFAULT_BUFFER_OPTIONS  = [0, 5, 10, 15, 20, 30];

const EMPTY_SCHEDULE = {
    weekly_availability:  defaultWeekly,
    breaks:               defaultBreaks,
    exceptions:           [],
    buffer_time:          10,
    buffer_time_options:  DEFAULT_BUFFER_OPTIONS,
    allow_outside_hours:  false,
};

const ScheduleConfig = () => {
    const { user, userType, isLoading: authLoading, hasPermission } = useAuth();
    const canUpdate = hasPermission("calendar.schedule", "update");
    // El admin también ejerce como doctor (mismo correo que su propio
    // registro en la colección de doctores), así que tiene y
    // configura su propio horario igual que cualquier otro doctor.
    // Solo se le agrega, aparte, el catálogo global de tipos de citas
    // (ver más abajo), que es lo único exclusivo de admin.
    const isAdmin = userType === "admin";
    // La página de Horarios sirve para doctor, enfermera y admin,
    // cada uno guarda en una colección distinta
    // (backend/src/models/schedule/schedule.js o nurseSchedule.js),
    // por eso hay dos hooks.
    const isNurse = userType === "nurse";
    const doctorSchedule = useSchedule();
    const nurseSchedule = useNurseSchedule();
    const { getSchedule, saveSchedule } = isNurse
        ? nurseSchedule
        : doctorSchedule;

    // El user.id del JWT puede diferir del _id en la colección de
    // doctores o enfermeras. Se busca al usuario por email en el
    // catálogo correspondiente para obtener el _id correcto. Para
    // admin se usa /doctors/catalog (no /doctors): ese catálogo es el
    // que crea y mantiene su doctor espejo (ver
    // doctorsController.getDoctorsCatalog), y es exactamente el mismo
    // id que va a aparecer seleccionable al agendar una cita. Así el
    // horario que se configura aquí es el mismo que se usa para
    // calcular su disponibilidad real.
    const [ownerId, setOwnerId] = useState(null);

    const [config, setConfig]   = useState(EMPTY_SCHEDULE);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState(null);
    // La página arranca en modo de solo lectura: nada es editable
    // hasta que se presiona Editar horario. configSnapshot guarda el
    // config tal cual estaba justo antes de entrar a modo edición,
    // para que Descartar pueda devolver todo a como estaba sin volver
    // a pedirlo al backend.
    const [editing, setEditing] = useState(false);
    const [configSnapshot, setConfigSnapshot] = useState(null);

    useEffect(() => {
        if (!user?.email) return;
        // Antes esto llamaba a una URL fija a localhost:4000, que en producción
        // nunca resuelve: la petición fallaba en silencio y siempre caía al
        // fallback de abajo. Para un admin ese fallback (user.id, el id de
        // Admin) no es el mismo id que su doctor espejo con el que se agenda
        // la cita. En ese caso, el horario se guardaba bajo un id y se
        // consultaba bajo otro, así que getAvailableSlots nunca encontraba
        // nada para el admin. apiClient ya resuelve la URL base correcta y
        // manda la cookie de sesión.
        const catalogPath = isNurse ? "/nurses" : "/doctors/catalog";
        apiClient(catalogPath)
            .then(list => {
                const me = Array.isArray(list) ? list.find(d => d.email === user.email) : null;
                setOwnerId(me?._id || user?.id || null);
            })
            .catch(() => setOwnerId(user?.id || null));
    }, [user, isNurse]);

    useEffect(() => {
        if (!ownerId) return;
        setLoading(true);

        const applyConfig = (data) => {
            if (!data) return;
            const bufferTime = data.buffer_time ?? 10;
            // Horarios guardados antes de esta lista personalizable
            // solo tenían buffer_time (un único valor), se usa como
            // semilla de la lista para no perder la configuración ya
            // hecha.
            const bufferOptions = data.buffer_time_options?.length
                ? data.buffer_time_options
                : Array.from(new Set([...DEFAULT_BUFFER_OPTIONS, bufferTime])).sort((a, b) => a - b);

            setConfig({
                weekly_availability: data.weekly_availability ?? defaultWeekly,
                breaks:              data.breaks              ?? defaultBreaks,
                exceptions:          data.exceptions          ?? [],
                buffer_time:         bufferTime,
                buffer_time_options: bufferOptions,
                allow_outside_hours: data.allow_outside_hours ?? false,
            });
        };

        getSchedule(ownerId)
            .then(applyConfig)
            .catch(() => {
                // Fallback: intenta cargar con el user.id del JWT si difiere del ownerId resuelto
                if (user?.id && user.id !== ownerId) {
                    getSchedule(user.id).then(applyConfig).catch(() => {});
                }
            })
            .finally(() => setLoading(false));
    }, [ownerId]);

    const patch = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    // Entra a modo edición guardando una copia del config actual. Es
    // a lo que vuelve el botón Descartar si el usuario se arrepiente.
    const startEditing = () => {
        setConfigSnapshot(config);
        setEditing(true);
    };

    const discardChanges = () => {
        if (configSnapshot) setConfig(configSnapshot);
        setConfigSnapshot(null);
        setEditing(false);
        setError(null);
    };

    const handleSave = async () => {
        if (saving) return;
        if (!ownerId) {
            setError(isNurse
                ? "No se pudo obtener el ID de la enfermera. Recarga la página."
                : "No se pudo obtener el ID del doctor. Recarga la página.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await saveSchedule(ownerId, config);
            // Al guardar con éxito la interfaz vuelve a su estado
            // inicial (solo lectura). El toast confirma el guardado,
            // ya que el botón pasa directo a Editar horario sin
            // quedarse en pantalla mostrando Guardado.
            showSuccess("Horario guardado correctamente.");
            setConfigSnapshot(null);
            setEditing(false);
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
        <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Configuración de disponibilidad</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {isNurse
                            ? "Define tus horarios de disponibilidad y descansos. Sin antes definidos tus horarios, no podras recibir citas."
                            : isAdmin
                            ? "Define tus horarios de atención, descansos y el catálogo global de tipos de cita. Sin antes definidos tus horarios, no podras recibir citas."
                            : "Define tus horarios de atención y descansos. Sin antes definidos tus horarios, no podras recibir citas."}
                    </p>
                </div>
                {/* sm:mt-8 baja el botón (sin tocar su tamaño ni forma original)
                    para que quede a la misma altura inferior que el label gris. Solo
                    aplica en sm:flex-row, donde el botón se alinea arriba junto al
                    título. En mobile (flex-col) ya queda debajo por el orden
                    natural, así que no hace falta el margen ahí. */}
                <div className="flex gap-3 flex-shrink-0 sm:mt-8">
                    {canUpdate && (
                        editing ? (
                            <>
                                <button
                                    type="button"
                                    onClick={discardChanges}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold disabled:opacity-60"
                                >
                                    Descartar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                                    style={{ background: "#ADD7F6", color: "#0f3a63" }}
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={startEditing}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                                style={{ background: "#ADD7F6", color: "#0f3a63" }}
                            >
                                <Pencil className="w-4 h-4" />
                                Editar horario
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Estado: responde de un vistazo a "ya me pueden agendar?". */}
            <div className="mb-4">
                <ScheduleStatusHero
                    weeklyAvailability={config.weekly_availability}
                    breaks={config.breaks}
                    exceptions={config.exceptions}
                    canEdit={canUpdate}
                    onEdit={startEditing}
                />
            </div>

            {/* Aviso de modo edición: deja claro que los cambios no se guardan
                hasta pulsar Guardar cambios. */}
            {editing && (
                <div
                    className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm"
                    style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#b45309" }}
                >
                    <Info className="w-4 h-4 flex-shrink-0" />
                    Estás editando tu horario. Los cambios se guardan cuando pulsas &ldquo;Guardar cambios&rdquo;.
                </div>
            )}

            {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Layout de dos columnas: a la izquierda la configuración, a la
                derecha la vista fija del calendario. En pantallas chicas la
                vista queda debajo. */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">
                <div className="flex flex-col gap-5">
                    {/* Catálogo global de tipos de cita, exclusivo de admin (ver
                        comentario en isAdmin más arriba). Autocontenido: no depende del
                        botón Guardar cambios de esta página, cada acción persiste de
                        inmediato contra su propio endpoint, por eso queda fuera del
                        fieldset de modo edición de abajo (no tiene nada que descartar).
                        Aun así, sus botones de agregar, editar y eliminar solo existen
                        si editing es true (se pasa directo, ver
                        AppointmentTypesSection.jsx), para que la interfaz completa se
                        sienta consistente. */}
                    {isAdmin && <AppointmentTypesSection editing={editing} />}

                    {/* fieldset con display:contents. Desactiva los inputs, selects y
                        toggles que contienen estas secciones de un solo golpe, tanto
                        mientras se guarda como mientras la página está en modo de solo
                        lectura (antes de presionar Editar horario), sin alterar el
                        layout. No hace falta estar dentro de un <form> para que
                        funcione. Los botones de agregar, editar y eliminar de cada
                        sección además reciben editing directamente y desaparecen por
                        completo (no solo se deshabilitan) cuando no se está editando.
                        Las pestañas de cada sección son <div role="button">, no
                        <button>, así que el fieldset no las toca y siguen alternando
                        la vista estando en solo lectura. */}
                    <fieldset disabled={saving || !editing} className="contents">
                        <WeeklyAvailabilitySection
                            availability={config.weekly_availability}
                            onChange={v => patch("weekly_availability", v)}
                            breaks={config.breaks}
                            onBreaksChange={v => patch("breaks", v)}
                            editing={editing}
                        />
                        <BreaksSection
                            breaks={config.breaks}
                            availability={config.weekly_availability}
                            onChange={v => patch("breaks", v)}
                            editing={editing}
                        />
                        <ExceptionsSection
                            exceptions={config.exceptions}
                            onChange={v => patch("exceptions", v)}
                            editing={editing}
                        />
                        <ScheduleSettingsSection
                            bufferTime={config.buffer_time}
                            bufferOptions={config.buffer_time_options}
                            allowOutsideHours={config.allow_outside_hours}
                            onChange={(key, val) => patch(key, val)}
                            editing={editing}
                        />
                    </fieldset>
                </div>

                {/* Vista de tu calendario: de solo lectura (no cambia config), se
                    dibuja sola con lo que se configura a la izquierda. */}
                <CalendarViewPanel
                    availability={config.weekly_availability}
                    breaks={config.breaks}
                    bufferTime={config.buffer_time}
                />
            </div>
        </div>
    );
};

export default ScheduleConfig;
