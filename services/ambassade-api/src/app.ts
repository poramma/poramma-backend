import express, { Express } from "express";
import { json } from "body-parser";
import cors from "cors";
import { errorHandler, auditTrail } from "@poramma/utils";
import { auditLogic } from "@poramma/ambassade-core";
import { db } from "./db/connection";
import servicesRoutes from "./modules/services/services.routes";
import demandesRoutes from "./modules/demandes/demandes.routes";
import rendezvousRoutes from "./modules/rendezvous/rendezvous.routes";
import agentScheduleRoutes from "./modules/agent-schedule/agent-schedule.routes";
import documentsRoutes from "./modules/documents/documents.routes";
import internalDocumentsRoutes from "./modules/internal-documents/internal-documents.routes";
import communicationRoutes from "./modules/communication/communication.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import auditRoutes from "./modules/audit/audit.routes";
import messagingRoutes from "./modules/messaging/messaging.routes";
import etudiantsRoutes from "./modules/etudiants/etudiants.routes";
import agentRequestsRoutes from "./modules/agent-requests/agent-requests.routes";
import supportRoutes from "./modules/support/support.routes";
import cultureRoutes from "./modules/culture/culture.routes";
import receptionRoutes from "./modules/reception/reception.routes";

const app: Express = express();

// Derrière le gateway nginx (Phase 9) — voir le même commentaire dans
// identity-api/src/app.ts.
app.set("trust proxy", 1);

// Middlewares globaux — plusieurs origines possibles en dev (frontend-
// embassy:5173, frontend-community:5174), voir identity-api/src/app.ts.
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",").map((o) => o.trim());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(json());

// Journal d audit systématique : toute action de modification authentifiée est tracée,
// même si son endpoint n écrit pas de ligne d audit dédiée (voir @poramma/utils audit-trail).
app.use(auditTrail({ write: (entry) => auditLogic.writeAudit(db, entry) }));


// Exemple de route racine
app.get("/", (req, res) => {
  res.json({
    service: "Ambassade API",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// services.routes.ts defines its own flat top-level paths (/services,
// /sub-services, /schedules, /exceptions, /requirements) — mounted at root.
app.use("/", servicesRoutes);
app.use("/", demandesRoutes);
app.use("/", rendezvousRoutes);
app.use("/", agentScheduleRoutes);
app.use("/", documentsRoutes);
app.use("/", internalDocumentsRoutes);
app.use("/", communicationRoutes);
app.use("/", notificationsRoutes);
app.use("/", auditRoutes);
app.use("/", messagingRoutes);
app.use("/", etudiantsRoutes);
app.use("/", agentRequestsRoutes);
app.use("/", supportRoutes);
app.use("/", cultureRoutes);
app.use("/", receptionRoutes);

// Ici tu ajouteras plus tard : routes de gestion des démarches consulaires, légalisations, etc.

// Gestionnaire d’erreurs centralisé — doit rester le dernier middleware.
app.use(errorHandler);

export default app;
