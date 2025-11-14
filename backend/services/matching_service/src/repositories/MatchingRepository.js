import { RedisClient } from "../redis/RedisClient.js";

export class MatchingRepository {
  constructor() {
    // this.userQueue = null;
    // this.matchStates = null;
    // this.userMatches = null;
    // this.activeListeners = null;
    this.QUEUE_WINDOW = 100; // Number of sessions to consider when matching
    this.redis = null;
    this.MATCH_QUEUE_KEY = "match:queue";
    this.MATCH_QUEUE_DATA_PREFIX = "match:queue:data:";
    this.USER_MATCH_KEY = "match:user_matches";
    this.MATCH_STATE_PREFIX = "match:states:";
    this.MATCH_LISTENERS_KEY = "match:listeners";
  }

  async initialize() {
    // this.userQueue = {};
    // this.matchStates = {};
    // this.userMatches = {};
    // this.activeListeners = new Set();
    this.redis = await RedisClient.connect();
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
    return requiredTopics.some((topic) => availableSet.has(topic));
  }

  meetsCriteria(criteria, otherCriteria) {
    const criteriaTopics = criteria.topics || [];
    const otherTopics = otherCriteria.topics || [];

    const criteriaDifficulty = criteria.difficulty || null;
    const otherDifficulty = otherCriteria.difficulty || null;

    if (
      criteriaDifficulty &&
      otherDifficulty &&
      criteriaDifficulty !== otherDifficulty
    ) {
      return false;
    }

    return (
      this.topicsMatch(criteriaTopics, otherTopics) &&
      this.topicsMatch(otherTopics, criteriaTopics)
    );
  }

  // --- User State ---

  async getUserData(userId) {
    // return this.userQueue[userId] || null;
    const data = await this.redis.get(
      `${this.MATCH_QUEUE_DATA_PREFIX}${userId}`
    );
    return data ? JSON.parse(data) : null;
  }

  async userInQueue(userId) {
    // return userId in this.userQueue;
    const score = await this.redis.zScore(this.MATCH_QUEUE_KEY, userId);
    return score !== null;
  }

  // --- Queue Management ---

  async enterQueue(user, criteria, score = null) {
    const userId = user.id;
    const timestamp = score || Date.now();
    const sessionData = {
      user: user,
      criteria: criteria,
      timestamp: timestamp,
    };
    await this.redis.zAdd(this.MATCH_QUEUE_KEY, {
      score: timestamp,
      value: userId
    });
    await this.redis.set(
      `${this.MATCH_QUEUE_DATA_PREFIX}${userId}`,
      JSON.stringify(sessionData)
    );
    return userId;
  }

  async findMatch(userId, criteria) {
    const window = await this.redis.zRange(this.MATCH_QUEUE_KEY, 0, this.QUEUE_WINDOW - 1);

    for (const queuedUserId of window) {
      if (queuedUserId === userId) {
        continue;
      }
      
      if (await this.redis.hGet(this.USER_MATCH_KEY, queuedUserId)) {
        // user has a pending match
        continue;
      }

      let sessionData = await this.redis.get(
        `${this.MATCH_QUEUE_DATA_PREFIX}${queuedUserId}`
      );
      if (!sessionData) {
        continue;
      } else {
        sessionData = JSON.parse(sessionData);
      }

      const queuedCriteria = sessionData.criteria;

      if (this.meetsCriteria(criteria, queuedCriteria)) {
        return {
          user: sessionData.user,
          criteria: queuedCriteria,
          userId: queuedUserId,
        };
      }
    }
    return null;
  }

  // --- Match State management ---

  async getMatchId(userId) {
    // return this.userMatches[userId] || null;
    return await this.redis.hGet(this.USER_MATCH_KEY, userId);
  }

  async getMatchState(matchId) {
    // return this.matchStates[matchId] || null;
    const data = await this.redis.get(
      `${this.MATCH_STATE_PREFIX}${matchId}`
    );
    return data ? JSON.parse(data) : null;
  }

