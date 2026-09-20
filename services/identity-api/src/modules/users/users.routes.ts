import { Router, type Router as ExpressRouter } from "express";
import {
  getUser,
  getUserProfile,
  updatePersonalInfo,
  updateAddress,
  updateStudentProfile,
  updateWorkerProfile,
  updateUserStatus,
  enrollStudent,
  requireSelf,
} from "./users.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";

const router: ExpressRouter = Router();

// Toutes les routes users opèrent sur un utilisateur précis et exigent
// une authentification.
router.use(requireAuth);

// Enrôlement sur place par un agent habilité — même permission que la
// validation étudiants côté ambassade-api (etudiant:validate), pour ne pas
// dupliquer un second concept "peut gérer les étudiants".
router.post("/students/enroll", requirePermission("etudiant:validate"), enrollStudent);

// /me/:id/* — un utilisateur ne peut lire/modifier que SON PROPRE profil ;
// il n'existe aujourd'hui aucun flux staff passant par ces routes (les
// agents ne gèrent pas le profil académique/adresse d'un usager depuis ces
// endpoints) — voir requireSelf dans users.controller.ts.
router.get("/me/:id", requireSelf, getUser);
router.get("/me/:id/profile", requireSelf, getUserProfile);
router.patch("/me/:id/personal-info", requireSelf, updatePersonalInfo);
router.patch("/me/:id/address", requireSelf, updateAddress);
router.patch("/me/:id/student", requireSelf, updateStudentProfile);
router.patch("/me/:id/worker", requireSelf, updateWorkerProfile);

router.patch("/:id/status", requirePermission("user:update"), updateUserStatus);

export default router;
