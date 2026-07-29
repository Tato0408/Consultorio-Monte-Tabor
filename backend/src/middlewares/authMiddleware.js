import jsonwebToken from "jsonwebtoken";
import { config } from "../../config.js";

export const validateAuthCookie = (allowedTypes = []) => {
  return (req, res, next) => {
    try {
      //#1 Extraer el token: la web lo manda por cookie, la app móvil no tiene cookie jar y
      //lo manda como "Authorization: Bearer <token>" — se acepta cualquiera de las dos
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
          .json({ message: "No cookie found, Authorization required" });
      }

      //#2 Extraer toda la informacion del token
      const decoded = jsonwebToken.verify(token, config.JWT.secret);

      //#3 Verificar si el rol de la cookie puede pasar o no
      if (allowedTypes.length > 0 && !allowedTypes.includes(decoded.userType)) {
        return res.status(401).json({ message: "Acces denied" });
      }

      req.user = decoded;

      next();
    } catch (error) {
      console.log("error" + error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};
