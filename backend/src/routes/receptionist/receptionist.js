import express from "express";
import receptionistsController from "../../controllers/receptionist/receptionistController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(authenticate(), authorize("users.receptionist", "view"), receptionistsController.getReceptionists)
  .post(
    authenticate(),
    authorize("users.receptionist", "create"),
    upload.fields([
      {
        name: "receptionistImage",
        maxCount: 1,
      },
    ]),
    receptionistsController.createReceptionist
  );

// Fijo al rol receptionist: editar el propio perfil debe funcionar
// siempre, sin depender de la matriz de permisos dinámica.
router
  .route("/profile/update")
  .put(
    authenticate(["receptionist"]),
    upload.fields([{ name: "receptionistImage", maxCount: 1 }]),
    receptionistsController.updateOwnProfile
  );

router
  .route("/:id")
  .put(
    authenticate(),
    authorize("users.receptionist", "update"),
    upload.fields([
      {
        name: "receptionistImage",
        maxCount: 1,
      },
    ]),
    receptionistsController.updateReceptionist
  )
  .delete(authenticate(), authorize("users.receptionist", "delete"), receptionistsController.deleteReceptionist);

router
.route("/search")
.get(authenticate(), authorize("users.receptionist", "view"), receptionistsController.searchReceptionist);

export default router;