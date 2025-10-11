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

      const listenerStatus = await this.matchService.addActiveListener(sessionId);
      // listenerStatus.notified is true if active listener is not added because match already found
      if (listenerStatus.notified) {
        this.notifyMatchFound(sessionId, listenerStatus.data, res);
        return;
      }

      this.activeConnections[sessionId] = res;

      res.write('event: connected\n');
      res.write(`data: {"message": "Connection established for session ${sessionId}"}\n\n`);

      // user closes the connection
      req.on('close', () => {
        console.log(`SSE connection closed for session: ${sessionId}`);
        delete this.activeConnections[sessionId];
        this.matchService.removeActiveListener(sessionId);
      });
    } catch (err) {
      next(err);
    }
  }

  // internal method to send match found event
  notifyMatchFound(sessionId, matchData, resExternal = null) {
    const res = resExternal || this.activeConnections[sessionId];
    if (res) {
      const formattedData = `event: matchFound\ndata: ${JSON.stringify(matchData)}\n\n`;
      res.write(formattedData);
      res.end(); // closes connection // keep connection open for matchExpired?
      if (this.activeConnections[sessionId]) {
        delete this.activeConnections[sessionId];
      }
    }
  }

  notifySessionExpired(sessionId) {
    const res = this.activeConnections[sessionId];
    if (res) {
      const formattedData = `event: sessionExpired\ndata: {"message": "Session ${sessionId} has expired."}\n\n`;
      // TODO: Give user choice to re-enter queue + insert to front of queue
      res.write(formattedData);
      res.end(); // closes connection
      delete this.activeConnections[sessionId];
    }
  }

  // POST /cancel sessionid in body
  cancel = async (req, res, next) => {
    try {
      const { sessionId } = req.body;
      await this.matchService.clearFromQueue(sessionId);
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
