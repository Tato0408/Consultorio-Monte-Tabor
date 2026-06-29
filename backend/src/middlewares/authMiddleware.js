import jsonwebToken from "jsonwebtoken";
import { config } from "../../config.js";

export const validateAuthCookie = (allowedTypes = []) => {
  return (req, res, next) => {
    try {
      //#1 Extraer el token que esta en la cookie
      const { authCookie } = req.cookies;
      if (!authCookie) {
        return res
          .status(403)
          .json({ message: "No cookie found, Authorization required" });
      }

      //#2 Extraer toda la informacion de la cookie
      const decoded = jsonwebToken.verify(authCookie, config.JWT.secret);

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
