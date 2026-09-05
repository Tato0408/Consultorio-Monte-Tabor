import { toMins, minsToStr, tileFreeSlots } from "../controllers/schedule/scheduleController.js";

// Arma la línea de tiempo del día (ocupado, en descanso o disponible) para un conjunto de
// proveedores (doctores o enfermeras), a partir de su horario y sus citas del día. Compartido
// entre nurseDashboardController y receptionistDashboardController para los dos roles.
//
// durationMin es la duración real del procedimiento elegido en el registro rápido de citas
// (QuickAppointmentForm.jsx la levanta hasta el dashboard vía onProcedureInfoChange), no un
// valor fijo: los espacios "disponible" se tilean con esa duración y con el buffer_time
// propio de CADA proveedor (mismo algoritmo, tileFreeSlots, que ya usa el resto del sistema
// para sugerir horarios). Antes esto usaba un SLOT_MIN=30 fijo sin importar el procedimiento
// ni el buffer_time configurado de cada quien.
//
// Los bloques "ocupado" y "en descanso" SIEMPRE muestran su horario real (la cita o el
// descanso tal cual están guardados), nunca se fuerzan a encajar en la duración elegida: si
// el procedimiento dura 1 hora pero una cita ya agendada dura 30 min, esa cita se sigue
// mostrando de 30 min, en su horario real.
export function buildProviderAgenda(providers, schedules, appointments, dayOfWeek, providerIdKey, durationMin = 30) {
    const scheduleByProvider = new Map(schedules.map((s) => [s[providerIdKey].toString(), s]));
    const apptsByProvider = new Map();
    appointments.forEach((a) => {
        if (!a[providerIdKey]) return;
        const key = a[providerIdKey].toString();
        if (!apptsByProvider.has(key)) apptsByProvider.set(key, []);
        apptsByProvider.get(key).push(a);
    });

    // Un proveedor sin ningún día laborable configurado (nunca hizo su horario) no debe
    // aparecer en esta agenda, aunque esté activo.
    const schedulableProviders = providers.filter((provider) => {
        const schedule = scheduleByProvider.get(provider._id.toString());
        return !!schedule?.weekly_availability?.some((d) => d.is_available);
    });

    return schedulableProviders.map((provider) => {
        const schedule = scheduleByProvider.get(provider._id.toString());
        const dayConfig = schedule?.weekly_availability?.find((d) => d.day === dayOfWeek);
        const providerAppts = (apptsByProvider.get(provider._id.toString()) || [])
            .filter((a) => a.start_time && a.end_time);
        const dayBreaks = (schedule.breaks || []).filter((br) => br.day === dayOfWeek);
        const bufferMin = schedule.buffer_time || 0;

        // Map en vez de array: el mismo start_time no debe aparecer dos veces. Ocupado y en
        // descanso se ponen primero, con su horario real; disponible (más abajo) nunca pisa
        // un start_time que ya esté marcado por uno de los dos.
        const slotsByStart = new Map();

        for (const appt of providerAppts) {
            slotsByStart.set(appt.start_time, {
                start_time: appt.start_time,
                end_time: appt.end_time,
                status: appt.status,
                appointment: {
                    _id: appt._id,
                    patientName: appt.patient_id ? `${appt.patient_id.name} ${appt.patient_id.last_name}` : "Paciente",
                    type: appt.type,
                },
            });
        }
        for (const br of dayBreaks) {
            if (!slotsByStart.has(br.start_time)) {
                slotsByStart.set(br.start_time, { start_time: br.start_time, end_time: br.end_time, status: "break", appointment: null });
            }
        }

        if (dayConfig?.is_available && dayConfig.time_blocks?.length) {
            const obstacles = [
                ...dayBreaks.map((br) => ({ start: toMins(br.start_time), end: toMins(br.end_time), gapAfter: 0 })),
                ...providerAppts.map((a) => ({ start: toMins(a.start_time), end: toMins(a.end_time), gapAfter: bufferMin })),
            ];
            for (const free of tileFreeSlots(dayConfig.time_blocks, obstacles, durationMin, bufferMin)) {
                const startStr = minsToStr(free.start);
                if (!slotsByStart.has(startStr)) {
                    slotsByStart.set(startStr, { start_time: startStr, end_time: minsToStr(free.end), status: "available", appointment: null });
                }
            }
        }

        // Orden cronológico: un bloque mal configurado que empieza más tarde en el día (ej.
        // uno desde medianoche) podía terminar antes en el arreglo si no se ordenaba.
        const slots = [...slotsByStart.values()].sort((a, b) => a.start_time.localeCompare(b.start_time));

        return {
            _id: provider._id,
            name: provider.name,
            last_name: provider.last_name,
            img_url: provider.img_url,
            ...(provider.specialty !== undefined ? { specialty: provider.specialty || "" } : {}),
            slots,
        };
    })
        // Un proveedor sin ningún bloque ese día (no trabaja ese día de la semana, aunque sí
        // tenga horario configurado en otros días) no debe aparecer en la agenda de ESTE día
        // en absoluto, ni como pestaña ni con un mensaje de "sin horario": simplemente no se
        // incluye. Uno que sí trabaja pero está completo ese día sigue apareciendo (sus citas
        // ocupadas cuentan como slots), solo que sin ningún botón "Disponible".
        .filter((provider) => provider.slots.length > 0);
}
