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
      const session = await this.collaborationService.getSession(
        req.params.sessionId,
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
