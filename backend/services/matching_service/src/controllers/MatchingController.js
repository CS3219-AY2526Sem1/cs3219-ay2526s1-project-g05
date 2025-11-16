import { ApiError } from "../errors/ApiError.js";
import { createSession } from "better-sse";
import { verify_token_user } from "../../../../common_scripts/authentication_middleware.js";

export class MatchingController {
  constructor(matchService) {
    this.matchService = matchService;
    this.activeConnections = {}; // To track active SSE connections
  }

  // POST /queue
  queue = async (req, res, next) => {
    try {
      const { difficulty, topics } = req.body;
      const user = res.locals.user;
      // TODO: validate user and criteria format (use userservice?)
      // TODO: check if user is already in collab service (use collabservice?)
      const matchDetails = await this.matchService.enterQueue(user, {
        difficulty,
        topics,
      });

      if (matchDetails) {
        return res.status(200).json({
          message: "Matched with another user",
          userId: user.id,
          matchDetails: matchDetails,
        });
      }
      res.status(200).json({
        message: "Match request accepted. Check status for updates.",
        userId: user.id,
      });
    } catch (err) {
      next(err);
    }
  };

  isInQueueOrMatch = async (_req, res, next) => {
    try {
      const userId = res.locals.user.id;
      const userInQueueOrMatch =
        await this.matchService.userInQueueOrMatch(userId);
      res.json(userInQueueOrMatch);
    } catch (err) {
      next(err);
    }
  };

  // GET /status/?token={token}
  // EventSource does not allow for setting custom headers unfortunately, so we need to handle it specially for this
  getStatus = async (req, res, next) => {
    try {
      // SSE setup
      const token = req.query.token;
      if (!token) {
        console.log("No token provided");
        throw new ApiError(400, "Authentication token is required.");
      }

      const user = await verify_token_user(token);
      if (!user.success) {
        console.log("Invalid token");
        throw new ApiError(401, "Invalid authentication token.");
      }

      const userId = user.user.id;

      if (this.activeConnections[userId]) {
        console.log("active connection");
        throw new ApiError(
          400,
          "An active connection already exists for this session.",
        );
      }

      const session = await createSession(req, res);

      await this.matchService.addActiveListener(userId);
      this.activeConnections[userId] = { session, res };

      session.push(
        { message: `Connection established for user ${userId}` },
        "connected",
      );

      const pendingMatch = await this.matchService.getPendingMatch(userId);
      if (pendingMatch) {
        this.notifyUser(userId, pendingMatch.users[userId], "matchFound");
      }

      req.on("close", () => {
        delete this.activeConnections[userId];
        this.matchService.removeActiveListener(userId);
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  };

  notifyUser(userId, data, event) {
    const listenerData = this.activeConnections[userId];
    if (listenerData && listenerData.session) {
      listenerData.session.push(data, event);
    }
  }

  // POST /confirm userId in body
  confirmMatch = async (_req, res, next) => {
    try {
      const userId = res.locals.user.id;

      const result = await this.matchService.confirmMatch(userId);

      if (result.status === "finalized") {
        // Connection is closed in the notifyMatchFinalized
        res.json({
          message: "Match confirmed and complete.",
          partnerId: result.partnerId,
        });
      } else {
        res.json({
          message: "Confirmation sent. Waiting for partner.",
          partnerId: result.partnerId,
        });
      }
    } catch (err) {
      next(err);
    }
  };

  // internal method to send match finalized event and close connection
  notifyMatchFinalized(userId, matchData) {
    const listenerData = this.activeConnections[userId];
    if (listenerData && listenerData.session) {
      delete this.activeConnections[userId];
      listenerData.session.push(matchData, "matchFinalized");
      listenerData.res.end();
    }
  }

  notifySessionExpired(userId, data) {
    const listenerData = this.activeConnections[userId];
    if (listenerData && listenerData.session) {
      delete this.activeConnections[userId];
      listenerData.session.push(data, 'sessionExpired');
      listenerData.res.end();
    }
  }

  // POST /cancel
  cancel = async (_req, res, next) => {
    try {
      const userId = res.locals.user.id;
      await this.matchService._handleUserDeletion(userId);
      // Close SSE connection from array if exists
      const listenerData = this.activeConnections[userId];
      if (listenerData && listenerData.session) {
        delete this.activeConnections[userId];
        listenerData.session.push(
          {
            message:
              "You have exited the queue and cancelled any pending matches.",
          },
          "cancelled",
        );
        listenerData.res.end();
      }

      res.json({ message: "Exited queue successfully." });
    } catch (err) {
      next(err);
    }
  };
}

export const errorMiddleware = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    const payload = { message: err.message };
    if (Array.isArray(err.details)) {
      payload.errors = err.details;
    }
    res.status(err.status).json(payload);
    return;
  }

  console.error(err);
  res.status(500).json({ message: "An unexpected error occurred." });
};
