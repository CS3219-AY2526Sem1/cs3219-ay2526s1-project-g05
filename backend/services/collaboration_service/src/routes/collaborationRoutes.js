import { Router } from "express";
import { authenticate } from "../../../../common_scripts/authentication_middleware.js";

/**
 * AI Declarations for Collaboration Service
 * AI Assistance Disclosure:
 * Tool: Copilot (model: GPT‑5 Mini), date: 09-11-2025
 * Scope: Generated JSDoc type definitions for collaboration session objects and route documentation.
 * Author review: I validated correctness
 */

// AI-Generated (JSDoc types) (Edited by Teo Kai Xiang)
/**
 * A participant inside a collaboration session.
 * @typedef {object} SessionParticipant
 * @property {string} userId - The user identifier.
 * @property {string|null} displayName - Display name (may be null).
 * @property {boolean} connected - Whether the participant is currently connected.
 * @property {string} joinedAt - ISO timestamp (when participant joined).
 * @property {string} lastSeenAt - ISO timestamp (last seen at before disconnection etc.).
 * @property {string|null} disconnectedAt - ISO timestamp when disconnected or null.
 * @property {string|null} reconnectBy - ISO timestamp by which participant can reconnect, or null.
 * @property {boolean} endConfirmed - Whether the participant has agreed to end the session
 */

/**
 * Cursor position object stored per-user in `cursorPositions`.
 * @typedef {object} CursorPosition
 * @property {number} line - Optional line index.
 * @property {number} ch - Optional character/column index.
 * @property {string} updatedAt - ISO 8601 timestamp when this cursor was last updated.
 */

/**
 * Information about the last operation applied to the session.
 * @typedef {object} SessionLastOperation
 * @property {string} userId - ID of the user who performed the operation.
 * @property {string} type - Operation type (e.g. "insert", "delete", "cursor", "selection").
 * @property {number} version - Session version after the operation.
 * @property {string} timestamp - ISO timestamp when operation occurred.
 * @property {boolean} conflict - Whether the operation caused a conflict.
 */

/**
 * Pending question change proposal for the session.
 * @typedef {object} PendingQuestionChange
 * @property {string} questionId - ID of the proposed question.
 * @property {string} proposedBy - User ID who proposed the change.
 * @property {string|null} rationale - Optional rationale text.
 * @property {string[]} approvals - List of user IDs that approved.
 * @property {string} createdAt - ISO 8601 timestamp when proposal was created.
 */

/**
 * Sanitized session object returned by the service.
 * @typedef {object} Session
 * @property {string} id - Session identifier (string form of _id).
 * @property {string|null} questionId - The selected question ID, or null.
 * @property {string|null} code - The current session code (starter or edited), may be empty string or null.
 * @property {string} language - Programming language for the session (defaults to "javascript").
 * @property {number} version - Numeric version of the session state.
 * @property {string} status - Session status (e.g. "active", "ended").
 * @property {PendingQuestionChange|null} pendingQuestionChange - Current pending question change or null.
 * @property {SessionParticipant[]} participants - Array of participant objects
 * @property {Object.<string, CursorPosition>} cursorPositions - Object of userId => CursorPosition objects.
 * @property {SessionLastOperation|null} lastOperation - Metadata about the last operation or null.
 * @property {string[]} endRequests - List of user IDs who requested session end (approvals).
 * @property {string} createdAt - ISO timestamp when session was created.
 * @property {string} updatedAt - ISO timestamp when session was last updated.
 */

/**
 * Conversation type
 * @typedef {object} Conversation
 * @property {string} type - The type of the conversation message [e.g., "message", "reasoning"]
 * @property {string} content - The content of the conversation message
 * @property {string} role - The role of the msg, it is from assistant or user
 */

export const createCollaborationRouter = (controller) => {
  const router = Router();

  /**
   * POST /sessions request body schema
   * @typedef {object} sessionsRequest
   * @property {string[]} participants - The list of participant user IDs
   * @property {string} questionId - The selected question ID
   * @property {string} language - The programming language for the session
   */
  /**
   * POST /sessions
   * @summary Create a new collaboration session
   * @param {sessionsRequest} request.body.required - application/json
   * @returns {object} 201 - Collaboration session created successfully
   * @returns {object} 400 - Validation failed. <error message>
   * @returns {object} 400 - A maximum of ${MAX_PARTICIPANTS} participants are allowed per session.
   * @returns {object} 409 - User is already in an active collaboration session.
   * @returns {object} 500 - Internal server error
   * @security bearerAuth
   */
  router.post("/sessions", [authenticate(false)], controller.createSession);

  /**
   * GET /sessions/{sessionId}
   * @param {string} sessionId.path.required - The collaboration session identifier
   * @returns {Session} 200 - Success
   * @returns {object} 404 - Collaboration session not found
   * @returns {object} 500 - Internal server error
   * @security bearerAuth
   * @summary Fetch a collaboration session by its identifier
   */
  router.get(
    "/sessions/:sessionId",
    [authenticate(false)],
    controller.getSession,
  );

  /**
   * POST /sessions/{sessionId}/explain-code return body schema
   * @typedef {object} explainCodeResponse
   * @property {Conversation[]} conversation - The entire conversation thus far
   * @property {string} response - Text of this specific explanation
   */
  /**
   * POST /sessions/{sessionId}/explain-code
   * @param {string} sessionId.path.required - The collaboration session identifier
   * @returns {explainCodeResponse} 200 - Success
   * @returns {object} 404 - Collaboration session not found
   * @returns {object} 500 - Internal server error
   * @security bearerAuth
   * @summary Generate a new explanation for the code in the collaboration session
   */
  router.post(
    "/sessions/:sessionId/explain-code",
    [authenticate(false)],
    controller.explainCode,
  );

  /**
   * POST /sessions/{sessionId}/conversation return body schema
   * @typedef {object} conversationResponse
   * @property {Conversation[]} conversation - The entire conversation thus far
   * @property {string} conversationId - OpenAI id of the conversation
   */
  /**
   * GET /sessions/{sessionId}/conversation
   * @param {string} sessionId.path.required - The collaboration session identifier
   * @returns {conversationResponse} 200 - Success
   * @returns {object} 404 - Collaboration session not found
   * @returns {object} 500 - Internal server error
   * @security bearerAuth
   * @summary Fetch the conversation for this collaboration session
   */
  router.get(
    "/sessions/:sessionId/conversation",
    [authenticate(false)],
    controller.getConversation,
  );

  /**
   * POST /sessions/{sessionId}/message return body schema
   * @typedef {object} customMessageResponse
   * @property {Conversation[]} conversation - The entire conversation thus far
   * @property {string} response -The response to the custom message
   */
  /**
   * GET /sessions/{sessionId}/message
   * @param {string} sessionId.path.required - The collaboration session identifier
   * @returns {customMessageResponse} 200 - Success
   * @returns {object} 404 - Collaboration session not found
   * @returns {object} 500 - Internal server error
   * @security bearerAuth
   * @summary Send a custom message to the AI in the collaboration session
   */
  router.post(
    "/sessions/:sessionId/message",
    [authenticate(false)],
    controller.sendCustomMessage,
  );

  /**
   * POST /sessions/:sessionId/terminate
   * @summary [Unused for now] Administrative termination of a collaboration session
   */
  // router.post("/sessions/:sessionId/terminate", controller.terminateSession);

  return router;
};
