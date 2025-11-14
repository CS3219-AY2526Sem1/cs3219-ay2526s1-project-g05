import { ApiError } from "../utils/errors/ApiError.js";

export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  register = async (req, res, next) => {
    try {
      const user = await this.userService.registerUser(req.body ?? {});
      res.status(201).json({ message: "User registered successfully.", user });
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const result = await this.userService.authenticateUser(req.body ?? {});
      res.json({ message: "Login successful.", ...result });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (_req, res, next) => {
    try {
      const user = await this.userService.getUserById(res.locals.user.id);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const user = await this.userService.getUserById(req.params.id);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req, res, next) => {
    try {
      const user = await this.userService.updateUser(
        res.locals.user.id,
        req.body ?? {},
      );
      res.json({ message: "User updated successfully.", user });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const user = await this.userService.updateUser(
        req.params.id,
        req.body ?? {},
      );
      res.json({ message: "User updated successfully.", user });
    } catch (error) {
      next(error);
    }
  };

  deleteMe = async (req, res, next) => {
    try {
      await this.userService.deleteUser(res.locals.user.id, req.body?.password);
      res.json({ message: "User deleted successfully." });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.userService.deleteUser(req.params.id, req.body?.password);
      res.json({ message: "User deleted successfully." });
    } catch (error) {
      next(error);
    }
  };

  requestPasswordReset = async (req, res, next) => {
    try {
      const result = await this.userService.requestPasswordReset(
        req.body?.email,
      );
      const responseBody = {
        message:
          "If an account exists for that email, a password reset link has been issued.",
      };
      if (result && process.env.NODE_ENV !== "production") {
        responseBody.resetToken = result.resetToken;
        responseBody.expiresAt = result.expiresAt;
      }
      res.json(responseBody);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const user = await this.userService.resetPassword(
        req.body?.token,
        req.body?.password,
      );
      res.json({ message: "Password reset successfully.", user });
    } catch (error) {
      next(error);
    }
  };

  addCurrentCodeRunner = async (req, res, next) => {
    try {
      const { containerId, userId } = req.body ?? {};
      const user = await this.userService.addCurrentCodeRunner(
        userId,
        containerId,
      );
      res.json({
        message: "Current code runner container id added successfully.",
        user,
      });
    } catch (error) {
      next(error);
    }
  };

  addPastCollaborationSession = async (req, res, next) => {
    try {
      const { userId, sessionId } = req.body ?? {};
      const user = await this.userService.addPastCollaborationSession(
        userId,
        sessionId,
      );
      res.json({
        message: "Past collaboration session added successfully.",
        user,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCurrentCollaborationSession = async (req, res, next) => {
    try {
      const { userId, sessionId } = req.body ?? {};
      const user = await this.userService.updateCurrentCollaborationSession(
        userId,
        sessionId,
      );
      res.json({
        message: "Current collaboration session updated successfully.",
        user,
      });
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
