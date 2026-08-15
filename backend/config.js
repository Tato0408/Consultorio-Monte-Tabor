import dotenv from "dotenv";

//Ejecutar la libreria dotenv
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
}