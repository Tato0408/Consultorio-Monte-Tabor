import express from "express";
import sickLeaveController from "../../controllers/sickLeaves/sickLeaveController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router.route("/")
  .get(authorize("reports.records", "view"), sickLeaveController.getSickLeaves)
  .post(authorize("reports.records", "create"), sickLeaveController.createSickLeave);

router.route("/:id")
  .put(authorize("reports.records", "update"), sickLeaveController.updateSickLeave)
  .delete(authorize("reports.records", "delete"), sickLeaveController.deleteSickLeave);

export default router;
