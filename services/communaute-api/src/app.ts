import express, { Express } from "express";
import { json } from "body-parser";
import cors from "cors";
import { errorHandler } from "@poramma/utils";
import servicesRoutes from "./modules/services/services.routes";
import profileRoutes from "./modules/profile/profile.routes";
import documentsRoutes from "./modules/documents/documents.routes";
import demandesRoutes from "./modules/demandes/demandes.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import rendezvousRoutes from "./modules/rendezvous/rendezvous.routes";
import campagnesRoutes, { campagnesMediaRouter } from "./modules/campagnes/campagnes.routes";
import supportRoutes from "./modules/support/support.routes";
import cultureRoutes from "./modules/culture/culture.routes";

const app: Express = express();

// Derrière le gateway nginx — sans ça, req.ip lirait l'adresse interne du
// conteneur gateway plutôt que le vrai client (voir identity-api/ambassade-api's app.ts).
app.set("trust proxy", 1);

// Plusieurs origines possibles en dev (frontend-embassy:5173,
// frontend-community:5174) — même pattern qu'identity-api/ambassade-api.
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",").map((o) => o.trim());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(json());

app.get("/", (req, res) => {
  res.json({
    service: "Communauté API",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/", servicesRoutes);
// Média par URL signée : AVANT les routeurs qui exigent requireAuth sur "/".
app.use("/", campagnesMediaRouter);
app.use("/", profileRoutes);
app.use("/", documentsRoutes);
app.use("/", demandesRoutes);
app.use("/", notificationsRoutes);
app.use("/", rendezvousRoutes);
app.use("/", campagnesRoutes);
app.use("/", supportRoutes);
app.use("/", cultureRoutes);

// Gestionnaire d'erreurs centralisé — doit rester le dernier middleware.
app.use(errorHandler);

export default app;
