import dotenv from "dotenv";

dotenv.config();

export const config = {
    db: {
        URI: process.env.DB_URI,
    },
    JWT: {
        secret: process.env.JWT_secret_key,
    },
    email: {
        user_email: process.env.USER_EMAIL,
        user_password: process.env.USER_PASSWORD
    },
    cloudinary: {
        cloudinary_name: process.env.CLOUDINARY_CLOUD_NAME,
        cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
        cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET
    },
    mailjet: {
        apiKey: process.env.API_KEY_MAILJET,
        secretKey: process.env.API_SECRET_MAILJET,
        fromEmail: process.env.MAILJET_FROM_EMAIL,
        fromName: process.env.MAILJET_FROM_NAME,
    },
    wompi: {
        grantType: process.env.GRANT_TYPE,
        audience: process.env.AUDIENCE,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
    },
    // URL pública del sitio del paciente, para armar el link de retorno tras pagar
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    // URL pública de este backend, para que Wompi pueda avisar por webhook.
    // En desarrollo local Wompi no puede alcanzarla, el resultado se confirma
    // igual consultando el estado directamente al volver del pago.
    backendPublicUrl: process.env.BACKEND_PUBLIC_URL || "http://localhost:4000",
}