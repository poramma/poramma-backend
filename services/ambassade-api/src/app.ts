import express, { Express } from "express";
import { json } from "body-parser";

const app: Express = express();

// Middlewares globaux
app.use(json());


// Exemple de route racine
app.get("/", (req, res) => {
  res.json({
    service: "Ambassade API",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// Ici tu ajouteras plus tard : routes de gestion des démarches consulaires, RDV, légalisations, etc.

export default app;
