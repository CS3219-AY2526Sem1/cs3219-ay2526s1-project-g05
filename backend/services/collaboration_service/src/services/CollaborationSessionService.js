import crypto from "crypto";
import { ApiError } from "../errors/ApiError.js";
import {
  CollaborationSessionValidator,
} from "../validators/CollaborationSessionValidator.js";

const MAX_PARTICIPANTS = 2;
const DEFAULT_LANGUAGE = "javascript";
const RECONNECT_WINDOW_MS = 5 * 60 * 1000;
const LOCK_DURATION_MS = 1_500;

export class CollaborationSessionService {
  constructor({ repository, timeProvider = () => new Date() } = {}) {
    this.repository = repository;
    this.timeProvider = timeProvider;
    this.lockDurationMs = LOCK_DURATION_MS;
    this.reconnectWindowMs = RECONNECT_WINDOW_MS;
    this.locks = new Map();
  }

  now() {
    const value = this.timeProvider();
    return value instanceof Date ? value : new Date(value);
  }

  sanitizeSession(session) {
    if (!session) return null;
    const sanitizedParticipants = (session.participants ?? []).map((participant) => ({
      ...participant,
      userId: participant.userId,
      joinedAt: participant.joinedAt?.toISOString?.() ?? participant.joinedAt,
      lastSeenAt: participant.lastSeenAt?.toISOString?.() ?? participant.lastSeenAt,
      disconnectedAt:
        participant.disconnectedAt?.toISOString?.() ?? participant.disconnectedAt ?? null,
      reconnectBy:
        participant.reconnectBy?.toISOString?.() ?? participant.reconnectBy ?? null,
    }));

    return {
      id: session._id?.toString?.() ?? session._id,
      roomId: session.roomId,
      title: session.title ?? null,
      questionId: session.questionId ?? null,
      language: session.language ?? DEFAULT_LANGUAGE,
      codeSnapshot: session.codeSnapshot ?? "",
      version: session.version ?? 0,
      status: session.status ?? "active",
      pendingQuestionChange: session.pendingQuestionChange ?? null,
      participants: sanitizedParticipants,
      cursorPositions: session.cursorPositions ?? {},
      lastOperation: session.lastOperation ?? null,
      endRequests: session.endRequests ?? [],
      createdAt: session.createdAt?.toISOString?.() ?? session.createdAt,
      updatedAt: session.updatedAt?.toISOString?.() ?? session.updatedAt,
    };
  }

  async generateRoomId() {
    return crypto.randomBytes(3).toString("hex");
  }

