import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "@poramma/utils";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { setMemberStatus, listTeam, addTeamMember, changeTeamRole, removeTeamMember } from "./community-admin.controller";

const router: ExpressRouter = Router();

// Écritures de l'administration communautaire. Permissions « community:* » uniquement : aucun rôle
// de l'ambassade (ADMIN compris) ne les porte. La lecture (membres, audit, support) est dans communaute-api.
router.use(requireAuth);

router.patch("/members/:id/status", requirePermission("community:user:manage"), asyncHandler(setMemberStatus));

router.get("/team", requirePermission("community:team:read"), asyncHandler(listTeam));
router.post("/team", requirePermission("community:team:manage"), asyncHandler(addTeamMember));
router.patch("/team/:userId", requirePermission("community:team:manage"), asyncHandler(changeTeamRole));
router.delete("/team/:userId", requirePermission("community:team:manage"), asyncHandler(removeTeamMember));

export default router;
