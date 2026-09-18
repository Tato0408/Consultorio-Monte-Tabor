import express from "express";
import adminController from "../../controllers/admin/adminController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js"
const router = express.Router();

router.route("/check").get(adminController.checkAdminExists);
// La ruta /check va antes de este middleware a propósito, para
// poder consultarla sin sesión de admin. Todo lo que sigue sí
// exige rol admin.
router.use(authenticate(["admin"]));
router.route("/").get(adminController.getAdmins)

router.route("/verifyEmailChange").post(adminController.verifyEmailChange);

// Firma y sello propios, opcionales e independientes entre sí — ver
// adminController.updateOwnSignature/updateOwnSeal. Van antes de "/:id" por claridad,
// aunque al ser rutas de 2 segmentos Express nunca las confundiría con ese id de 1 segmento.
router.route("/profile/signature").put(upload.single("signatureImage"), adminController.updateOwnSignature);
router.route("/profile/seal").put(upload.single("sealImage"), adminController.updateOwnSeal);

router.route("/:id").put(upload.single("image"), adminController.updateAdmin)
.delete(authenticate(["admin"]),adminController.deleteAdmin);

export default router   