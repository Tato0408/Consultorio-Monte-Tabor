import express from "express";
import receptionistsController from "../../controllers/receptionist/receptionistController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(validateAuthCookie(["admin"]), receptionistsController.getReceptionists)
  .post(
    validateAuthCookie(["admin"]),
    upload.fields([
      {
        name: "receptionistImage",
        maxCount: 1,
      },
    ]),
    receptionistsController.createReceptionist
  );

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
    validateAuthCookie(["admin"]),
    upload.fields([
      {
        name: "receptionistImage",
        maxCount: 1,
      },
    ]),
    receptionistsController.updateReceptionist
  )
  .delete(receptionistsController.deleteReceptionist);

export default router;
