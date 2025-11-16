import { createClient } from 'redis';

export class RedisClient {
    static client = null;
    static isConnected = false;

    static async connect() {
        if (RedisClient.client && RedisClient.isConnected) {
            console.info("Redis client already connected");
            return RedisClient.client;
        }

        try {
            RedisClient.client = createClient({
                socket: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: process.env.REDIS_PORT || 6379,
                },
                // password: process.env.REDIS_PASSWORD,
            });

            RedisClient.client.on('error', (err) => {
                console.error('Redis Client Error:', err);
                RedisClient.isConnected = false;
            });

            RedisClient.client.on('connect', () => {
                console.info('Redis client connected');
                RedisClient.isConnected = true;
            });

            RedisClient.client.on('disconnect', () => {
                console.info('Redis client disconnected');
                RedisClient.isConnected = false;
            });

            await RedisClient.client.connect();
            return RedisClient.client;
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    static async disconnect() {
        if (RedisClient.client && RedisClient.isConnected) {
            await RedisClient.client.quit();
            RedisClient.client = null;
            RedisClient.isConnected = false;
            console.info('Redis client disconnected');
        }
    }

    static getClient() {
        if (!RedisClient.client || !RedisClient.isConnected) {
            throw new Error('Redis client not connected. Call connect() first.');
        }
        return RedisClient.client;
    }
}