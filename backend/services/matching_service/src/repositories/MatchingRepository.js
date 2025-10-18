import { RedisClient } from '../redis/RedisClient.js';

export class MatchingRepository {
    constructor() {
        this.redis = null;
        this.QUEUE_KEY = 'matching:queue';
        this.SESSION_PREFIX = 'matching:session:';
        this.USER_PREFIX = 'matching:user:';

        this.ACTIVE_LISTENERS_KEY = 'matching:active_listeners';

        this.PERSISTENT_MATCH_DATA_KEY = 'matching:persistent_match:';
        this.MATCH_DATA_KEY = 'matching:match_data:';
        this.PENDING_MATCH_SESSION_KEY = 'matching:match_map:';

        this.QUEUE_WINDOW = 100; // Number of sessions to consider when matching
    }

    async initialize() {
        await RedisClient.connect();
        this.redis = RedisClient.getClient();
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

    async enterQueue(user, sessionId, criteria, score = null) {
        const sessionData = {
            user: JSON.stringify(user),
            criteria: JSON.stringify(criteria),
            timestamp: Date.now().toString()
        };

        const multi = this.redis.multi();

        multi.zAdd(this.QUEUE_KEY, {
            score: score || Date.now(),
            value: sessionId
        });

        multi.hSet(`${this.SESSION_PREFIX}${sessionId}`, sessionData);

        // Store user to session mapping for duplicate prevention
        multi.set(`${this.USER_PREFIX}${user.id}`, sessionId);

        await multi.exec();
        return true;
    }

    async findMatch(criteria) {
        // Get a batch of sessions rather than the entire list for performance
        // TODO: handle for what if match is after the first 100
        const sessionIds = await this.redis.zRange(this.QUEUE_KEY, 0, this.QUEUE_WINDOW);

        for (const sessionId of sessionIds) {
            if (await this.getMatchIdFromSession(sessionId)) {
                continue;
            }
            const sessionData = await this.redis.hGetAll(`${this.SESSION_PREFIX}${sessionId}`);

            const queuedCriteria = JSON.parse(sessionData.criteria);
            if (this.meetsCriteria(criteria, queuedCriteria)) {
                const user = JSON.parse(sessionData.user);
                return {
                    user: user,
                    sessionId: sessionId,
                    criteria: queuedCriteria
                };
            }
        }
        return null;
    }

    async getStaleSessions(timeoutMs = 300000) {
        const now = Date.now();
        const staleSessionIds = [];
        const sessionIds = await this.redis.zRange(this.QUEUE_KEY, 0, -1);
        for (const sessionId of sessionIds) {
            const sessionTimestamp = await this.redis.hGet(`${this.SESSION_PREFIX}${sessionId}`, 'timestamp');
            if (sessionTimestamp && (now - parseInt(sessionTimestamp, 10) > timeoutMs)) {
                staleSessionIds.push(sessionId);
            }
        }
        return staleSessionIds;
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

    async getMatchIdFromSession(sessionId) {
        return await this.redis.get(`${this.PENDING_MATCH_SESSION_KEY}${sessionId}`);
    }

    async getMatchState(matchId) {
        const data = await this.redis.get(`${this.MATCH_DATA_KEY}${matchId}`);
        return data ? JSON.parse(data) : null;
    }

    async getPersistentMatchState(matchId) {
        const data = await this.redis.get(`${this.PERSISTENT_MATCH_DATA_KEY}${matchId}`);
        return data ? JSON.parse(data) : null;
    }

    async updateMatchState(matchId, matchState) {
        // overwrites existing
        await this.redis.set(`${this.MATCH_DATA_KEY}${matchId}`, JSON.stringify(matchState), { KEEPTTL: true });
        await this.redis.set(`${this.PERSISTENT_MATCH_DATA_KEY}${matchId}`, JSON.stringify(matchState));
        return true;
    }

    async getPendingMatch(sessionId) {
        const matchId = await this.getMatchIdFromSession(sessionId);
        if (!matchId) {
            return null;
        }
        const matchState = await this.getMatchState(matchId);
        if (!matchState) {
            return null;
        }
        return matchState.users[sessionId].matchDetails;
    }

    async sessionExists(sessionId) {
        const sessionData = await this.getSessionData(sessionId);
        return Object.keys(sessionData).length > 0;
    }

    async getSessionData(sessionId) {
        return await this.redis.hGetAll(`${this.SESSION_PREFIX}${sessionId}`);
    }

    async userInQueue(user) {
        return (await this.redis.exists(`${this.USER_PREFIX}${user.id}`)) === 1;
    }

    async storeMatchState(matchId, matchState) {
        await this.redis.set(`${this.PERSISTENT_MATCH_DATA_KEY}${matchId}`, JSON.stringify(matchState));
        await this.redis.set(`${this.MATCH_DATA_KEY}${matchId}`, JSON.stringify(matchState), { EX: 180 });
        return true;
    }

    async storePendingMatch(sessionId, matchId) {
        const matchSessionKey = `${this.PENDING_MATCH_SESSION_KEY}${sessionId}`;
        await this.redis.set(matchSessionKey, matchId);
        return true;
    }

    // Complete cleanup for a session
    async deleteSession(sessionId) {
        const multi = this.redis.multi();

        const sessionData = await this.redis.hGetAll(`${this.SESSION_PREFIX}${sessionId}`);

        if (sessionData.user) {
            const user = JSON.parse(sessionData.user);
            multi.del(`${this.USER_PREFIX}${user.id}`);
        }

        multi.zRem(this.QUEUE_KEY, sessionId);
        multi.del(`${this.SESSION_PREFIX}${sessionId}`);
        multi.hDel(this.ACTIVE_LISTENERS_KEY, sessionId);
        multi.del(`${this.PENDING_MATCH_SESSION_KEY}${sessionId}`);
        await multi.exec();
        return true;
    }

    async deleteMatch(matchId) {
        const multi = this.redis.multi();

        multi.del(`${this.MATCH_DATA_KEY}${matchId}`);
        multi.del(`${this.PERSISTENT_MATCH_DATA_KEY}${matchId}`);

        await multi.exec();
        return true;
    }
};