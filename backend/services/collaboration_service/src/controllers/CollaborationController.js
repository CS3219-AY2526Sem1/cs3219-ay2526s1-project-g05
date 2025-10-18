import { ApiError } from "../errors/ApiError.js";

export class CollaborationController {
  constructor(collaborationService) {
    this.collaborationService = collaborationService;
  }

  createSession = async (req, res, next) => {
    try {
      const session = await this.collaborationService.createSession(req.body ?? {});
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
      const session = await this.collaborationService.getSession(req.params.sessionId);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  };

  getSessionByRoomId = async (req, res, next) => {
    try {
      const session = await this.collaborationService.getSessionByRoomId(req.params.roomId);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  };

  joinSession = async (req, res, next) => {
    try {
      const session = await this.collaborationService.joinSession(req.params.sessionId, req.body ?? {});
      res.json({
        message: "Joined collaboration session successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  submitOperation = async (req, res, next) => {
    try {
      const result = await this.collaborationService.recordOperation(req.params.sessionId, {
        ...req.body,
        userId: req.body?.userId,
      });
      res.json({
        message: result.conflict
          ? "Operation applied with conflict resolution."
          : "Operation applied successfully.",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  leaveSession = async (req, res, next) => {
    try {
      const session = await this.collaborationService.leaveSession(req.params.sessionId, req.body ?? {});
      res.json({
        message: "Leave request processed successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  reconnectParticipant = async (req, res, next) => {
    try {
      const session = await this.collaborationService.reconnectParticipant(
        req.params.sessionId,
        req.body?.userId,
      );
      res.json({
        message: "Reconnected to collaboration session successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  proposeQuestionChange = async (req, res, next) => {
    try {
      const session = await this.collaborationService.proposeQuestionChange(
        req.params.sessionId,
        req.body ?? {},
      );
      res.json({
        message: "Question change proposed successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  respondToQuestionChange = async (req, res, next) => {
    try {
      const session = await this.collaborationService.respondToQuestionChange(
        req.params.sessionId,
        req.body ?? {},
      );
      res.json({
        message: "Question change response recorded successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  requestSessionEnd = async (req, res, next) => {
    try {
      const session = await this.collaborationService.requestSessionEnd(
        req.params.sessionId,
        req.body ?? {},
      );
      res.json({
        message: "Session end preference updated successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  terminateSession = async (req, res, next) => {
    try {
      if (!req.body?.reason || req.body.reason !== "admin") {
        throw new ApiError(403, "Unauthorized to terminate session.");
      }
      const session = await this.collaborationService.terminateSession(req.params.sessionId);
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
