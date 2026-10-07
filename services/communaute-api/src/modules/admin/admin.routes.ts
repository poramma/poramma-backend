import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "@poramma/utils";
import { requireAuth, requirePermission } from "../../shared/middleware";
import * as c from "./admin.controller";

const router: ExpressRouter = Router();

// Espace d'administration de la plateforme communautaire. Chaque route exige une permission
// « community:* » (portée COMMUNITY — jamais portée par un rôle de l'ambassade, voir identity-api).
router.use(requireAuth);

router.get("/admin/overview", requirePermission("community:overview:read"), asyncHandler(c.overview));
router.get("/admin/system", requirePermission("community:overview:read"), asyncHandler(c.systemStatus));

router.get("/admin/members", requirePermission("community:user:read"), asyncHandler(c.listMembers));
router.get("/admin/members/:id", requirePermission("community:user:read"), asyncHandler(c.getMember));

router.get("/admin/audit/stats", requirePermission("community:audit:read"), asyncHandler(c.auditStats)); // avant /logs/:id
router.get("/admin/audit/logs", requirePermission("community:audit:read"), asyncHandler(c.listAuditLogs));
router.get("/admin/audit/logs/:id", requirePermission("community:audit:read"), asyncHandler(c.getAuditLog));
router.post("/admin/audit/export", requirePermission("community:audit:export"), asyncHandler(c.exportAuditLogs));

router.get("/admin/support/tickets", requirePermission("community:support:read"), asyncHandler(c.listTickets));
router.get("/admin/support/assignees", requirePermission("community:support:read"), asyncHandler(c.listAssignees)); // avant /tickets/:id
router.get("/admin/support/tickets/:id", requirePermission("community:support:read"), asyncHandler(c.getTicket));
router.post("/admin/support/tickets/:id/messages", requirePermission("community:support:manage"), asyncHandler(c.addTicketMessage));
router.patch("/admin/support/tickets/:id", requirePermission("community:support:manage"), asyncHandler(c.updateTicket));

export default router;
