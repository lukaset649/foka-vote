import cors from "cors";
import express from "express";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, service: "api" });
  });

  return app;
}