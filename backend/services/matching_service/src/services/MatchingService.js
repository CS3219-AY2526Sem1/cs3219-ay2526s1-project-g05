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

    createMatchId() {
        return `match-${crypto.randomUUID()}`;
    }

    async _fetch_pro_max(uri, options) {
        try {
            const response = await fetch(uri, options);
            if (!response.ok) {
                throw new ApiError(response.status, `Failed to fetch: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            throw new ApiError(500, "Internal Server Error");
        }
    }

    _validateEntryRequest(user, criteria) {
        if (!user || !criteria) {
            throw new ApiError(400, "User and criteria are required to enter the queue.");
        }
        if (typeof criteria !== 'object' || !criteria.difficulty || !Array.isArray(criteria.topics)) {
            throw new ApiError(400, "Criteria must include 'difficulty' and 'topics' array.");
        }
    }

    async _handleMatchFound(userAId, userBId, commonMatchData) {
        const matchState = {
            status: 'pending',
            users: {
                [userAId]: {
                    confirmed: false,
                    matchDetails: { ...commonMatchData, partnerId: userBId }
                },
                [userBId]: {
                    confirmed: false,
                    matchDetails: { ...commonMatchData, partnerId: userAId }
                }
            },
        };

        await this.repository.storeMatchState(commonMatchData.matchId, matchState);
        await this.repository.storePendingMatch(userAId, commonMatchData.matchId);
        await this.repository.storePendingMatch(userBId, commonMatchData.matchId);

        await this.notifier.notifyUser(userAId, { matchDetails: matchState.users[userAId].matchDetails }, 'matchFound');
        await this.notifier.notifyUser(userBId, { matchDetails: matchState.users[userBId].matchDetails }, 'matchFound');

        return matchState;
    }

    async enterQueue(user, criteria) {
        this._validateEntryRequest(user, criteria);
        if (await this.repository.userInQueue(user.id)) {
            throw new ApiError(400, "User is already in the matching queue.");
        }

        const userId = await this.repository.enterQueue(user, criteria);
        
        const matchedUserInfo = await this.repository.findMatch(userId, criteria);
        if (!matchedUserInfo) {
            return userId;
        }

        const userA = { user: user, userId: userId };
        const userB = { user: matchedUserInfo.user, userId: matchedUserInfo.userId };

        const question = await this._fetch_pro_max(
            `http://localhost:${process.env.QUESTIONSERVICEPORT || 4002}/questions/random?difficulty=${criteria.difficulty}&${criteria.topics.map(t => `topics=${t}`).join('&')}`
        );

        const matchId = this.createMatchId();
        const commonMatchData = {
            matchId: matchId,
            criteria: criteria,
            question: question
        };
        await this._handleMatchFound(userA.userId, userB.userId, commonMatchData);

        return userId;
    }

    async addActiveListener(userId) {
        if (!userId) {
            throw new ApiError(400, "User ID is required to add active listener.");
        }
        if (await this.repository.userInQueue(userId) === false) {
            throw new ApiError(404, "User not found in queue.");
        }
        await this.repository.addActiveListener(userId);
        return true;
    }

    async removeActiveListener(userId) {
        if (!userId) {
            throw new ApiError(400, "User ID is required to remove active listener.");
        }
        await this.repository.removeActiveListener(userId);
        return true;
    }

    async getPendingMatch(userId) {
        if (!userId) {
            throw new ApiError(400, "User ID is required to check the pending queue.");
        }
        return await this.repository.getPendingMatch(userId);
    }

    async confirmMatch(userId) {
        const matchId = await this.repository.getMatchId(userId);
        if (!matchId) {
            throw new ApiError(404, "No pending match found for this user.");
        }

        let matchState = await this.repository.getMatchState(matchId);
        if (!matchState) {
            throw new ApiError(404, "Match data is invalid or expired.");
        }
        if (matchState.users[userId].confirmed) {
            throw new ApiError(400, "Match already confirmed.");
        }

        matchState.users[userId].confirmed = true;
        const partnerId = matchState.users[userId].matchDetails.partnerId;
        const partnerConfirmed = matchState.users[partnerId].confirmed;

        if (partnerConfirmed) {
            // 2nd user to confirm handles cleanup
            await this.repository.deleteMatch(matchId);
            await this.repository.deleteUser(userId);
            await this.repository.deleteUser(partnerId);

            const collab = await this._fetch_pro_max(
                `http://localhost:${process.env.COLLABORATIONSERVICEPORT || 4004}/api/collaboration/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostUserId: userId, guestUserId: partnerId }),
            });

            const collabId = collab.session;

            this.notifier.notifyMatchFinalized(partnerId, { token: collabId });
            this.notifier.notifyMatchFinalized(userId, { token: collabId });
            return { status: 'finalized', partnerSessionId: partnerId };
        } else {
            await this.repository.storeMatchState(matchId, matchState);
            return { status: 'waiting', partnerSessionId: partnerId };
        }
    }

    async _handleUserDeletion(userId) {
        if (!userId) {
            throw new ApiError(400, "User ID is required to clear from queue and pending match.");
        }
        const matchId = await this.repository.getMatchId(userId);
        if (matchId) {
            const matchState = await this.repository.getMatchState(matchId);
            if (matchState) {
                await this.repository.deleteMatch(matchId);
                const partnerId = matchState.users[userId].matchDetails.partnerId;
                await this.repository.deletePendingMatch(partnerId);
                this.notifier.notifyUser(partnerId, { message: `Partner cancelled match request. You have been re-queued with priority.` }, 'matchCancelled');
            }
        }
        await this.repository.deleteUser(userId);
        return true;
    }
    
    async cleanupStaleSessions() {
        const timeoutMs = 5 * 60 * 1000;
        const staleIds = await this.repository.getStaleSessions(timeoutMs);
        if (staleIds.length === 0) {
            return;
        }
        for (const userId of staleIds) {
            this.notifier.notifyUser(userId, { message: `Session ${userId} has expired. You may cancel your participation in the queue, or rejoin with priority.` }, 'sessionExpired');
            await this._handleUserDeletion(userId);
            // TODO: give user option to requeue or cancel
        }
    }

    async rejoinQueueWithPriority(user, criteria) {
        if (!user || !criteria) {
            throw new ApiError(400, "User and Criteria are required.");
        }
        // sanity check - delete existing session data
        await this.repository.deleteUser(user.id);

        const PRIORITY_OFFSET = 10 * 60 * 1000;
        const priorityScore = Date.now() - PRIORITY_OFFSET;

        const userId = await this.repository.enterQueue(user, criteria, priorityScore);
        return userId;
    }

    async cleanupStaleMatches() {
        const timeoutMs = 3 * 60 * 1000;
        const matchIds = await this.repository.getStaleMatches(timeoutMs);
        if (matchIds.length === 0) {
            return;
        }

        for (const matchId of matchIds) {
            const matchState = await this.repository.getMatchState(matchId);
            const userAId = matchState.users[Object.keys(matchState.users)[0]].matchDetails.partnerId;
            const userBId = matchState.users[userAId].matchDetails.partnerId;

            const userAConfirmed = matchState.users[userAId].confirmed;
            const userBConfirmed = matchState.users[userBId].confirmed;

            let requeueId = null;
            let deleteId = null;
            if (userAConfirmed && !userBConfirmed) {
                requeueId = userAId;
                deleteId = userBId;
            } else if (userBConfirmed && !userAConfirmed) {
                requeueId = userBId;
                deleteId = userAId;
            }

            if (requeueId && deleteId) {
                const requeueSessionData = await this.repository.getUserData(requeueId);
                await this._handleUserDeletion(deleteId);
                await this.rejoinQueueWithPriority(requeueSessionData.user, requeueSessionData.criteria);
            } else {
                await this.repository.deleteMatch(matchId);
                await this.repository.deleteUser(userAId);
                await this.repository.deleteUser(userBId);
                this.notifier.notifyUser(userAId, { message: `Match ${matchId} has expired.` }, 'matchCancelled');
                this.notifier.notifyUser(userBId, { message: `Match ${matchId} has expired.` }, 'matchCancelled');
            }
        }
    }
}