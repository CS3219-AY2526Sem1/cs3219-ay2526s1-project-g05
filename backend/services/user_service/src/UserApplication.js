import express from "express";
import { MongoClientInstance } from "../../../common_scripts/mongo.js";
import { PasswordHasher } from "./utils/PasswordHasher.js";
import { UserRepository } from "./repositories/UserRepository.js";
import { UserService } from "./services/UserService.js";
import {
  UserController,
  errorMiddleware,
} from "./controllers/UserController.js";
import { createUserRouter } from "./routes/userRoutes.js";

export class UserApplication {
  constructor({ port = process.env.USERSERVICEPORT || 4001 } = {}) {
    this.port = port;
    this.app = null;
  }

  async init() {
    if (this.app) {
      return this.app;
    }

    await MongoClientInstance.start();
    const repository = await UserRepository.initialize(MongoClientInstance.db);
    const passwordHasher = new PasswordHasher();
    const userService = new UserService({ repository, passwordHasher });
    const controller = new UserController(userService);

    const app = express();
    app.use(express.json());

    app.get("/status", (_req, res) => {
      res.json({ status: "User service is running" });
    });

    app.use("/users", createUserRouter(controller));

    app.use(errorMiddleware);

    this.app = app;
    return app;
  }

  async start() {
    const app = await this.init();
    return new Promise((resolve) => {
      this.server = app.listen(this.port, () => {
        console.log(`User service listening on port ${this.port}`);
        resolve(this.server);
      });
    });
  }
}
