import express from "express";
import registerReceptionistController from "../../controllers/receptionist/registerReceptionistController.js";
import upload from "../../utils/CloudinaryConfig.js";

const router = express.Router();

router.route("/").post(
  upload.fields([
    {
      name: "receptionistImage",
      maxCount: 1,
    },
  ]),
  registerReceptionistController.register,
);

router
  .route("/verifyCodeEmail")
  .post(
    registerReceptionistController.verifyCode,
  );

export default router;