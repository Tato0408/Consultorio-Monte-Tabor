import express from "express";
import appointmentTypesController from "../../controllers/appointmentTypes/appointmentTypesController.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Lectura abierta a cualquier rol autenticado: la leyenda del
// calendario y el selector "Tipo de cita" al agendar la necesitan
// sin importar el rol (doctor, enfermera, recepción, etc).
router.get("/", authenticate, appointmentTypesController.getAll);

// Crear, editar y eliminar es exclusivo del rol admin. A propósito
// no es un permiso configurable desde Roles y Permisos (ver
// ScheduleConfig.jsx: la sección "Tipos de citas" solo se muestra
// para admin, sin importar lo que diga la matriz de permisos).
router.post("/", validateAuthCookie(["admin"]), appointmentTypesController.create);
router.put("/:id", validateAuthCookie(["admin"]), appointmentTypesController.update);
router.delete("/:id", validateAuthCookie(["admin"]), appointmentTypesController.remove);

export default router;
