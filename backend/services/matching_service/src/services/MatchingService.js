import { ApiError } from "../errors/ApiError.js";
import crypto from "crypto";

export class MatchingService {
    constructor({ repository }) {
        this.repository = repository;
        this.notifier = null;
    }

    async setNotifier(controller) {
        this.notifier = controller;
    }

    createSessionId(user) {
        const uuid = crypto.randomUUID();
        return `session-${user.id}-${uuid}`;
    }
    createMatchId() {
        return `match-${crypto.randomUUID()}`;
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

        // immediately look for a match in the queue
        const matchedUser = await this.repository.findMatch(criteria);
        const sessionId = this.createSessionId(user);
        await this.repository.enterQueue(user, sessionId, criteria);

        if (!matchedUser) {
            return sessionId;
        }

        const userA = { user: matchedUser.user, sessionId: matchedUser.sessionId };
        const userB = { user: user, sessionId: sessionId };

        const commonMatchData = {
            criteria: criteria
            // TODO: get question and remove criteria
        };

        const matchId = this.createMatchId();

        const initialMatchState = {
            matchId: matchId,
            status: 'pending', // for debugging
            users: {
                [userA.sessionId]: {
                    confirmed: false,
                    user: userA.user,
                    matchDetails: { ...commonMatchData, partner: userB.user, partnerSessionId: userB.sessionId }
                },
                [userB.sessionId]: {
                    confirmed: false,
                    user: userB.user,
                    matchDetails: { ...commonMatchData, partner: userA.user, partnerSessionId: userA.sessionId }
                }
            }
        };

        await this.repository.storeMatchState(matchId, initialMatchState);
        await this.repository.storePendingMatch(userA.sessionId, matchId);
        await this.repository.storePendingMatch(userB.sessionId, matchId);

        const isUserAActive = await this.repository.isActiveListener(userA.sessionId);
        if (isUserAActive) {
            this.notifier.notifyMatchFound(userA.sessionId, initialMatchState.users[userA.sessionId].matchDetails);
            await this.repository.removeActiveListener(userA.sessionId);
        }

        // just in case
        const isUserBActive = await this.repository.isActiveListener(userB.sessionId);
        if (isUserBActive) {
            this.notifier.notifyMatchFound(userB.sessionId, initialMatchState.users[userB.sessionId].matchDetails);
            await this.repository.removeActiveListener(userB.sessionId);
        }

        return sessionId;
    }

    async addActiveListener(sessionId) {
        if (!sessionId) {
            throw new ApiError(400, "Session ID is required to add active listener.");
        }
        if (await this.repository.sessionExists(sessionId) === false) {
            throw new ApiError(404, "Session ID not found.");
        }
        await this.repository.addActiveListener(sessionId);
        return true;
    }

    async removeActiveListener(sessionId) {
        if (!sessionId) {
            throw new ApiError(400, "Session ID is required to remove active listener.");
        }
        await this.repository.removeActiveListener(sessionId);
        return true;
    }

    async getPendingMatch(sessionId) {
        if (!sessionId) {
            throw new ApiError(400, "Session ID is required to check the pending queue.");
        }
        return await this.repository.getPendingMatch(sessionId);
    }

    async confirmMatch(sessionId) {
        const matchId = await this.repository.getMatchIdFromSession(sessionId);
        if (!matchId) {
            throw new ApiError(404, "Pending match not found.");
        }

        let matchState = await this.repository.getMatchState(matchId);
        if (!matchState) {
            throw new ApiError(404, "Match expired or finalized.");
        }
        if (matchState.users[sessionId].confirmed) {
            throw new ApiError(400, "Match already confirmed.");
        }
        
        matchState.users[sessionId].confirmed = true;
        const partnerSessionId = matchState.users[sessionId].matchDetails.partnerSessionId;
        const partnerConfirmed = matchState.users[partnerSessionId].confirmed;

        if (partnerConfirmed) {
            // 2nd user to confirm handles cleanup
            await this.repository.deleteMatch(matchId);
            await this.repository.deleteSession(sessionId);
            await this.repository.deleteSession(partnerSessionId);

            // TODO: query collab service
            const collabId = `collab-${matchId}`;

            this.notifier.notifyMatchFinalized(partnerSessionId, { token: collabId });
            this.notifier.notifyMatchFinalized(sessionId, { token: collabId });
            return { status: 'completed' };
        }

        await this.repository.updateMatchState(matchId, matchState);
        return { status: 'waiting' };
    }

    async cleanupStaleSessions() {
        const timeoutMs = 5 * 60 * 1000;
        const staleSessionIds = await this.repository.getStaleSessions(timeoutMs);
        if (staleSessionIds.length === 0) {
            return;
        }
        for (const sessionId of staleSessionIds) {
            this.notifier.notifySessionExpired(sessionId);
            await this.clearMatchAndSession(sessionId);
            // TODO: give user option to requeue or cancel
        }
    }

    async rejoinQueueWithPriority(oldSessionId, user, criteria) {
        if (!oldSessionId || !user || !criteria) {
            throw new ApiError(400, "Old Session ID, User, and Criteria are required.");
        }
        await this.repository.deleteSession(oldSessionId);
        const newSessionId = this.createSessionId(user);

        const PRIORITY_OFFSET = 10 * 60 * 1000;
        const priorityScore = Date.now() - PRIORITY_OFFSET;

        await this.repository.enterQueue(user, newSessionId, criteria, priorityScore);
        return newSessionId;
    }

    // Deletes the pending match if present, and deletes the session data, plus notifies partner if matched
    async clearMatchAndSession(sessionId) {
        if (!sessionId) {
            throw new ApiError(400, "Session ID is required to clear from queue and pending match.");
        }
        const matchId = await this.repository.getMatchIdFromSession(sessionId);
        if (matchId) {
            const matchState = await this.repository.getMatchState(matchId);
            if (matchState) {
                await this.repository.deleteMatch(matchId);
                const partnerSessionId = matchState.users[sessionId].matchDetails.partnerSessionId;
                this.notifier.notifyMatchCancelled(partnerSessionId, { message: `Partner cancelled match request. You have been re-queued with priority.` });
            }
        }
        await this.repository.deleteSession(sessionId);
        return true;
    }

    // called by redis subscriber upon pendingmatch key expiration
    async handleMatchTimeout(expiredMatchId) {
        const matchState = await this.repository.getPersistentMatchState(expiredMatchId);
        if (!matchState) {
            return;
        }

        const userASessionId = matchState.users[Object.keys(matchState.users)[0]].matchDetails.partnerSessionId;
        const userBSessionId = matchState.users[userASessionId].matchDetails.partnerSessionId;

        const userAConfirmed = matchState.users[userASessionId].confirmed;
        const userBConfirmed = matchState.users[userBSessionId].confirmed;

        let requeueSessionId = null;

        if (userAConfirmed && !userBConfirmed) {
            requeueSessionId = userASessionId;
        } else if (userBConfirmed && !userAConfirmed) {
            requeueSessionId = userBSessionId;
        }

        let sessionData = null;
        if (requeueSessionId) {
            sessionData = await this.repository.getSessionData(requeueSessionId);
        }

        await this.repository.deleteMatch(expiredMatchId);

        if (sessionData) {
            const requeueUser = JSON.parse(sessionData.user);
            const requeueCriteria = JSON.parse(sessionData.criteria);
            const newSessionId = await this.rejoinQueueWithPriority(requeueSessionId, requeueUser, requeueCriteria);
            this.notifier.notifyMatchCancelled(requeueSessionId, { message: `Partner timed out. You have been re-queued with priority, use newSessionId:${newSessionId}.` });
        }
    }
}