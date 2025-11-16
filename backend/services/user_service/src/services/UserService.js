import crypto from "crypto";
import { ApiError } from "../utils/errors/ApiError.js";
import { UserValidator } from "../utils/validators/UserValidator.js";
import { LoginSecurityManager } from "../utils/LoginSecurityManager.js";
import { sign_token } from "../../../../common_scripts/authentication_middleware.js";
export class UserService {
  constructor({ repository, passwordHasher }) {
    this.repository = repository;
    this.passwordHasher = passwordHasher;
  }

  sanitizeUser(user) {
    if (!user) return null;
    const {
      _id,
      _passwordHash,
      _ppasswordResetToken,
      _ppasswordResetExpiresAt,
      _pfailedLoginAttempts,
      _pfailedLoginWindowStart,
      _paccountLocked,
      _paccountLockedAt,
      ...rest
    } = user;
    return {
      id: _id.toString(),
      ...rest,
    };
  }

  async registerUser(payload) {
    const { errors, normalized } = UserValidator.validateRegistration(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    const existing = await this.repository.findByEmailOrUsername(
      normalized.email,
      normalized.username,
    );

    if (existing) {
      const conflicts = [];
      if (existing.email === normalized.email) conflicts.push("email");
      if (existing.username === normalized.username) conflicts.push("username");
      throw new ApiError(
        409,
        `The following fields are already taken: ${conflicts.join(", ")}.`,
      );
    }

    const passwordHash = await this.passwordHasher.hash(normalized.password);
    const createdUser = await this.repository.create({
      username: normalized.username,
      email: normalized.email,
      passwordHash,
    });

    return this.sanitizeUser(createdUser);
  }

  async authenticateUser(payload) {
    const { errors, normalized } = UserValidator.validateLogin(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    const user = await this.repository.findByEmail(normalized.email);
    if (!user) {
      throw new ApiError(401, "Invalid email or password.");
    }

    if (LoginSecurityManager.isAccountLocked(user)) {
      throw new ApiError(423, LoginSecurityManager.getLockMessage());
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      normalized.password,
    );

    if (!passwordMatches) {
      const update = LoginSecurityManager.buildFailedAttemptUpdate(user);
      await this.repository.updateById(user._id, { set: update });
      throw new ApiError(401, "Invalid email or password.");
    }

    const securityReset = LoginSecurityManager.buildSuccessfulLoginUpdate();
    const updatedUser = await this.repository.updateById(user._id, {
      set: securityReset,
    });

    const sanitizedUser = this.sanitizeUser(updatedUser ?? user);

    // Create a signed token to pass to the frontend to store - will be used for authentication
    const token = sign_token(sanitizedUser);
    return { user: sanitizedUser, token };
  }

  async getUserById(userId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }
    return this.sanitizeUser(user);
  }

  async updateUser(userId, updates) {
    const { errors, sanitizedUpdates } = UserValidator.validateUpdate(updates);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    const currentUser = await this.repository.findById(userId);
    if (!currentUser) {
      throw new ApiError(404, "User not found.");
    }

    if (
      sanitizedUpdates.email &&
      sanitizedUpdates.email !== currentUser.email
    ) {
      const existing = await this.repository.findByEmail(
        sanitizedUpdates.email,
      );
      if (existing && existing._id.toString() !== currentUser._id.toString()) {
        throw new ApiError(409, "Email is already taken.");
      }
    }

    if (
      sanitizedUpdates.username &&
      sanitizedUpdates.username !== currentUser.username
    ) {
      const existing = await this.repository.findByUsername(
        sanitizedUpdates.username,
      );
      if (existing && existing._id.toString() !== currentUser._id.toString()) {
        throw new ApiError(409, "Username is already taken.");
      }
    }

    const updatePayload = { ...sanitizedUpdates };
    if (sanitizedUpdates.password) {
      updatePayload.passwordHash = await this.passwordHasher.hash(
        sanitizedUpdates.password,
      );
      delete updatePayload.password;
    }

    const updatedUser = await this.repository.updateById(userId, {
      set: updatePayload,
    });
    if (!updatedUser) {
      throw new ApiError(404, "User not found.");
    }
    return this.sanitizeUser(updatedUser);
  }

  async deleteUser(userId, password) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    if (typeof password !== "string" || password.length === 0) {
      throw new ApiError(400, "Password confirmation is required.");
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      password,
    );
    if (!passwordMatches) {
      throw new ApiError(401, "Invalid password.");
    }

    const deleted = await this.repository.deleteById(userId);
    if (!deleted) {
      throw new ApiError(500, "Failed to delete user.");
    }
  }

