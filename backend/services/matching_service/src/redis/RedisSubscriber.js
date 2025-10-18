import { RedisClient } from './RedisClient.js';

export class RedisSubscriber {
    constructor(matchingService) {
        this.service = matchingService;
        this.subscriber = null;
        this.CHANNEL = '__keyevent@0__:expired'; // Channel for key expiration events (DB 0)
    }

    async start() {
        const client = RedisClient.createSubscriberClient();
        await client.connect();
        // Subscribe to the expiration channel
        await client.subscribe(this.CHANNEL, (message, channel) => {
            if (channel === this.CHANNEL) {
                this._handleExpiration(message);
            }
        });
        this.subscriber = client;
    }

    _handleExpiration(key) {
        if (key.startsWith(this.service.repository.MATCH_DATA_KEY)) {
            const matchId = key.replace(this.service.repository.MATCH_DATA_KEY, '');
            try {
                this.service.handleMatchTimeout(matchId);
            } catch (error) {
                console.error(`❌ Error handling timeout for match ${matchId}:`, error);
            }
        }
    }

    async stop() {
        if (this.subscriber) {
            await this.subscriber.unsubscribe(this.CHANNEL);
            await this.subscriber.quit();
            this.subscriber = null;
            console.log('Redis Subscriber stopped');
        }
    }
}