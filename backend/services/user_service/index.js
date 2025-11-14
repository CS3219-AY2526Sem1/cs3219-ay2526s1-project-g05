import { UserServiceApplication } from "./src/UserServiceApplication.js";
import { MongoClientInstance } from "../../common_scripts/mongo.js";
import dotenv from "dotenv";
import path from "path"

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.join(import.meta.dirname, "..", ".env.prod") });
} else {
  dotenv.config({ path: path.join(import.meta.dirname, "..", ".env") });
}

const port = process.env.USERSERVICEPORT || 4001;
const application = new UserServiceApplication({ port });

let server;

const start = async () => {
  try {
    server = await application.start();
  } catch (error) {
    console.error("Failed to start user service", error);
    process.exit(1);
  }
};

start();

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await MongoClientInstance.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
