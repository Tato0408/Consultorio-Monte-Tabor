import express from "express";
import receptionistsController from "../../controllers/receptionist/receptionistController.js";
import upload from "../../utils/CloudinaryConfig.js";

const router = express.Router();

router
  .route("/")
  .get(
    receptionistsController.getReceptionists
  )
  .post(
    upload.fields([
      {
        name: "receptionistImage",
        maxCount: 1,
      },
    ]),
    receptionistsController.createReceptionist
  );

router
  .route("/:id")
  .put(
    upload.fields([
      {
        name: "receptionistImage",
        maxCount: 1,
      },
    ]),
    receptionistsController.updateReceptionist
  )
  .delete(
    receptionistsController.deleteReceptionist
  );

export default router;