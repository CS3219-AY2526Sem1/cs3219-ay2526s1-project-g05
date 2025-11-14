import express from "express";
import cors from "cors";
import {
  errorMiddleware,
  MatchingController,
} from "./controllers/MatchingController.js";
import { createMatchingRouter } from "./routes/matchingRoutes.js";
import { MatchingService } from "./services/MatchingService.js";
import { MatchingRepository } from "./repositories/MatchingRepository.js";
import { startSwaggerDocs } from "../../../common_scripts/swagger_docs.js";

export class MatchingServiceApplication {
  constructor({ port = process.env.MATCHINGSERVICEPORT || 4003 } = {}) {
    this.port = port;
    this.app = null;
  }

  async init() {
    if (this.app) {
      return this.app;
    }

    const app = express();
    const repository = new MatchingRepository();
    await repository.initialize();

    const service = new MatchingService({ repository });
    const controller = new MatchingController(service);

    // set circular dependency
    await service.setNotifier(controller);

    // store object in the class fields to call cleanup interval
    this.service = service;

    // periodic cleanup of stale sessions every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.service.cleanupStaleSessions().catch((err) => {
        console.error("Stale cleanup worker failed:", err);
      });
      this.service.cleanupStaleMatches().catch((err) => {
        console.error("Stale match cleanup worker failed:", err);
      });
    }, 2 * 60 * 1000);

    app.use(express.json());
    startSwaggerDocs(app, "Matching Service API", this.port);

    if (process.env.NODE_ENV === "development") {
      app.use(cors());
    }
    app.get("/health", (_req, res) => {
      res.json({ status: "Matching service is running" });
    });
    app.use("/", createMatchingRouter(controller));

    app.use(errorMiddleware);

    this.app = app;
    return this.app;
  }

  async start() {
    const app = await this.init();
    return new Promise((resolve) => {
      this.server = app.listen(this.port, () => {
        console.log(`Matching service listening on port ${this.port}`);
        resolve(this.server);
      });
    });
  }
}
