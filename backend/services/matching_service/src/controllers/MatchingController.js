import { ApiError } from "../errors/ApiError.js";

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
      const sessionId = await this.matchService.enterQueue(user, criteria);

      res.status(202).json({
        message: "Match request accepted. Check status for updates.",
        sessionId: sessionId
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /status/:sessionId
  getStatus = async (req, res, next) => {
    try {
      // SSE setup
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const sessionId = req.params.sessionId;

      if (this.activeConnections[sessionId]) {
        throw new ApiError(400, "An active connection already exists for this session.");
      }

      await this.matchService.addActiveListener(sessionId);
      this.activeConnections[sessionId] = res;
      res.write(`event: connected\ndata: {"message": "Connection established for session ${sessionId}"}\n\n`);

      const pendingMatch = await this.matchService.getPendingMatch(sessionId);
      if (pendingMatch) {
        this.notifyMatchFound(sessionId, pendingMatch, res);
      }

      req.on('close', () => {
        delete this.activeConnections[sessionId];
        this.matchService.removeActiveListener(sessionId);
      });
    } catch (err) {
      next(err);
    }
  }

  notifyMatchFound(sessionId, matchData, resExternal = null) {
    const res = resExternal || this.activeConnections[sessionId];
    if (res) {
      const formattedData = `event: matchFound\ndata: ${JSON.stringify(matchData)}\n\n`;
      res.write(formattedData);
    }
  }

  notifySessionExpired(sessionId) {
    const res = this.activeConnections[sessionId];
    if (res) {
      const formattedData = `event: sessionExpired\ndata: {"message": "Session ${sessionId} has expired. You may cancel your participation in the queue, or rejoin with priority."}\n\n`;
      res.write(formattedData);
    }
  }

  notifyMatchCancelled(sessionId, info) {
    const res = this.activeConnections[sessionId];
    if (res) {
      const formattedData = `event: matchCancelled\ndata: {"message": "Match for session ${sessionId} has been cancelled.", "info": ${JSON.stringify(info)}}\n\n`;
      res.write(formattedData);
    }
  }

  // POST /confirm sessionid in body
  confirmMatch = async (req, res, next) => {
    try {
      const { sessionId } = req.body;

      const matchResult = await this.matchService.confirmMatch(sessionId);

      if (matchResult.status === 'completed') {
        // Connection is closed in the notifyMatchFinalized
        res.status(200).json({ message: "Match confirmed and complete." });
        return;
      }
      res.status(200).json({ message: "Confirmation received. Waiting for partner." });
    } catch (err) {
      next(err);
    }
  }

  // internal method to send match finalized event and close connection
  notifyMatchFinalized(sessionId, matchData) {
    const res = this.activeConnections[sessionId];
    if (res) {
      const formattedData = `event: matchFinalized\ndata: ${JSON.stringify(matchData)}\n\n`;
      delete this.activeConnections[sessionId];
      res.write(formattedData);
      res.end();
    }
  }

  // POST /cancel sessionid in body
  cancel = async (req, res, next) => {
    try {
      const { sessionId } = req.body;
      await this.matchService.clearMatchAndSession(sessionId);
      // Close SSE connection from array if exists
      const resListener = this.activeConnections[sessionId];
      if (resListener) {
        delete this.activeConnections[sessionId];
        const formattedData = `event: cancelled\ndata: {"message": "You have exited the queue and cancelled any pending matches."}\n\n`;
        resListener.write(formattedData);
        resListener.end();
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
