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

      // Decodifica el token para obtener los datos que contiene.
      const decoded = jsonwebToken.verify(token, config.JWT.secret);

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
