import express from "express";
import receptionistsController from "../../controllers/receptionist/receptionistController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(authenticate, authorize("users.receptionist", "view"), receptionistsController.getReceptionists)
  .post(
    authenticate,
    authorize("users.receptionist", "create"),
    upload.fields([
      {
        name: "receptionistImage",
        maxCount: 1,
      },
    ]),
    receptionistsController.createReceptionist
  );

// Hardcodeado al rol receptionist: editar el propio perfil debe funcionar siempre,
// para todos los roles, sin depender de la matriz de permisos dinamica.
router
  .route("/profile/update")
  .put(
    validateAuthCookie(["receptionist"]),
    upload.fields([{ name: "receptionistImage", maxCount: 1 }]),
    receptionistsController.updateOwnProfile
  );

router
  .route("/:id")
  .put(
    authenticate,
    authorize("users.receptionist", "update"),
    upload.fields([
      {
        name: "receptionistImage",
        maxCount: 1,
      },
    ]),
    receptionistsController.updateReceptionist
  )
  .delete(receptionistsController.deleteReceptionist);

router
.route("/search")
.get(receptionistsController.searchReceptionist);

export default router;