  async generateUniqueRoomId() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = await this.generateRoomId();
      const existing = await this.repository.findByRoomId(candidate);
      if (!existing) {
        return candidate;
      }
    }
    throw new ApiError(500, "Failed to generate a unique room id. Please try again.");
  }

  buildParticipant({ userId, displayName }) {
    const now = this.now();
    return {
      userId,
      displayName: displayName ?? null,
      connected: true,
      joinedAt: now,
      lastSeenAt: now,
      disconnectedAt: null,
      reconnectBy: null,
      endConfirmed: false,
    };
  }

  ensureActive(session) {
    if (!session) {
      throw new ApiError(404, "Collaboration session not found.");
    }
    if (session.status === "ended") {
      throw new ApiError(410, "This collaboration session has already ended.");
    }
  }

  async checkExpiredSession(session) {
    if (!session || session.status === "ended") {
      return session;
    }

    const now = this.now();
    const participants = session.participants ?? [];
    const expired = participants.filter(
      (participant) =>
        !participant.connected && participant.reconnectBy && participant.reconnectBy < now,
    );

    if (expired.length === 0) {
      return session;
    }

    const expiredIds = new Set(expired.map((item) => item.userId));
    const updatedParticipants = participants.map((participant) =>
      expiredIds.has(participant.userId)
        ? {
            ...participant,
            reconnectBy: null,
            disconnectedAt: participant.disconnectedAt ?? now,
          }
        : {
            ...participant,
            connected: false,
            lastSeenAt: now,
            disconnectedAt: now,
            reconnectBy: null,
          },
    );

    const updated = await this.repository.updateById(session._id, {
      set: {
        participants: updatedParticipants,
        status: "ended",
      },
    });

    return updated ?? session;
  }

  getParticipant(session, userId) {
    return (session.participants ?? []).find((participant) => participant.userId === userId) ?? null;
  }

  async createSession(payload) {
    const { errors, normalized } = CollaborationSessionValidator.validateCreateSession(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    const roomId = normalized.roomId
      ? await this.ensureRoomIdAvailability(normalized.roomId)
      : await this.generateUniqueRoomId();

    const now = this.now();
    const session = await this.repository.create({
      roomId,
      title: normalized.title ?? null,
      language: normalized.language ?? DEFAULT_LANGUAGE,
      questionId: normalized.questionId ?? null,
      codeSnapshot: normalized.initialCode ?? "",
      version: 0,
      status: "active",
      participants: [this.buildParticipant({ userId: normalized.hostUserId })],
      pendingQuestionChange: null,
      endRequests: [],
      cursorPositions: {},
      lastOperation: null,
      lastConflictAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return this.sanitizeSession(session);
  }

  async ensureRoomIdAvailability(roomId) {
    const existing = await this.repository.findByRoomId(roomId);
    if (existing) {
      throw new ApiError(409, "Room id is already in use. Please choose another id.");
    }
    return roomId;
  }

  async getSessionByRoomId(roomId) {
    let session = await this.repository.findByRoomId(roomId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);
    return this.sanitizeSession(session);
  }

  async getSession(sessionId) {
    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);
    return this.sanitizeSession(session);
  }

  async joinSession(sessionId, payload) {
    const { errors, normalized } = CollaborationSessionValidator.validateJoinSession(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const now = this.now();
    const participants = session.participants ?? [];
    const participant = this.getParticipant(session, normalized.userId);

    if (!participant && participants.length >= MAX_PARTICIPANTS) {
      throw new ApiError(409, "The collaboration room is full.");
    }

    let updatedParticipants;
    if (participant) {
      updatedParticipants = participants.map((item) =>
        item.userId === normalized.userId
          ? {
              ...item,
              connected: true,
              lastSeenAt: now,
              disconnectedAt: null,
              reconnectBy: null,
              displayName: normalized.displayName ?? item.displayName ?? null,
            }
          : item,
      );
    } else {
      updatedParticipants = [
        ...participants,
        this.buildParticipant({
          userId: normalized.userId,
          displayName: normalized.displayName,
        }),
      ];
    }

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        participants: updatedParticipants,
        status: "active",
      },
    });

    return this.sanitizeSession(updatedSession);
  }

  async recordOperation(sessionId, payload) {
    const { errors, normalized } = CollaborationSessionValidator.validateOperation(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const participant = this.getParticipant(session, normalized.userId);
    if (!participant) {
      throw new ApiError(403, "You are not part of this collaboration session.");
    }

    const now = this.now();
    const lockResult = this.acquireLock(sessionId, normalized.userId, normalized.range, now);
    if (!lockResult.granted) {
      return {
        session: this.sanitizeSession(session),
        conflict: true,
        reason: "lock_conflict",
        lockedBy: lockResult.lockedBy,
      };
    }

    const conflict = normalized.version !== (session.version ?? 0);
    const newVersion = (session.version ?? 0) + 1;

    const updatedParticipants = (session.participants ?? []).map((item) =>
      item.userId === normalized.userId
        ? { ...item, lastSeenAt: now, connected: true, disconnectedAt: null, reconnectBy: null }
        : item,
    );

    const cursorPositions = {
      ...(session.cursorPositions ?? {}),
    };
    if (normalized.cursor) {
      cursorPositions[normalized.userId] = {
        ...normalized.cursor,
        updatedAt: now,
      };
    }

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        codeSnapshot:
          normalized.type === "cursor" || normalized.type === "selection"
            ? session.codeSnapshot
            : normalized.content ?? session.codeSnapshot,
        version: newVersion,
        participants: updatedParticipants,
        cursorPositions,
        lastOperation: {
          userId: normalized.userId,
          type: normalized.type,
          version: newVersion,
          timestamp: now,
          conflict,
        },
        lastConflictAt: conflict ? now : session.lastConflictAt ?? null,
      },
    });

    this.releaseLock(sessionId, normalized.userId, normalized.range);

    return {
      session: this.sanitizeSession(updatedSession),
      conflict,
    };
  }

  acquireLock(sessionId, userId, range, now = this.now()) {
    if (!range) {
      return { granted: true };
    }

    const locks = this.locks.get(sessionId) ?? [];
    const validLocks = locks.filter((lock) => lock.expiresAt > now);

    const conflicting = validLocks.find(
      (lock) => lock.userId !== userId && this.rangesOverlap(lock.range, range),
    );
    if (conflicting) {
      this.locks.set(sessionId, validLocks);
      return { granted: false, lockedBy: conflicting.userId };
    }

    const expiresAt = new Date(now.getTime() + this.lockDurationMs);
    const updatedLocks = validLocks.filter((lock) =>
      !(lock.userId === userId && this.rangesOverlap(lock.range, range)),
    );
    updatedLocks.push({ userId, range, expiresAt });
    this.locks.set(sessionId, updatedLocks);

    return { granted: true };
  }

  releaseLock(sessionId, userId, range) {
    if (!range) {
      return;
    }
    const locks = this.locks.get(sessionId);
    if (!locks) return;

    const remaining = locks.filter(
      (lock) => !(lock.userId === userId && this.rangesOverlap(lock.range, range)),
    );
    if (remaining.length === 0) {
      this.locks.delete(sessionId);
    } else {
      this.locks.set(sessionId, remaining);
    }
  }

  rangesOverlap(a, b) {
    if (!a || !b) return false;
    return a.start <= b.end && b.start <= a.end;
  }

  async leaveSession(sessionId, payload) {
    const { errors, normalized } = CollaborationSessionValidator.validateLeaveSession(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const participant = this.getParticipant(session, normalized.userId);
    if (!participant) {
      throw new ApiError(403, "You are not part of this collaboration session.");
    }

    const now = this.now();
    let updatedStatus = session.status;
    let updatedParticipants = session.participants ?? [];

    if (normalized.terminateForAll) {
      updatedStatus = "ended";
      updatedParticipants = updatedParticipants.map((item) =>
        item.userId === normalized.userId
          ? { ...item, connected: false, lastSeenAt: now, disconnectedAt: now }
          : item,
      );
    } else {
      updatedParticipants = updatedParticipants.map((item) =>
        item.userId === normalized.userId
          ? {
              ...item,
              connected: false,
              disconnectedAt: now,
              reconnectBy: new Date(now.getTime() + this.reconnectWindowMs),
              lastSeenAt: now,
            }
          : item,
      );
    }

    const activeParticipants = updatedParticipants.filter((item) => item.connected);
    if (activeParticipants.length === 0) {
      updatedStatus = "ended";
    }

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        participants: updatedParticipants,
        status: updatedStatus,
      },
    });

    this.releaseAllLocksForUser(sessionId, normalized.userId);

    return this.sanitizeSession(updatedSession);
  }

  async reconnectParticipant(sessionId, userId) {
    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const participant = this.getParticipant(session, userId);
    if (!participant) {
      throw new ApiError(403, "You are not part of this collaboration session.");
    }

    const now = this.now();
    if (participant.reconnectBy && participant.reconnectBy < now) {
      throw new ApiError(410, "Reconnection window has expired.");
    }

    const updatedParticipants = (session.participants ?? []).map((item) =>
      item.userId === userId
        ? {
            ...item,
            connected: true,
            disconnectedAt: null,
            reconnectBy: null,
            lastSeenAt: now,
          }
        : item,
    );

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        participants: updatedParticipants,
        status: "active",
      },
    });

    return this.sanitizeSession(updatedSession);
  }

  releaseAllLocksForUser(sessionId, userId) {
    const locks = this.locks.get(sessionId);
    if (!locks) return;
    const remaining = locks.filter((lock) => lock.userId !== userId);
    if (remaining.length === 0) {
      this.locks.delete(sessionId);
    } else {
      this.locks.set(sessionId, remaining);
    }
  }

  async expireSessionIfNeeded(session) {
    if (!session) return null;
    const participants = session.participants ?? [];
    const now = this.now();
    const someoneCanReconnect = participants.some(
      (participant) =>
        !participant.connected && participant.reconnectBy && participant.reconnectBy > now,
    );
    if (someoneCanReconnect) {
      return null;
    }

    if (participants.every((participant) => !participant.connected)) {
      const updated = await this.repository.updateById(session._id, {
        set: { status: "ended" },
      });
      return this.sanitizeSession(updated);
    }

    return null;
  }

  async proposeQuestionChange(sessionId, payload) {
    const { errors, normalized } = CollaborationSessionValidator.validateQuestionProposal(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const participant = this.getParticipant(session, normalized.userId);
    if (!participant) {
      throw new ApiError(403, "You are not part of this collaboration session.");
    }

    if (session.pendingQuestionChange) {
      throw new ApiError(409, "There is already a pending question change request.");
    }

    const now = this.now();
    const pendingQuestionChange = {
      questionId: normalized.questionId,
      proposedBy: normalized.userId,
      rationale: normalized.rationale ?? null,
      approvals: [normalized.userId],
      createdAt: now,
    };

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        pendingQuestionChange,
      },
    });

    return this.sanitizeSession(updatedSession);
  }

  async respondToQuestionChange(sessionId, payload) {
    const { errors, normalized } = CollaborationSessionValidator.validateQuestionResponse(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    if (!session.pendingQuestionChange) {
      throw new ApiError(404, "There is no pending question change request.");
    }

    const participant = this.getParticipant(session, normalized.userId);
    if (!participant) {
      throw new ApiError(403, "You are not part of this collaboration session.");
    }

    const pending = session.pendingQuestionChange;

    if (!normalized.accept) {
      const updatedSession = await this.repository.updateById(sessionId, {
        set: { pendingQuestionChange: null },
      });
      return this.sanitizeSession(updatedSession);
    }

    const approvals = new Set(pending.approvals ?? []);
    approvals.add(normalized.userId);

    const participants = session.participants ?? [];
    const everyoneApproved = participants
      .filter((p) => !!p)
      .every((p) => approvals.has(p.userId));

    if (everyoneApproved) {
      const updatedSession = await this.repository.updateById(sessionId, {
        set: {
          pendingQuestionChange: null,
          questionId: pending.questionId,
          codeSnapshot: "",
          version: 0,
        },
      });
      return this.sanitizeSession(updatedSession);
    }

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        pendingQuestionChange: {
          ...pending,
          approvals: Array.from(approvals),
        },
      },
    });

    return this.sanitizeSession(updatedSession);
  }

  async requestSessionEnd(sessionId, payload) {
    const { errors, normalized } = CollaborationSessionValidator.validateEndSessionRequest(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    const session = await this.repository.findById(sessionId);
    this.ensureActive(session);

    const participant = this.getParticipant(session, normalized.userId);
    if (!participant) {
      throw new ApiError(403, "You are not part of this collaboration session.");
    }

    const approvals = new Set(session.endRequests ?? []);
    if (normalized.confirm) {
      approvals.add(normalized.userId);
    } else {
      approvals.delete(normalized.userId);
    }

    const participants = session.participants ?? [];
    const everyoneApproved =
      approvals.size > 0 && participants.every((p) => approvals.has(p.userId));

    if (everyoneApproved) {
      const updatedSession = await this.repository.updateById(sessionId, {
        set: {
          status: "ended",
          endRequests: Array.from(approvals),
        },
      });
      return this.sanitizeSession(updatedSession);
    }

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        endRequests: Array.from(approvals),
      },
    });

    return this.sanitizeSession(updatedSession);
  }

  async terminateSession(sessionId) {
    const session = await this.repository.updateById(sessionId, {
      set: { status: "ended" },
    });
    if (!session) {
      throw new ApiError(404, "Collaboration session not found.");
    }
    return this.sanitizeSession(session);
  }
}
