import { config } from "../../config.js";
import { validarDatosTarjeta, validarDatosCobro } from "../utils/cardValidators.js";

// Proxy delgado hacia la API real de Wompi El Salvador. Usa fetch
// nativo de Node (ya disponible desde Node 18) en vez de agregar la
// dependencia node-fetch.
const wompiController = {};

// Genera el token de acceso (OAuth2 client_credentials).
wompiController.generarToken = async (req, res) => {
    try {
        const response = await fetch("https://id.wompi.sv/connect/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: config.wompi.grantType,
                audience: config.wompi.audience,
                client_id: config.wompi.clientId,
                client_secret: config.wompi.clientSecret,
            }),
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json(data);
        return res.status(200).json(data);
    } catch (error) {
        console.error("error" + error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

// Tokeniza la tarjeta: la tarjeta viaja una sola vez hacia Wompi y a
// cambio se recibe un token. Ese token es lo único que se usa después
// para cobrar (nunca se guarda el número real de la tarjeta en
// ningún lado de este sistema).
wompiController.tokenizarTarjeta = async (req, res) => {
    try {
        const { token, formData } = req.body;

        // El frontend ya enmascara y valida (paymentValidators.js), pero el servidor
        // nunca debe confiar solo en eso: una petición hecha directo a esta ruta (sin
        // pasar por el formulario) se saltaría esas máscaras por completo. Validar acá
        // también evita gastar una llamada real a Wompi con datos que ya se sabe que
        // van a fallar.
        const errorTarjeta = validarDatosTarjeta(formData || {});
        if (errorTarjeta) return res.status(400).json({ message: errorTarjeta });

        const response = await fetch("https://api.wompi.sv/Tokenizacion", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json(data);
        return res.status(200).json(data);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

// Transacción de prueba (tokenizada, sin 3DS): la única que Wompi
// permite mientras el aplicativo esté en modo desarrollo (verificado
// en vivo con estas credenciales).
wompiController.paymentTest = async (req, res) => {
    try {
        const { token, formData } = req.body;

        const errorCobro = validarDatosCobro(formData || {});
        if (errorCobro) return res.status(400).json({ message: errorCobro });

        // Se sobrescribe con el id de la sesión autenticada, nunca con lo que mande el
        // cliente: datosAdicionales.appointment_id lo elige el paciente (a cuál de sus
        // citas paga), pero de quién es el cobro no se puede confiar al formData, o
        // cualquiera podría apuntar el pago a la cita de otro paciente. El webhook
        // (wompiWebhookController.js) usa este mismo campo, tal como Wompi lo devuelve
        // en el aviso, para verificar dueño antes de marcar el anticipo como pagado.
        const datosAdicionales = { ...(formData?.datosAdicionales || {}), patient_id: req.user.id };
        const body = { ...formData, datosAdicionales };

        const response = await fetch("https://api.wompi.sv/TransaccionCompra/TokenizadaSin3Ds", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json(data);
        return res.status(200).json(data);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

// Transacción real (con verificación 3DS del banco): Wompi la
// rechaza mientras el aplicativo siga en modo desarrollo, solo
// funcionará cuando la cuenta pase a productivo.
wompiController.payment3DS = async (req, res) => {
    try {
        const { token, formData } = req.body;

        const errorCobro = validarDatosCobro(formData || {});
        if (errorCobro) return res.status(400).json({ message: errorCobro });

        // Mismo criterio que paymentTest: el dueño del cobro lo decide la sesión, no el
        // formData del cliente.
        const datosAdicionales = { ...(formData?.datosAdicionales || {}), patient_id: req.user.id };
        const body = { ...formData, datosAdicionales };

        const response = await fetch("https://api.wompi.sv/TransaccionCompra/3DS", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json(data);
        return res.status(200).json(data);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

export default wompiController;