  async requestPasswordReset(email) {
    const normalizedEmail = UserValidator.normalizeEmail(email);
    if (!normalizedEmail || !UserValidator.emailRegex.test(normalizedEmail)) {
      throw new ApiError(400, "A valid email address is required.");
    }

    const user = await this.repository.findByEmail(normalizedEmail);
    if (!user) {
      return; // Avoid account enumeration
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repository.updateById(user._id, {
      set: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: expiresAt,
      },
    });

    return { resetToken, expiresAt };
  }

  async resetPassword(token, newPassword) {
    if (typeof token !== "string" || token.trim().length === 0) {
      throw new ApiError(400, "Password reset token is required.");
    }

    if (!UserValidator.isValidPassword(newPassword)) {
      throw new ApiError(
        400,
        "Password does not meet complexity requirements.",
      );
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await this.repository.findByResetToken(hashedToken);
    if (!user) {
      throw new ApiError(400, "Invalid or expired password reset token.");
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    const unlockFields = LoginSecurityManager.buildUnlockUpdate();
    const updatedUser = await this.repository.updateById(user._id, {
      set: {
        passwordHash,
        ...unlockFields,
      },
      unset: {
        passwordResetToken: "",
        passwordResetExpiresAt: "",
      },
    });

    return this.sanitizeUser(updatedUser ?? user);
  }

  async addCurrentCodeRunner(userId, containerId) {
    const updatedUser = await this.repository.updateById(userId, {
      set: { codeRunnerServiceUsage: containerId },
    });
    return this.sanitizeUser(updatedUser);
  }

  async addPastCollaborationSession(userId, sessionId) {
    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      throw new ApiError(400, "A valid session ID is required.");
    }

    const normalizedSessionId = sessionId.trim();
    const normalizedUserId = userId.trim();

    const already_added_user =
      await this.repository.findPastCollaborationSession(
        normalizedUserId,
        normalizedSessionId,
      );

    if (already_added_user) {
      return this.sanitizeUser(already_added_user);
    }

    const updatedUser = await this.repository.updateById(normalizedUserId, {
      push: { pastCollaborationSessions: normalizedSessionId },
    });

    if (!updatedUser) {
      throw new ApiError(404, "User not found.");
    }

    return this.sanitizeUser(updatedUser);
  }
  async updateCurrentCollaborationSession(userId, sessionId) {
    if (sessionId !== null && typeof sessionId !== "string") {
      throw new ApiError(400, "Session ID must be a string or null.");
    }

    const normalizedUserId = userId.trim();

    if (sessionId === null) {
      const updatedUser = await this.repository.updateById(normalizedUserId, {
        set: { collaborationSessionId: null },
      });

      if (!updatedUser) {
        throw new ApiError(404, "User not found.");
      }

      return this.sanitizeUser(updatedUser);
    }

    const normalizedSessionId = sessionId.trim();
    if (normalizedSessionId.length === 0) {
      throw new ApiError(400, "A valid session ID is required.");
    }

    const updatedUser = await this.repository.updateById(normalizedUserId, {
      set: { collaborationSessionId: normalizedSessionId },
    });

    if (!updatedUser) {
      throw new ApiError(404, "User not found.");
    }

    return this.sanitizeUser(updatedUser);
  }
}
