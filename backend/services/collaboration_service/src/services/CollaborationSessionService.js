import { ApiError } from "../errors/ApiError.js";
import { CollaborationSessionValidator } from "../validators/CollaborationSessionValidator.js";
import {
  fetchUser,
  fetchQuestion,
  updateUserCurrentSession,
  addUserPastSession,
} from "../utils/fetchRequests.js";
import { parseDate } from "../utils/misc.js";
import OpenAI from "openai";

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
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  now() {
    const value = this.timeProvider();
    return value instanceof Date ? value : new Date(value);
  }

  sanitizeSession(session) {
    if (!session) return null;
    const sanitizedParticipants = (session.participants ?? []).map(
      (participant) => ({
        ...participant,
        userId: participant.userId,
        joinedAt: participant.joinedAt?.toISOString?.() ?? participant.joinedAt,
        lastSeenAt:
          participant.lastSeenAt?.toISOString?.() ?? participant.lastSeenAt,
        disconnectedAt:
          participant.disconnectedAt?.toISOString?.() ??
          participant.disconnectedAt ??
          null,
        reconnectBy:
          participant.reconnectBy?.toISOString?.() ??
          participant.reconnectBy ??
          null,
      }),
    );

    return {
      id: session._id?.toString?.() ?? session._id,
      questionId: session.questionId ?? null,
      code: session.code,
      language: session.language ?? DEFAULT_LANGUAGE,
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

  buildParticipant({ userId, displayName, connected }) {
    const now = this.now();
    return {
      userId,
      displayName: displayName ?? null,
      connected: connected ?? false,
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

    const expired =
      session.status === "ended"
        ? participants
        : participants.filter(
            (participant) =>
              !participant.connected &&
              participant.reconnectBy &&
              participant.reconnectBy < now,
          );

    if (expired.length === 0) {
      return session;
    }

    const expiredIds = new Set(expired.map((item) => item.userId));
    const updatedParticipants = participants.map((participant) =>
      expiredIds.has(participant.userId)
        ? {
            ...participant,
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

    await this.handleSessionEnded(session, updated);

    return updated ?? session;
  }

  getParticipant(session, userId) {
    return (
      (session.participants ?? []).find(
        (participant) => participant.userId === userId,
      ) ?? null
    );
  }

  async createSession(payload) {
    const { errors, normalized } =
      CollaborationSessionValidator.validateCreateSession(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    if (normalized.participants.length > MAX_PARTICIPANTS) {
      throw new ApiError(
        400,
        `A maximum of ${MAX_PARTICIPANTS} participants are allowed per session.`,
      );
    }

    const particiants_built = await Promise.all(
      normalized.participants.map(async (id) => {
        const participantInActiveSession =
          await this.repository.getParticipantActiveSessions(id);
        if (participantInActiveSession.length > 0) {
          throw new ApiError(
            409,
            "User is already in an active collaboration session.",
          );
        }
        // Get user from user_service to fetch display name
        const user = await fetchUser(id);
        const participantObj = this.buildParticipant({
          userId: id,
          displayName: user.username,
        });
        return participantObj;
      }),
    );

    const question = await fetchQuestion(normalized.questionId);

    const now = this.now();
    const session = await this.repository.create({
      language: normalized.language ?? DEFAULT_LANGUAGE,
      questionId: normalized.questionId,
      code: question.code, // Set code to the starter code
      version: 0,
      status: "active",
      participants: particiants_built,
      pendingQuestionChange: null,
      endRequests: [],
      cursorPositions: {},
      lastOperation: null,
      lastConflictAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const sessionId = session._id?.toString?.() ?? session._id;
    const uniqueParticipantIds = Array.from(
      new Set(particiants_built.map((participant) => participant.userId)),
    );
    await Promise.all(
      uniqueParticipantIds.map((participantId) =>
        updateUserCurrentSession(participantId, sessionId),
      ),
    );

    return this.sanitizeSession(session);
  }

  async getSession(sessionId, { includeEnded = false } = {}) {
    const session = await this.repository.findById(sessionId);
    if (!session) throw new ApiError(404, "Session not found.");

    const checked = await this.checkExpiredSession(session);

    if (!includeEnded) {
      this.ensureActive(checked);
    }

    return this.sanitizeSession(checked);
  }

  async joinSession(user, payload) {
    const { errors, normalized } =
      CollaborationSessionValidator.validateJoinSession(payload);

    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    const { sessionId } = normalized;

    let session = await this.repository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Collaboration session not found.");
    }

    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const participants = session.participants ?? [];
    const participant = this.getParticipant(session, user.id);

    if (!participant) {
      throw new ApiError(
        403,
        "You are not part of this collaboration session.",
      );
    }

    participants.forEach((item) => {
      if (item.userId !== user.id) return;

      item.connected = true;
      item.lastSeenAt = this.now();
      item.disconnectedAt = null;
      item.reconnectBy = null;
      item.displayName = user.name ?? item.displayName ?? null;
    });

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        participants,
        status: "active",
      },
    });

    return this.sanitizeSession(updatedSession);
  }

  async resolveOperation(sessionId, userId, payload) {
    const { errors, normalized } =
      CollaborationSessionValidator.validateOperation(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const participant = this.getParticipant(session, userId);
    if (!participant) {
      throw new ApiError(
        403,
        "You are not part of this collaboration session.",
      );
    }

    const now = this.now();
    const lockResult = this.acquireLock(
      sessionId,
      userId,
      normalized.range,
      now,
    );
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
      item.userId === userId
        ? {
            ...item,
            lastSeenAt: now,
            connected: true,
            disconnectedAt: null,
            reconnectBy: null,
          }
        : item,
    );

    const cursorPositions = {
      ...(session.cursorPositions ?? {}),
    };
    if (normalized.cursor) {
      cursorPositions[userId] = {
        ...normalized.cursor,
        updatedAt: now,
      };
    }

    this.releaseLock(sessionId, userId, normalized.range);

    return {
      session: this.sanitizeSession({
        ...session,
        version: newVersion,
        participants: updatedParticipants,
        cursorPositions,
        code:
          normalized.type !== "cursor" && normalized.type !== "selection"
            ? normalized.content
            : null,
        lastOperation: {
          userId: userId,
          type: normalized.type,
          version: newVersion,
          timestamp: now,
          conflict,
        },
        lastConflictAt: conflict ? now : (session.lastConflictAt ?? null),
        updatedAt: now,
      }),
      conflict,
    };
  }

  async recordOperation(sessionId, _userId, payload) {
    const updateObj = {
      set: {
        version: payload.version,
        participants: payload.participants.map((p) => ({
          ...p,
          joinedAt: parseDate(p.joinedAt),
          lastSeenAt: parseDate(p.lastSeenAt),
          disconnectedAt: parseDate(p.disconnectedAt),
          reconnectBy: parseDate(p.reconnectBy),
        })),
        cursorPositions: payload.cursorPositions,
        lastOperation: payload.lastOperation,
        lastConflictAt: parseDate(payload.lastConflictAt),
        updatedAt: parseDate(payload.updatedAt),
      },
    };

    if (payload.code) {
      updateObj.set.code = payload.code;
    }

    const updatedSession = await this.repository.updateById(
      sessionId,
      updateObj,
    );

    return {
      session: this.sanitizeSession(updatedSession),
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
    const updatedLocks = validLocks.filter(
      (lock) =>
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
      (lock) =>
        !(lock.userId === userId && this.rangesOverlap(lock.range, range)),
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

  async leaveSession(sessionId, userId, payload) {
    const { errors, normalized } =
      CollaborationSessionValidator.validateLeaveSession(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const participant = this.getParticipant(session, userId);
    if (!participant) {
      throw new ApiError(
        403,
        "You are not part of this collaboration session.",
      );
    }

    const now = this.now();
    let updatedStatus = session.status;
    let updatedParticipants = session.participants ?? [];

    if (normalized.terminateForAll) {
      updatedStatus = "ended";
      updatedParticipants = updatedParticipants.map((item) =>
        item.userId === userId
          ? { ...item, connected: false, lastSeenAt: now, disconnectedAt: now }
          : item,
      );
    } else {
      updatedParticipants = updatedParticipants.map((item) =>
        item.userId === userId
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

    const activeParticipants = updatedParticipants.filter(
      (item) => item.connected || (item.reconnectBy && item.reconnectBy > now),
    );
    if (activeParticipants.length === 0) {
      updatedStatus = "ended";
    }

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        participants: updatedParticipants,
        status: updatedStatus,
      },
    });

    this.releaseAllLocksForUser(sessionId, userId);

    const sessionAfterUpdate = updatedSession ?? session;
    if (updatedStatus === "ended") {
      await this.handleSessionEnded(session, sessionAfterUpdate);
    }

    return this.sanitizeSession(sessionAfterUpdate);
  }

  async handleSessionEnded(previousSession, nextSession) {
    if (!nextSession || nextSession.status !== "ended") {
      return;
    }

    const sessionId = nextSession._id?.toString?.() ?? nextSession._id;
    if (!sessionId) return;

    const participantsSource =
      nextSession.participants ?? previousSession?.participants ?? [];
    const uniqueParticipantIds = Array.from(
      new Set(
        participantsSource
          .map((participant) => participant?.userId?.trim?.())
          .filter((userId) => typeof userId === "string" && userId.length > 0),
      ),
    );

    if (uniqueParticipantIds.length === 0) {
      return;
    }

    await Promise.all(
      uniqueParticipantIds.map(async (userId) => {
        await addUserPastSession(userId, sessionId);
        await updateUserCurrentSession(userId, null);
      }),
    );
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
        !participant.connected &&
        participant.reconnectBy &&
        participant.reconnectBy > now,
    );
    if (someoneCanReconnect) {
      return null;
    }

    if (participants.every((participant) => !participant.connected)) {
      const updated = await this.repository.updateById(session._id, {
        set: { status: "ended" },
      });
      if (updated) {
        await this.handleSessionEnded(session, updated);
      }
      return this.sanitizeSession(updated);
    }

    return null;
  }

  async proposeQuestionChange(sessionId, userId, payload) {
    const { errors, normalized } =
      CollaborationSessionValidator.validateQuestionProposal(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    const participant = this.getParticipant(session, userId);
    if (!participant) {
      throw new ApiError(
        403,
        "You are not part of this collaboration session.",
      );
    }

    if (session.pendingQuestionChange) {
      throw new ApiError(
        409,
        "There is already a pending question change request.",
      );
    }

    const now = this.now();
    const pendingQuestionChange = {
      questionId: normalized.questionId,
      proposedBy: userId,
      rationale: normalized.rationale ?? null,
      approvals: [userId],
      createdAt: now,
    };

    const updatedSession = await this.repository.updateById(sessionId, {
      set: {
        pendingQuestionChange,
      },
    });

    return this.sanitizeSession(updatedSession);
  }

  async respondToQuestionChange(sessionId, userId, payload) {
    const { errors, normalized } =
      CollaborationSessionValidator.validateQuestionResponse(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    let session = await this.repository.findById(sessionId);
    session = await this.checkExpiredSession(session);
    this.ensureActive(session);

    if (!session.pendingQuestionChange) {
      throw new ApiError(404, "There is no pending question change request.");
    }

    const participant = this.getParticipant(session, userId);
    if (!participant) {
      throw new ApiError(
        403,
        "You are not part of this collaboration session.",
      );
    }

    const pending = session.pendingQuestionChange;

    if (!normalized.accept) {
      const updatedSession = await this.repository.updateById(sessionId, {
        set: { pendingQuestionChange: null },
      });
      return this.sanitizeSession(updatedSession);
    }

    const approvals = new Set(pending.approvals ?? []);
    approvals.add(userId);

    const participants = session.participants ?? [];
    const everyoneApproved = participants
      .filter((p) => !!p)
      .every((p) => approvals.has(p.userId));

    if (everyoneApproved) {
      const updatedSession = await this.repository.updateById(sessionId, {
        set: {
          pendingQuestionChange: null,
          questionId: pending.questionId,
          code: "",
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

  async requestSessionEnd(sessionId, userId, payload) {
    const { errors, normalized } =
      CollaborationSessionValidator.validateEndSessionRequest(payload);
    if (errors.length > 0) {
      throw new ApiError(400, "Validation failed.", errors);
    }

    const session = await this.repository.findById(sessionId);
    this.ensureActive(session);

    const participant = this.getParticipant(session, userId);
    if (!participant) {
      throw new ApiError(
        403,
        "You are not part of this collaboration session.",
      );
    }

    const approvals = new Set(session.endRequests ?? []);
    if (normalized.confirm) {
      approvals.add(userId);
    } else {
      approvals.delete(userId);
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
      if (updatedSession) {
        await this.handleSessionEnded(session, updatedSession);
      }
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
    const currentSession = await this.repository.findById(sessionId);
    if (!currentSession) {
      throw new ApiError(404, "Collaboration session not found.");
    }

    const session = await this.repository.updateById(sessionId, {
      set: { status: "ended" },
    });
    if (!session) {
      throw new ApiError(500, "Failed to end collaboration session.");
    }
    await this.handleSessionEnded(currentSession, session ?? currentSession);
    return this.sanitizeSession(session);
  }

  async createConversation(sessionId) {
    const conversation = await this.openaiClient.conversations.create({
      metadata: { sessionId: sessionId },
    });

    await this.repository.updateById(sessionId, {
      set: { openai_conversationId: conversation.id },
    });

    return conversation.id;
  }

  async getConversationId(sessionId) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Collaboration session not found.");
    }
    let conversationId = session?.openai_conversationId;
    if (!conversationId) {
      conversationId = await this.createConversation(sessionId);
    }

    return conversationId;
  }

  async getConversation(sessionId) {
    const conversationId = await this.getConversationId(sessionId);

    const result = await this.openaiClient.conversations.items.list(
      conversationId,
      { order: "asc" },
    );

    const finalConversation = [];
    for (const item of result.data) {
      if (item.role === "system" || item.type === "reasoning") continue;

      finalConversation.push({
        type: item.type,
        role: item.role,
        content: item.content[0]?.text,
      });
    }

    return {
      conversationId: conversationId,
      conversation: finalConversation,
    };
  }

  async sendCustomMessage(sessionId, message) {
    const { conversation, conversationId } =
      await this.getConversation(sessionId);

    conversation.push({
      type: "message",
      role: "user",
      content: message,
    });

    let response;
    try {
      response = await this.openaiClient.responses.create({
        model: "gpt-5-nano",
        instructions: "You are a patient, technically strong coding assistant.",
        input: message,
        conversation: conversationId,
        max_output_tokens: 2000,
      });
    } catch (e) {
      if (e.code === "conversation_locked") {
        throw new ApiError(
          503,
          `Your partner is currently generating a response. Please try again soon`,
        );
      }
      throw new ApiError(500, `Failed to get response from AI: ${e.message}`);
    }

    conversation.push({
      type: "message",
      role: "assistant",
      content: response.output_text,
    });

    return {
      conversation,
      response: response.output_text,
    };
  }

  async explainCode(sessionId) {
    if (!sessionId) {
      throw new ApiError(400, "Session ID is required.");
    }

    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Collaboration session not found.");
    }

    const { conversation, conversationId } =
      await this.getConversation(sessionId);

    const question = await fetchQuestion(session.questionId);

    const finalInput = `Could you explain how to solve the following coding question?
**Question:**
${question.body}
**User's Code:**
${session.code}`;

    conversation.push({
      type: "message",
      role: "user",
      content: finalInput,
    });

    let response;
    try {
      response = await this.openaiClient.responses.create({
        model: "gpt-5-nano",
        instructions: `You are a patient, technically strong coding assistant. Your main job is to explain programming questions and solutions clearly, not just give final answers.
When a user asks a question: Limit each explanation to 1,000 words or less. Provide appropriate formatting in markdown, such as headers, code blocks and new lines. 
The question and the user's query and code will be attached below. Only return the FULL explanation, nothing else.
`,
        input: finalInput,
        conversation: conversationId,
        max_output_tokens: 2000,
      });
    } catch (e) {
      if (e.code === "conversation_locked") {
        throw new ApiError(
          503,
          `Your partner is currently generating a response. Please try again soon`,
        );
      }
      throw new ApiError(
        500,
        `Failed to get explanation from AI: ${e.message}`,
      );
    }

    conversation.push({
      type: "message",
      role: "assistant",
      content: response.output_text,
    });

    return {
      conversation,
      response: response.output_text,
    };
  }
}
