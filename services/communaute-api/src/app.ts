import express, { Express } from "express";
import { json } from "body-parser";

const app: Express = express();

// Middlewares globaux
app.use(json());

// Exemple de route racine
app.get("/", (req, res) => {
  res.json({
    service: "Communauté API",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// Ici tu ajouteras plus tard : espace étudiant, demandes, messagerie, notifications, etc.

export default app;
