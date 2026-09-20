import express, { Express } from "express";
import { json } from "body-parser";
import cors from "cors";
import { errorHandler, auditTrail } from "@poramma/utils";
import { writeAudit } from "./shared/audit";
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import rolesRoutes from "./modules/roles/roles.routes";
import agentsRoutes from "./modules/agents/agents.routes";
import profileRoutes from "./modules/profile/profile.routes";

const app: Express = express();

// Derrière le gateway nginx (Phase 9) — sans ça, req.ip lirait l'adresse
// interne du conteneur gateway plutôt que le vrai client, faussant tous les
// logs d'audit (LOGIN, LOGIN_ATTEMPT, ...). "1" = fait confiance au premier
// hop devant l'app (le gateway), lit X-Forwarded-For qu'il pose.
app.set("trust proxy", 1);

// Autoriser les frontends (staff + citoyen) à accéder à l'API — plusieurs
// origines possibles en dev (frontend-embassy:5173, frontend-community:5174),
// CORS_ORIGIN peut surcharger avec une liste séparée par des virgules.
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",").map((o) => o.trim());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(json());

// Journal d'audit systématique (voir @poramma/utils audit-trail) : les actions de
// modification authentifiées (utilisateurs, agents, rôles, profil…) sont toujours tracées.
app.use(auditTrail({ write: (entry) => writeAudit(entry) }));

// Routes principales
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
// roles.routes.ts defines its own top-level paths (/roles, /permissions,
// /users/:userId/roles) rather than a single resource prefix — mounted at
// root to match those flat paths exactly.
app.use("/", rolesRoutes);
app.use("/agents", agentsRoutes);
app.use("/profile", profileRoutes);

// Gestionnaire d’erreurs centralisé — doit rester le dernier middleware.
app.use(errorHandler);

export default app;
