import { ApiError } from "../errors/ApiError.js";
import crypto from "crypto";

export class MatchingService {
    constructor({ repository }) {
        this.repository = repository;
        // circular dependency on controller for notifying matches
        this.notifier = null;
    }

    async setNotifier(controller) {
        this.notifier = controller;
    }

    async enterQueue(user, criteria) {
        if (!user || !criteria) {
            throw new ApiError(400, "User and criteria are required to enter the queue.");
        }
        if (await this.repository.userInQueue(user)) {
            throw new ApiError(400, "User is already in the queue.");
        }
        if (typeof criteria !== 'object') {
            throw new ApiError(400, "Criteria must be an object.");
        }
        if (!criteria.difficulty || !Array.isArray(criteria.topics)) {
            throw new ApiError(400, "Criteria must include 'difficulty' and 'topics' array.");
        }

        const matchedUser = await this.repository.dequeueAndLockUser(criteria);
        const sessionId = this.createSessionId(user);

        if (!matchedUser) {
            await this.repository.enterQueue(user, sessionId, criteria);
            return sessionId;
        }

        const matchData = {
            // TODO: query collab service and question service
            criteria: criteria
        };

        // Check if matched user called getStatus
        const isMatchedUserWaitingActive = await this.repository.isActiveListener(matchedUser.sessionId);
        const matchedUserMatchDetails = { ...matchData, partner: user, partnerSessionId: sessionId };

        if (isMatchedUserWaitingActive) {
            this.notifier.notifyMatchFound(matchedUser.sessionId, matchedUserMatchDetails);
            await this.repository.removeActiveListener(matchedUser.sessionId);
        } else {
            await this.repository.storePendingMatch(matchedUser.sessionId, matchedUserMatchDetails);
        }

        // Check if new user called getStatus even before we return the sessionId (edge case)
        const isNewUserWaitingActive = await this.repository.isActiveListener(sessionId);
        const newUserMatchDetails = { ...matchData, partner: matchedUser.user, partnerSessionId: matchedUser.sessionId };

        if (isNewUserWaitingActive) {
            this.notifier.notifyMatchFound(sessionId, newUserMatchDetails);
            await this.repository.removeActiveListener(sessionId);
        } else {
            await this.repository.storePendingMatch(sessionId, newUserMatchDetails);
        }

        return sessionId;
    }

    async addActiveListener(sessionId) {
        if (!sessionId) {
            throw new ApiError(400, "Session ID is required to add active listener.");
        }
        const pendingMatch = await this.repository.getPendingMatch(sessionId);
        // match found already, dont need to add to active listeners
        if (pendingMatch) {
            return { notified: true, data: pendingMatch };
        }
        if (!(await this.repository.sessionInQueue(sessionId))) {
            // either already matched or invalid
            throw new ApiError(404, "Session ID not found in queue.");
        }
        await this.repository.addActiveListener(sessionId);
        return { notified: false };
    }

    // use case: User is in queue but no match found yet, getstatus not called and decides to quit
    async clearFromQueue(sessionId) {
        if (!sessionId) {
            throw new ApiError(400, "Session ID is required to clear from the queue.");
        }
        // Use repository's complete cleanup method
        const result = await this.repository.cleanupSession(sessionId);
        return result;
    }

    async checkPendingMatch(sessionId) {
        if (!sessionId) {
            throw new ApiError(400, "Session ID is required to check for pending matches.");
        }
        return await this.repository.getPendingMatch(sessionId);
    }

    async removeActiveListener(sessionId) {
        await this.repository.removeActiveListener(sessionId);
        return true;
    }

    async sessionInQueue(sessionId) {
        if (!sessionId) {
            throw new ApiError(400, "Session ID is required to check queue status.");
        }
        return await this.repository.sessionInQueue(sessionId);
    }

    async cleanupStaleSessions() {
        const timeoutMs = 5 * 60 * 1000;
        const staleSessionIds = await this.repository.getStaleSessions(timeoutMs);
        if (staleSessionIds.length === 0) {
            return;
        }
        for (const sessionId of staleSessionIds) {
            this.notifier.notifySessionExpired(sessionId);
            await this.repository.cleanupSession(sessionId);
        }
        console.log("Stale queue cleanup finished.");
    }

    // not used atm
    async removeFromQueue(user) {
        if (!user) {
            throw new ApiError(400, "User is required to remove from the queue.");
        }
        const result = await this.repository.removeFromQueue(user);
        return result;
    }

    // TODO: clean up queue after closing

    createSessionId(user) {
        const uuid = crypto.randomUUID();
        return `session-${uuid}`;
    }
}