// Fuerza el huso horario de la clínica (El Salvador, UTC-6) sin importar en qué
// zona corra el proceso de Node — Render usa UTC por defecto, mientras que todo
// el cálculo de "hoy"/límites de día en appointmentsController.js (getDayRange,
// expirePendingAppointments, etc.) usa new Date(year, month, day, ...) local. Sin
// esto, una cita atendida después de las 6pm hora local queda registrada como del
// día siguiente en UTC y desaparece de las estadísticas/historial de "hoy".
// Debe importarse primero, antes que cualquier otro módulo, para que tome efecto
// antes de que se ejecute código que ya haga cálculos de fecha.
process.env.TZ = "America/El_Salvador";
