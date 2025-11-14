import { CodeExecutionApplication } from './src/CodeExecutionApplication.js';

const port = process.env.CODEEXECUTIONPORT || 4005;
const codeExecutionApp = new CodeExecutionApplication({ port });

let service;

const start = async () => {
    try {
        service = await codeExecutionApp.start();
    } catch (error) {
        console.error('Failed to start code execution service:', error);
        process.exit(1);
    }
};

start();

const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    if (service) {
        await new Promise((resolve) => service.close(resolve));
    }
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));