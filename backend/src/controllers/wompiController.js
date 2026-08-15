import { config } from "../../config.js";

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

        const response = await fetch("https://api.wompi.sv/TransaccionCompra/TokenizadaSin3Ds", {
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

// Transacción real (con verificación 3DS del banco): Wompi la
// rechaza mientras el aplicativo siga en modo desarrollo, solo
// funcionará cuando la cuenta pase a productivo.
wompiController.payment3DS = async (req, res) => {
    try {
        const { token, formData } = req.body;

        const response = await fetch("https://api.wompi.sv/TransaccionCompra/3DS", {
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

export default wompiController;