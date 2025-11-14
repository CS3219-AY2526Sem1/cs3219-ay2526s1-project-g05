import { ApiError } from "../errors/ApiError.js";

export class CollaborationController {
  constructor(collaborationService) {
    this.collaborationService = collaborationService;
  }

  createSession = async (req, res, next) => {
    try {
      const session = await this.collaborationService.createSession(
        req.body ?? {},
      );
      res.status(201).json({
        message: "Collaboration session created successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  getSession = async (req, res, next) => {
    try {
      const includeEnded = ["1","true","yes"].includes(
        String(req.query.includeEnded || "").toLowerCase()
      );

      const session = await this.collaborationService.getSession(
        req.params.sessionId,
        { includeEnded }
      );

      res.json({ session });
    } catch (error) {
      next(error);
    }
  };

  terminateSession = async (req, res, next) => {
    try {
      if (!req.body?.reason || req.body.reason !== "admin") {
        throw new ApiError(403, "Unauthorized to terminate session.");
      }
      const session = await this.collaborationService.terminateSession(
        req.params.sessionId,
      );
      res.json({
        message: "Session terminated successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  sendCustomMessage = async (req, res, next) => {
    try {
      const { message } = req.body;
      const response = await this.collaborationService.sendCustomMessage(
        req.params.sessionId,
        message,
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  explainCode = async (req, res, next) => {
    try {
      const response = await this.collaborationService.explainCode(
        req.params.sessionId,
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getConversation = async (req, res, next) => {
    try {
      const response = await this.collaborationService.getConversation(
        req.params.sessionId,
      );
      res.json({ conversation: response.conversation });
    } catch (error) {
      next(error);
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
