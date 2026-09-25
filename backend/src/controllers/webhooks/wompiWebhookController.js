import appointmentsModel from "../../models/appointments/appointments.js";
import { verifyWebhookSignature, getTransactionStatus } from "../../utils/wompi.js";
import { activateAfterDeposit } from "../patientPortal/patientPortalController.js";

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
        // El id de la cita y el paciente que hizo el cobro se mandan como
        // datosAdicionales.appointment_id / patient_id al cobrar (ver
        // wompiController.paymentTest/payment3DS). patient_id lo inyecta el
        // backend con el id de la sesión autenticada en ese momento, nunca lo
        // manda el cliente, así que sirve para verificar dueño acá.
        const appointmentId =
            payload?.datosAdicionales?.appointment_id ||
            payload?.DatosAdicionales?.appointment_id ||
            payload?.DatosAdicionales?.AppointmentId;
        const patientId =
            payload?.datosAdicionales?.patient_id ||
            payload?.DatosAdicionales?.patient_id ||
            payload?.DatosAdicionales?.PatientId;
        const transactionId = payload?.IdTransaccion || payload?.idTransaccion;

        if (!appointmentId || !transactionId) {
            return res.status(200).json({ message: "Sin referencia, se ignora" });
        }

        const appointment = await appointmentsModel.findById(appointmentId);
        if (!appointment || appointment.deposit_paid) {
            return res.status(200).json({ message: "Nada que actualizar" });
        }

        // Mismas dos validaciones que el flujo normal (confirmAppointmentPayment en
        // patientPortalController.js): sin ellas, cualquier paciente autenticado podía usar
        // el proxy crudo de Wompi para cobrarse a sí mismo un monto mínimo apuntando
        // appointment_id a la cita de otro paciente, y este webhook la marcaba como pagada
        // igual.
        if (!patientId || appointment.patient_id.toString() !== String(patientId)) {
            return res.status(200).json({ message: "Sin referencia, se ignora" });
        }

        // Se vuelve a consultar la transacción directamente a Wompi en vez de confiar
        // ciegamente en los campos del webhook, para tener una sola fuente de verdad del
        // estado del pago.
        const transaccion = await getTransactionStatus(transactionId);
        if (transaccion.esAprobada === true && Number(transaccion.monto) >= Number(appointment.deposit_amount)) {
            appointment.wompi_transaction_id = transactionId;
            appointment.deposit_paid = true;
            await appointment.save();

            // Respaldo del camino normal (confirmAppointmentPayment, que el frontend llama
            // en cuanto termina de cobrar): si esa llamada nunca llegó a completarse, este
            // webhook es el único que se entera de que sí se pagó, así que también le toca
            // sacar la cita de "pending_payment" y recién ahí notificar a los proveedores.
            await activateAfterDeposit(appointment);
        }

        return res.status(200).json({ message: "OK" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default wompiWebhookController;