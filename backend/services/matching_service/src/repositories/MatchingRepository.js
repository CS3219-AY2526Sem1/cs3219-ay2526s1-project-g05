import { RedisClient } from '../database/RedisClient.js';

export class MatchingRepository {
    constructor() {
        this.redis = null;
        // stored using sorted set
        this.QUEUE_KEY = 'matching:queue';
        // stored using hash
        this.SESSION_PREFIX = 'matching:session:';
        // stored as user string
        this.USER_PREFIX = 'matching:user:';
        // stored using hash
        this.ACTIVE_LISTENERS_KEY = 'matching:active_listeners';
        // stored using string
        this.PENDING_MATCHES_KEY = 'matching:pending:';

        this.QUEUE_WINDOW = 100; // Number of sessions to consider when matching
    }

    async initialize() {
        await RedisClient.connect();
        this.redis = RedisClient.getClient();
    }

    async enterQueue(user, sessionId, criteria) {
        const queueEntry = {
            user: JSON.stringify(user),
            criteria: JSON.stringify(criteria),
            timestamp: Date.now().toString()
        };

        const multi = this.redis.multi();

        // Add to sorted set prefix z (queue) with timestamp as score for FIFO ordering
        multi.zAdd(this.QUEUE_KEY, {
            score: Date.now(),
            value: sessionId
        });

        // Store session details
        multi.hSet(`${this.SESSION_PREFIX}${sessionId}`, queueEntry);

        // Store user to session mapping for duplicate prevention
        multi.set(`${this.USER_PREFIX}${user.id}`, sessionId);

        await multi.exec();
        return true;
    }

    meetsCriteria(criteria, otherCriteria) {
        const criteriaTopics = criteria.topics || [];
        const otherTopics = otherCriteria.topics || [];

        const criteriaDifficulty = criteria.difficulty || null;
        const otherDifficulty = otherCriteria.difficulty || null;

        if (criteriaDifficulty && otherDifficulty && criteriaDifficulty !== otherDifficulty) {
            return false;
        }

        // intersection of A and B
        return this.topicsMatch(criteriaTopics, otherTopics) &&
            this.topicsMatch(otherTopics, criteriaTopics);
    }

    topicsMatch(requiredTopics, availableTopics) {
        if (requiredTopics.length === 0) {
            return true;
        }
        if (availableTopics.length === 0) {
            return false;
        }
        const availableSet = new Set(availableTopics);
        return requiredTopics.some(topic => availableSet.has(topic));
    }

    async dequeueAndLockUser(criteria) {
        // Get a batch of sessions for performance
        // TODO: what if queue is very large and match is far down the queue?
        const sessionIds = await this.redis.zRange(this.QUEUE_KEY, 0, this.QUEUE_WINDOW);

        for (const sessionId of sessionIds) {
            const sessionData = await this.redis.hGetAll(`${this.SESSION_PREFIX}${sessionId}`);

            if (!sessionData.criteria) {
                await this.removeFromQueue(sessionId); // corrupt sesh
                continue;
            }

            const queuedCriteria = JSON.parse(sessionData.criteria);
            if (this.meetsCriteria(criteria, queuedCriteria)) {
                const user = JSON.parse(sessionData.user);
                const userKey = `${this.USER_PREFIX}${user.id}`;

                // optimistic locking, will abort if concurrent change
                this.redis.watch(this.QUEUE_KEY);

                const multi = this.redis.multi();

                multi.zScore(this.QUEUE_KEY, sessionId); // check if still present

                multi.zRem(this.QUEUE_KEY, sessionId);
                multi.del(`${this.SESSION_PREFIX}${sessionId}`);
                multi.del(userKey);

                const result = await multi.exec();
                if (result === null) {
                    console.warn(`WATCH failed for session ${sessionId}. Retrying match...`);
                    continue;
                }

                const zScoreResult = result[0];
                if (zScoreResult === null) {
                    // This means the element was already removed just before our ZSCORE check.
                    continue;
                }
                return {
                    user: user,
                    sessionId: sessionId,
                    criteria: queuedCriteria
                };
            }
        }

        // no match
        return null;
    }

    async removeFromQueue(sessionId) {
        const sessionData = await this.redis.hGetAll(`${this.SESSION_PREFIX}${sessionId}`);

        const multi = this.redis.multi();

        if (sessionData.user) {
            const user = JSON.parse(sessionData.user);
            multi.del(`${this.USER_PREFIX}${user.id}`);
        }

        multi.zRem(this.QUEUE_KEY, sessionId);
        multi.del(`${this.SESSION_PREFIX}${sessionId}`);

        await multi.exec();
        return true;
    }

    async getStaleSessions(timeoutMs = 300000) {
        const now = Date.now();
        const staleSessionIds = [];
        const sessionIds = await this.redis.zRange(this.QUEUE_KEY, 0, -1);
        for (const sessionId of sessionIds) {
            const sessionTimestamp = await this.redis.hGet(`${this.SESSION_PREFIX}${sessionId}`, 'timestamp');

            if (sessionTimestamp && (now - parseInt(sessionTimestamp, 10) > timeoutMs)) {
                console.log(`Found stale session: ${sessionId} stale by ${now - parseInt(sessionTimestamp, 10)} ms`);
                staleSessionIds.push(sessionId);
            }
        }
        return staleSessionIds;
    }

    async sessionInQueue(sessionId) {
        return (await this.redis.zScore(this.QUEUE_KEY, sessionId)) !== null;
    }

    async userInQueue(user) {
        return (await this.redis.exists(`${this.USER_PREFIX}${user.id}`)) === 1;
    }

    async addActiveListener(sessionId) {
        await this.redis.hSet(this.ACTIVE_LISTENERS_KEY, sessionId, Date.now().toString());
        return true;
    }

    async removeActiveListener(sessionId) {
        await this.redis.hDel(this.ACTIVE_LISTENERS_KEY, sessionId);
        return true;
    }

    async isActiveListener(sessionId) {
        return (await this.redis.hExists(this.ACTIVE_LISTENERS_KEY, sessionId)) === 1;
    }

    async storePendingMatch(sessionId, matchData) {
        const key = `${this.PENDING_MATCHES_KEY}${sessionId}`;
        // Set with expiration of 3 minutes
        // TODO: notify matched user if this pending match not retrieved in time
        await this.redis.set(key, JSON.stringify(matchData), 'EX', 180);
        return true;
    }

    async getPendingMatch(sessionId) {
        const key = `${this.PENDING_MATCHES_KEY}${sessionId}`;
        // read and consume atomically
        const matchData = await this.redis.getDel(key);
        if (matchData) {
            return JSON.parse(matchData);
        }
        return null;
    }

    async removePendingMatch(sessionId) {
        await this.redis.del(`${this.PENDING_MATCHES_KEY}${sessionId}`);
        return true;
    }

    // Complete cleanup for a session
    async cleanupSession(sessionId) {
        const multi = this.redis.multi();

        const sessionData = await this.redis.hGetAll(`${this.SESSION_PREFIX}${sessionId}`);

        if (sessionData.user) {
            const user = JSON.parse(sessionData.user);
            multi.del(`${this.USER_PREFIX}${user.id}`);
        }

        // Remove from all Redis structures
        multi.zRem(this.QUEUE_KEY, sessionId);
        multi.del(`${this.SESSION_PREFIX}${sessionId}`);
        multi.hDel(this.ACTIVE_LISTENERS_KEY, sessionId);
        multi.del(`${this.PENDING_MATCHES_KEY}${sessionId}`);

        await multi.exec();
        return true;
    }
};