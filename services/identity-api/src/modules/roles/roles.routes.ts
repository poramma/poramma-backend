import { Router, type Router as ExpressRouter } from "express";
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  assignPermissionToRole,
  removePermissionFromRole,
  assignRoleToUser,
  removeRoleFromUser,
} from "./roles.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();

// Every route here requires authentication; mutations additionally require
// "user:admin" (minRoleLevel 1 — ADMIN only, see the RBAC seed).
router.use(requireAuth);

router.get("/roles", asyncHandler(getRoles));
router.get("/roles/:id", asyncHandler(getRole));
router.post("/roles", requirePermission("user:admin"), asyncHandler(createRole));
router.patch("/roles/:id", requirePermission("user:admin"), asyncHandler(updateRole));
router.delete("/roles/:id", requirePermission("user:admin"), asyncHandler(deleteRole));

router.get("/permissions", asyncHandler(getPermissions));
router.post("/roles/:roleId/permissions", requirePermission("user:admin"), asyncHandler(assignPermissionToRole));
router.delete(
  "/roles/:roleId/permissions/:permissionCode",
  requirePermission("user:admin"),
  asyncHandler(removePermissionFromRole)
);

router.post("/users/:userId/roles", requirePermission("user:admin"), asyncHandler(assignRoleToUser));
router.delete("/users/:userId/roles/:roleId", requirePermission("user:admin"), asyncHandler(removeRoleFromUser));

export default router;
