export class MatchingRepository {
    constructor() {
        this.userQueue = null;
        this.matchStates = null;
        this.userMatches = null;
        this.activeListeners = null;
        this.QUEUE_WINDOW = 100; // Number of sessions to consider when matching
    }

    async initialize() {
        this.userQueue = {};
        this.matchStates = {};
        this.userMatches = {};
        this.activeListeners = new Set();
    }

    // --- Criteria and Utility ---

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

    meetsCriteria(criteria, otherCriteria) {
        const criteriaTopics = criteria.topics || [];
        const otherTopics = otherCriteria.topics || [];

        const criteriaDifficulty = criteria.difficulty || null;
        const otherDifficulty = otherCriteria.difficulty || null;

        if (criteriaDifficulty && otherDifficulty && criteriaDifficulty !== otherDifficulty) {
            return false;
        }

        return this.topicsMatch(criteriaTopics, otherTopics) &&
            this.topicsMatch(otherTopics, criteriaTopics);
    }

    // --- User State ---

    async getUserData(userId) {
        return this.userQueue[userId] || null;
    }

    async userInQueue(userId) {
        return userId in this.userQueue;
    }

    // --- Queue Management ---

    async enterQueue(user, criteria, score = null) {
        const userId = user.id;
        const sessionData = {
            user: user,
            criteria: criteria,
            timestamp: score || Date.now()
        };
        this.userQueue[userId] = sessionData;
        return userId;
    }

    async findMatch(userId, criteria) {
        const window = Object.keys(this.userQueue).slice(0, this.QUEUE_WINDOW);

        for (const queuedUserId of window) {
            if (queuedUserId === userId || this.userMatches[queuedUserId]) {
                continue; 
            }
            const sessionData = this.userQueue[queuedUserId];

            const queuedCriteria = sessionData.criteria;

            if (this.meetsCriteria(criteria, queuedCriteria)) {
                return {
                    user: sessionData.user,
                    criteria: queuedCriteria,
                    userId: queuedUserId
                };
            }
        }
        return null;
    }

    // --- Match State management ---

    async getMatchId(userId) {
        return this.userMatches[userId] || null;
    }

    async getMatchState(matchId) {
        return this.matchStates[matchId] || null;
    }

    async storeMatchState(matchId, matchState) {
        matchState.timestamp = Date.now(); // STORE TIMESTAMP FOR STALE CHECKS
        this.matchStates[matchId] = matchState;
        return true;
    }

    async storePendingMatch(userId, matchId) {
        this.userMatches[userId] = matchId;
        return true;
    }

    async getPendingMatch(userId) {
        const matchId = await this.getMatchId(userId);
        return this.matchStates[matchId] || null;
    }

    // --- Cleanup and Deletion ---

    async deletePendingMatch(userId) {
        const matchId = await this.getMatchId(userId);
        if (!matchId) {
            return false;
        }
        delete this.userMatches[userId];
        return true;
    }

    async deleteUser(userId) {
        delete this.userQueue[userId];
        await this.deletePendingMatch(userId);
        this.removeActiveListener(userId);
        return true;
    }

    async deleteMatch(matchId) {
        const matchState = await this.getMatchState(matchId);
        if (matchState) {
            for (const userId in matchState.users) {
                if (Object.prototype.hasOwnProperty.call(matchState.users, userId)) {
                    await this.deletePendingMatch(userId);
                }
            }
        }
        delete this.matchStates[matchId];
        return true;
    }

    // --- Active Listener Management ---

    async addActiveListener(userId) {
        this.activeListeners.add(userId);
        return true;
    }

    async removeActiveListener(userId) {
        this.activeListeners.delete(userId);
        return true;
    }

    async isActiveListener(userId) {
        return this.activeListeners.has(userId);
    }

    // --- Stale Session Management ---

    async getStaleSessions(timeoutMs = 300000) {
        const now = Date.now();
        const staleSessionIds = [];
        for (const userId in this.userQueue) {
            const sessionData = this.userQueue[userId];
            if (sessionData.timestamp && (now - parseInt(sessionData.timestamp, 10) > timeoutMs)) {
                staleSessionIds.push(userId);
            }
        }
        return staleSessionIds;
    }

    async getStaleMatches(timeoutMs = 180000) {
        const now = Date.now();
        const staleMatchIds = [];
        for (const matchId in this.matchStates) {
            const matchState = this.matchStates[matchId];
            if (matchState.timestamp && (now - parseInt(matchState.timestamp, 10) > timeoutMs)) {
                staleMatchIds.push(matchId);
            }
        }
        return staleMatchIds;
    }
};