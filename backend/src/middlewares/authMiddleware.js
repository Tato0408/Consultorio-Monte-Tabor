import jsonwebToken from "jsonwebtoken";
import { config } from "../../config.js";

// Middleware que valida la cookie o el token de sesión y, opcionalmente,
// restringe el acceso a una lista de tipos de usuario permitidos
// (allowedTypes).
export const validateAuthCookie = (allowedTypes = []) => {
  return (req, res, next) => {
    try {
      // Extrae el token de la cookie o del encabezado Authorization. La web
      // lo manda por cookie, la app móvil no tiene cookie jar y lo manda
      // como "Authorization: Bearer <token>". Se acepta cualquiera de los
      // dos formatos.
      let token = req.cookies?.authCookie;
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.slice(7);
        }
      }

      if (!token) {
        return res
          .status(403)
          .json({ message: "No se encontró la cookie de sesión, se requiere autorización" });
      }

      let decoded;
      try {
        // Decodifica el token para obtener los datos que contiene.
        decoded = jsonwebToken.verify(token, config.JWT.secret);
      } catch (verifyError) {
        // jwt.verify lanza (no devuelve null) cuando el token expiró o es
        // inválido; antes caía al catch genérico de abajo y respondía 500
        // "Error interno del servidor", como si fuera una falla real del
        // servidor en vez de una sesión vencida. Con eso, el frontend nunca
        // podía distinguir "tu sesión expiró" de un error real, así que no
        // podía cerrar sesión ni redirigir al login automáticamente.
        if (verifyError.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Tu sesión expiró, inicia sesión de nuevo." });
        }
        return res.status(401).json({ message: "Sesión inválida, inicia sesión de nuevo." });
      }

      // Verifica que el rol del token esté dentro de los tipos permitidos.
      if (allowedTypes.length > 0 && !allowedTypes.includes(decoded.userType)) {
        return res.status(401).json({ message: "Acceso denegado" });
      }

      req.user = decoded;

      next();
    } catch (error) {
      console.log("error" + error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  };
};
