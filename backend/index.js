import "./timezone.js";
import http from "http";
import app from './app.js';
import "./database.js";
import { initRoleSocket } from "./src/services/roleSocket.js";
import { run_inventory_alerts_check } from "./src/services/notificationService.js";
import { runAppointmentAutoTransitions } from "./src/controllers/appointments/appointmentsController.js";
import { run_medication_reminders_sweep } from "./src/controllers/patientPortal/patientPortalController.js";

// Frecuencia de las tareas que dependen del paso del tiempo.
const background_jobs_interval_ms = 15 * 60 * 1000;

// Ejecuta las tareas que generan notificaciones por el paso del tiempo:
// citas vencidas o sin aceptar, recordatorio de cita del día siguiente,
// recordatorio diario de medicamentos y alertas de inventario. Así las
// notificaciones y sus push salen aunque nadie abra la app. Cada tarea
// captura sus propios errores para no detener a las demás.
const run_background_jobs = async () => {
    await runAppointmentAutoTransitions().catch((error) =>
        console.log("Error en transiciones automáticas de citas:", error)
    );
    await run_medication_reminders_sweep();
    await run_inventory_alerts_check({ force: true });
};

async function main() {
    // Se crea el http.Server a mano (en vez de app.listen directo) para
    // poder engancharle el WebSocketServer que avisa de cambios de permisos.
    const server = http.createServer(app);
    initRoleSocket(server);
    server.listen(4000, "0.0.0.0", () => console.log("Server on port 4000"))

    // Se ejecutan al arrancar (Render despierta el servidor tras dormir) y
    // luego cada 15 minutos mientras siga encendido.
    run_background_jobs();
    setInterval(run_background_jobs, background_jobs_interval_ms).unref?.();
}

main()
