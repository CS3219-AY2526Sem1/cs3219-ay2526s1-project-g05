import { config } from "dotenv";
import { CollaborationApplication } from "./src/CollaborationApplication.js";

const port = process.env.COLLABORATIONSERVICEPORT || 4004;
const application = new CollaborationApplication({ port });

let server;

const start = async () => {
  try {
    server = await application.start();
  } catch (error) {
    console.error("Failed to start collaboration service", error);
    process.exit(1);
  }
}

start();

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
