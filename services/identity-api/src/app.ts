import express, { Express } from "express";
import { json } from "body-parser";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";

const app: Express = express();

// Autoriser le frontend à accéder à l’API
app.use(
  cors({
    origin: "http://localhost:5173", // ou "*" si tu veux autoriser tout (moins sécurisé)
    credentials: true,
  })
);

app.use(json());

// Routes principales
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);

export default app;
