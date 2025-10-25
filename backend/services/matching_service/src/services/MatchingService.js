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
        throw new ApiError(
          response.status,
          `Failed to fetch: ${response.statusText}`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Fetch error:", error);
      throw new ApiError(500, "Internal Server Error");
    }
  }

  _validateEntryRequest(criteria) {
    if (!criteria) {
      throw new ApiError(400, "Criteria is required to enter the queue.");
    }
    if (
      typeof criteria !== "object" ||
      !criteria.difficulty ||
      !Array.isArray(criteria.topics)
    ) {
      throw new ApiError(
        400,
        "Criteria must include 'difficulty' and 'topics' array.",
      );
    }
  }

  async _handleMatchFound(userA, userB, commonMatchData) {
    const matchState = {
      status: "pending",
      users: {
        [userA.id]: {
          confirmed: false,
          matchDetails: {
            ...commonMatchData,
            partnerId: userB.id,
            partnerUser: userB.username,
            partnerConfirmed: false,
          },
        },
        [userB.id]: {
          confirmed: false,
          matchDetails: {
            ...commonMatchData,
            partnerId: userA.id,
            partnerUser: userA.username,
            partnerConfirmed: false,
          },
        },
      },
    };

    await this.repository.storeMatchState(commonMatchData.matchId, matchState);
    await this.repository.storePendingMatch(userA.id, commonMatchData.matchId);
    await this.repository.storePendingMatch(userB.id, commonMatchData.matchId);
    await this.repository.deleteUserFromQueue(userA.id);
    await this.repository.deleteUserFromQueue(userB.id);

    await this.notifier.notifyUser(
      userA.id,
      matchState.users[userA.id],
      "matchFound",
    );
    await this.notifier.notifyUser(
      userB.id,
      matchState.users[userB.id],
      "matchFound",
    );

    return matchState.users[userA.id];
  }

  async enterQueue(user, criteria) {
    this._validateEntryRequest(criteria);
    if (
      (await this.repository.userInQueue(user.id)) ||
      (await this.repository.getMatchId(user.id))
    ) {
      throw new ApiError(
        400,
        "User is already in the matching queue or has found a match.",
      );
    }

    const userId = await this.repository.enterQueue(user, criteria);

    const matchedUserInfo = await this.repository.findMatch(userId, criteria);
    if (!matchedUserInfo) {
      return null;
    }

    const userA = user;
    const userB = matchedUserInfo.user;

    const question = await this._fetch_pro_max(
      `http://localhost:${
        process.env.QUESTIONSERVICEPORT || 4002
      }/random?difficulty=${criteria.difficulty}&${criteria.topics
        .map((t) => `topic=${t}`)
        .join("&")}`,
    );

    const matchId = this.createMatchId();
    const commonMatchData = {
      matchId: matchId,
      criteria: criteria,
      question: question,
    };
    const matchDetails = await this._handleMatchFound(
      userA,
      userB,
      commonMatchData,
    );

    // There's a chance before userA can subscribe to SSE, the match is already found. Hence, handleMatchFound fails to notify userA.
    return matchDetails;
  }

  async addActiveListener(userId) {
    if (!userId) {
      throw new ApiError(400, "User ID is required to add active listener.");
    }
    if (
      !(await this.repository.userInQueue(userId)) &&
      !(await this.repository.getMatchId(userId))
    ) {
      throw new ApiError(404, "User not found in queue or match state.");
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
      throw new ApiError(
        400,
        "User ID is required to check the pending queue.",
      );
    }
    return await this.repository.getPendingMatch(userId);
  }

  async confirmMatch(userId) {
    const matchId = await this.repository.getMatchId(userId);
    if (!matchId) {
      throw new ApiError(404, "No pending match found for this user.");
    }

    const matchState = await this.repository.getMatchState(matchId);
    if (!matchState) {
      throw new ApiError(404, "Match data is invalid or expired.");
    }
    if (matchState.users[userId].confirmed) {
      throw new ApiError(400, "Match already confirmed.");
    }

    matchState.users[userId].confirmed = true;
    const partnerId = matchState.users[userId].matchDetails.partnerId;
    matchState.users[partnerId].matchDetails.partnerConfirmed = true; // Inform the other party that this user has confirmed
    const partnerConfirmed = matchState.users[partnerId].confirmed;

    if (partnerConfirmed) {
      // 2nd user to confirm handles cleanup
      await this.repository.deleteMatch(matchId);
      await this.repository.deleteUser(userId);
      await this.repository.deleteUser(partnerId);

      const response = await this._fetch_pro_max(
        `http://localhost:${
          process.env.COLLABORATIONSERVICEPORT || 4004
        }/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participants: [userId, partnerId],
            questionId: matchState.users[userId].matchDetails.question.QID,
            language: "Python",
          }),
        },
      );

      const session = response.session;

      this.notifier.notifyMatchFinalized(partnerId, {
        session,
      });
      this.notifier.notifyMatchFinalized(userId, { session });
      return { status: "finalized", partnerSessionId: partnerId };
    } else {
      await this.repository.storeMatchState(matchId, matchState);

      await this.notifier.notifyUser(
        userId,
        matchState.users[userId],
        "matchFound",
      );
      await this.notifier.notifyUser(
        partnerId,
        matchState.users[partnerId],
        "matchFound",
      );
      return { status: "waiting", partnerSessionId: partnerId };
    }
  }

  async _handleUserDeletion(userId) {
    if (!userId) {
      throw new ApiError(
        400,
        "User ID is required to clear from queue and pending match.",
      );
    }
    const matchId = await this.repository.getMatchId(userId);
    if (matchId) {
      const matchState = await this.repository.getMatchState(matchId);
      if (matchState) {
        await this.repository.deleteMatch(matchId);
        const partnerId = matchState.users[userId].matchDetails.partnerId;
        await this.repository.deletePendingMatch(partnerId);
        this.notifier.notifyUser(
          partnerId,
          {
            message: `Partner cancelled match request.`,
          },
          "matchCancelled",
        );
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
      this.notifier.notifyUser(
        userId,
        {
          message: `Session ${userId} has expired. You may cancel your participation in the queue, or rejoin with priority.`,
        },
        "sessionExpired",
      );
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

    const userId = await this.repository.enterQueue(
      user,
      criteria,
      priorityScore,
    );
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
      const userAId =
        matchState.users[Object.keys(matchState.users)[0]].matchDetails
          .partnerId;
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
        await this.rejoinQueueWithPriority(
          requeueSessionData.user,
          requeueSessionData.criteria,
        );
      } else {
        await this.repository.deleteMatch(matchId);
        await this.repository.deleteUser(userAId);
        await this.repository.deleteUser(userBId);
        this.notifier.notifyUser(
          userAId,
          { message: `Match ${matchId} has expired.` },
          "matchCancelled",
        );
        this.notifier.notifyUser(
          userBId,
          { message: `Match ${matchId} has expired.` },
          "matchCancelled",
        );
      }
    }
  }

  async userInQueueOrMatch(userId) {
    return {
      inQueue: await this.repository.userInQueue(userId),
      inMatch: await this.repository.getMatchId(userId),
    };
  }
}
