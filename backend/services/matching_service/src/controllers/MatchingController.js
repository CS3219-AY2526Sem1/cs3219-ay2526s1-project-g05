import { ApiError } from "../errors/ApiError.js";
import { createSession } from "better-sse"

export class MatchingController {
  constructor(matchService) {
    this.matchService = matchService;
    this.activeConnections = {}; // To track active SSE connections
  }

  // POST /queue
  queue = async (req, res, next) => {
    try {
      const { user, criteria } = req.body;
      // TODO: validate user and criteria format (use userservice?)
      // TODO: check if user is already in collab service (use collabservice?)
      // uses user.id
      const userSessionId = await this.matchService.enterQueue(user, criteria);

      res.status(202).json({
        message: "Match request accepted. Check status for updates.",
        sessionId: userSessionId
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /status/:sessionId
  getStatus = async (req, res, next) => {
    try {
      // SSE setup
      const sessionId = req.params.sessionId;
      
      if (this.activeConnections[sessionId]) {
        throw new ApiError(400, "An active connection already exists for this session.");
      }
      const session = await createSession(req, res);

      await this.matchService.addActiveListener(sessionId);
      this.activeConnections[sessionId] = session;
      
      const pendingMatch = await this.matchService.getPendingMatch(sessionId);
      if (pendingMatch) {
        this.notifyMatchFound(sessionId, pendingMatch, session);
      }
      
      req.on('close', () => {
        delete this.activeConnections[sessionId];
        this.matchService.removeActiveListener(sessionId);
      });

      session.push(`event: connected\ndata: {"message": "Connection established for session ${sessionId}"}\n\n`);
    } catch (err) {
      next(err);
    }
  }

  notifyMatchFound(sessionId, matchData, sessionExternal = null) {
    const session = sessionExternal || this.activeConnections[sessionId];
    if (res) {
      const formattedData = `event: matchFound\ndata: ${JSON.stringify(matchData)}\n\n`;
      session.push(formattedData);
    }
  }

  notifySessionExpired(sessionId) {
    const session = this.activeConnections[sessionId];
    if (session) {
      const formattedData = `event: sessionExpired\ndata: {"message": "Session ${sessionId} has expired. You may cancel your participation in the queue, or rejoin with priority."}\n\n`;
      session.push(formattedData);
    }
  }

  notifyMatchCancelled(sessionId, data) {
    const session = this.activeConnections[sessionId];
    if (session) {
      const formattedData = `event: matchCancelled\ndata: ${JSON.stringify(data)}\n\n`;
      session.write(formattedData);
    }
  }

  // POST /confirm sessionid in body
  confirmMatch = async (req, res, next) => {
    try {
      const { sessionId } = req.body;

      const result = await this.matchService.confirmMatch(sessionId);

      if (result.status === 'finalized') {
        // Connection is closed in the notifyMatchFinalized
        res.json({ message: "Match confirmed and complete.", partnerSessionId: result.partnerSessionId });
      } else {
        res.json({ message: "Confirmation sent. Waiting for partner.", partnerSessionId: result.partnerSessionId });
      }
    } catch (err) {
      next(err);
    }
  }

  // internal method to send match finalized event and close connection
  notifyMatchFinalized(sessionId, matchData) {
    const session = this.activeConnections[sessionId];
    if (session) {
      const formattedData = `event: matchFinalized\ndata: ${JSON.stringify(matchData)}\n\n`;
      delete this.activeConnections[sessionId];
      session.push(formattedData);
      session.close();
    }
  }

  // POST /cancel sessionid in body
  cancel = async (req, res, next) => {
    try {
      const { sessionId } = req.body;
      await this.matchService.clearMatchAndSession(sessionId);
      // Close SSE connection from array if exists
      const session = this.activeConnections[sessionId];
      if (session) {
        delete this.activeConnections[sessionId];
        const formattedData = `event: cancelled\ndata: {"message": "You have exited the queue and cancelled any pending matches."}\n\n`;
        session.push(formattedData);
        session.close();
      }

      res.json({ message: "Exited queue successfully." });
    } catch (err) {
      next(err);
    }
  }
}

export const errorMiddleware = (err, req, res, _next) => {
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