  async storeMatchState(matchId, matchState) {
    // Store a mapping of matchId to matchState
    matchState.timestamp = Date.now(); // STORE TIMESTAMP FOR STALE CHECKS
    // this.matchStates[matchId] = matchState;
    await this.redis.set(
      `${this.MATCH_STATE_PREFIX}${matchId}`,
      JSON.stringify(matchState)
    );
    return true;
  }

  async storePendingMatch(userId, matchId) {
    // Store a mapping of userId to matchId
    // this.userMatches[userId] = matchId;
    await this.redis.hSet(this.USER_MATCH_KEY, userId, matchId);
    return true;
  }

  async getPendingMatch(userId) {
    // Gets the matchState given a userId
    const matchId = await this.getMatchId(userId);
    // return this.matchStates[matchId] || null;
    if (!matchId) {
      return null;
    }
    const data = await this.redis.get(
      `${this.MATCH_STATE_PREFIX}${matchId}`
    );
    return data ? JSON.parse(data) : null;
  }

  // --- Cleanup and Deletion ---

  async deleteUserFromQueue(userId) {
    // delete this.userQueue[userId];
    await this.redis.zRem(this.MATCH_QUEUE_KEY, userId);
    await this.redis.del(`${this.MATCH_QUEUE_DATA_PREFIX}${userId}`);
    return true;
  }

  async deletePendingMatch(userId) {
    // Deletes the mapping of userId to matchId
    const matchId = await this.getMatchId(userId);
    if (!matchId) {
      return false;
    }
    // delete this.userMatches[userId];
    await this.redis.hDel(this.USER_MATCH_KEY, userId);
    return true;
  }

  async deleteUser(userId) {
    // delete this.userQueue[userId];
    // await this.deletePendingMatch(userId);
    // this.removeActiveListener(userId);
    await this.deleteUserFromQueue(userId);
    await this.deletePendingMatch(userId);
    await this.removeActiveListener(userId);
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
    // delete this.matchStates[matchId];
    await this.redis.del(`${this.MATCH_STATE_PREFIX}${matchId}`);
    return true;
  }

  // --- Active Listener Management ---

  async addActiveListener(userId) {
    // this.activeListeners.add(userId);
    await this.redis.sAdd(this.MATCH_LISTENERS_KEY, userId);
    return true;
  }

  async removeActiveListener(userId) {
    // this.activeListeners.delete(userId);
    await this.redis.sRem(this.MATCH_LISTENERS_KEY, userId);
    return true;
  }

  async isActiveListener(userId) {
    // return this.activeListeners.has(userId);
    return await this.redis.sIsMember(this.MATCH_LISTENERS_KEY, userId);
  }

  // --- Stale Session Management ---

  async getStaleSessions(timeoutMs = 300000) {
    const now = Date.now();
    const staleSessionIds = [];
    const userIds = await this.redis.zRange(this.MATCH_QUEUE_KEY, 0, -1);
    for (const userId of userIds) {
      const sessionData = await this.getUserData(userId);
      if (
        sessionData.timestamp &&
        now - parseInt(sessionData.timestamp, 10) > timeoutMs
      ) {
        staleSessionIds.push(userId);
      }
    }
    return staleSessionIds;
  }

  async getStaleMatches(timeoutMs = 180000) {
    const now = Date.now();
    const staleMatchIds = [];
    const matchIds = await this.redis.keys(`${this.MATCH_STATE_PREFIX}*`);
    for (const matchId of matchIds) {
      // Remove the prefix before passing to getMatchState
      const matchIdWithoutPrefix = matchId.startsWith(this.MATCH_STATE_PREFIX)
        ? matchId.slice(this.MATCH_STATE_PREFIX.length)
        : matchId;
      const matchState = await this.getMatchState(matchIdWithoutPrefix);
      if (
        matchState.timestamp &&
        now - parseInt(matchState.timestamp, 10) > timeoutMs
      ) {
        staleMatchIds.push(matchIdWithoutPrefix);
      }
    }
    return staleMatchIds;
  }
}
