import nodemailer from "nodemailer";
import { config } from "../../config.js";

// Modo local: sin USER_EMAIL / USER_PASSWORD en el .env el correo no se envía,
// se imprime en la consola del backend (ahí aparecen los códigos de
// verificación y recuperación) para poder usar el sistema sin una cuenta de Gmail.
const USE_CONSOLE_MAIL = !(config.email.user_email && config.email.user_password);

//#1- ¿Quién lo envía?
//Transportador de nodemailer con el servicio de Gmail y las credenciales del .env.
//USER_PASSWORD es una contraseña de aplicación de Gmail, no la contraseña normal de la cuenta.
const transporter = USE_CONSOLE_MAIL
  ? null
  : nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.email.user_email,
        pass: config.email.user_password,
      },
    });

// Quita las etiquetas HTML para que el correo se lea bien en la consola.
const html_to_text = (html) =>
  String(html)
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|h\d|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

export const sendEmail = async (to, subject, html) => {
  if (USE_CONSOLE_MAIL) {
    console.log(
      `\n===== CORREO (modo local, no se envía) =====\nPara: ${to}\nAsunto: ${subject}\n\n${html_to_text(html)}\n============================================\n`
    );
    return { local: true };
  }

  //#2- ¿Quién lo recibe y cómo lo recibe?
  const mailOptions = {
    from: config.email.user_email,
    to,
    subject,
    html,
  };

  //#3- Enviar correo electrónico
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${to}`);
    return info;
  } catch (error) {
    console.log("Error enviando correo con nodemailer:", error.message);
    throw error;
  }
};
