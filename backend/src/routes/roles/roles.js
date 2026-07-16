import { Router } from "express";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";
import { getRoles, getRoleByKey, updateRolePermissions } from "../../controllers/roles/rolesController.js";

const router = Router();

// Hardcodeado a ["admin"] a proposito (requisito 7): editar permisos nunca debe
// depender de la propia matriz de permisos dinamica, para evitar que un cambio
// mal hecho bloquee a todos los admins.
router.use(validateAuthCookie(["admin"]));

router.get("/", getRoles);
router.get("/:roleKey", getRoleByKey);
router.patch("/:roleKey", updateRolePermissions);

export default router;
