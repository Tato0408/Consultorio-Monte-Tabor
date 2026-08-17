import appointmentsModel from "../../models/appointments/appointments.js";
import { verifyWebhookSignature, getTransactionStatus } from "../../utils/wompi.js";

const wompiWebhookController = {};

// POST /api/webhooks/wompi, Wompi avisa aquí cuando hay novedades en
// una transacción.
// No requiere sesión (Wompi no tiene cookie de paciente), en su lugar
// se verifica que el aviso realmente venga de Wompi comparando la
// firma HMAC del cuerpo crudo de la petición. Es un respaldo para
// producción: en el flujo normal, la propia página de pago confirma
// el resultado de inmediato llamando a /confirm-payment en cuanto
// termina de cobrar.
wompiWebhookController.handle = async (req, res) => {
    try {
        const receivedHash = req.headers["wompi_hash"] || req.headers["wompi-hash"];

        if (!verifyWebhookSignature(req.rawBody, receivedHash)) {
            return res.status(401).json({ message: "Firma inválida" });
        }

        const payload = req.body || {};
        // El id de la cita se manda como datosAdicionales.appointment_id
        // al cobrar.
        const appointmentId =
            payload?.datosAdicionales?.appointment_id ||
            payload?.DatosAdicionales?.appointment_id ||
            payload?.DatosAdicionales?.AppointmentId;
        const transactionId = payload?.IdTransaccion || payload?.idTransaccion;

        if (!appointmentId || !transactionId) {
            return res.status(200).json({ message: "Sin referencia, se ignora" });
        }

        const appointment = await appointmentsModel.findById(appointmentId);
        if (!appointment || appointment.deposit_paid) {
            return res.status(200).json({ message: "Nada que actualizar" });
        }

        // Se vuelve a consultar la transacción directamente a Wompi en
        // vez de confiar ciegamente en los campos del webhook, para
        // tener una sola fuente de verdad del estado del pago. El status
        // de la cita no cambia aquí: pagar el anticipo no salta la
        // aceptación del doctor, sigue "pending" hasta que se acepte.
        const transaccion = await getTransactionStatus(transactionId);
        if (transaccion.esAprobada === true) {
            appointment.wompi_transaction_id = transactionId;
            appointment.deposit_paid = true;
            await appointment.save();
        }

        return res.status(200).json({ message: "OK" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default wompiWebhookController;