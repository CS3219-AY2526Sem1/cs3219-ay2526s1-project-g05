import { MatchingServiceApplication } from './src/MatchingServiceApplication.js';
import { RedisClient } from './src/redis/RedisClient.js';
import dotenv from 'dotenv';
import path from "path"

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.join(import.meta.dirname, "..", ".env.prod") });
} else {
  dotenv.config({ path: path.join(import.meta.dirname, "..", ".env") });
}
const port = process.env.MATCHINGSERVICEPORT || 4003;
const matchingApp = new MatchingServiceApplication({ port });

let service;

const start = async () => {
    try {
        service = await matchingApp.start();
    } catch (error) {
        console.error('Failed to start matching service:', error);
        process.exit(1);
    }
};

start();

const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    if (service) {
        await new Promise((resolve) => service.close(resolve));
    }
    await RedisClient.disconnect();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));