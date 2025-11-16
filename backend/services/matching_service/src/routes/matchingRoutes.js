import { Router } from "express";
import { authenticate } from "../../../../common_scripts/authentication_middleware.js";

/**
 * AI Declarations for Collaboration Service
 * AI Assistance Disclosure:
 * Tool: Gemini (model: 2.5 Flash), date: 10-11-2025
 * Scope: Generated JSDoc type definitions for matching session objects and route documentation.
 * Author review: I validated correctness
 */

// AI-Generated (JSDoc types) (edited by Ang Qi Jun)
/**
 * User object (passed by frontend, authenticated via middleware).
 * @typedef {object} User
 * @property {string} id - The user's primary identifier (must have this minimally).
 * @property {string} username - The user's display name.
 */

/**
 * Matching criteria object.
 * @typedef {object} MatchingCriteria
 * @property {('Easy'|'Medium'|'Hard')} difficulty - The desired question difficulty.
 * @property {string[]} topics - Array of desired topic tags (e.g., ["Dynamic Programming", "Trees"]).
 */

/**
 * Request body for entering the queue.
 * @typedef {object} QueueRequest
 * @property {User} user - The authenticated user object.
 * @property {MatchingCriteria} criteria - The criteria for the match.
 */

/**
 * Request body for matching actions (cancel/confirm).
 * @typedef {object} SessionIdRequest
 * @property {string} sessionId - The current session identifier (e.g., "user.id: 12441313").
 */

export const createMatchingRouter = (controller) => {
  const router = Router();

  /**
   * POST /queue
   * @summary Enters a user into the matching queue.
   * @description Adds the user to the queue and immediately attempts to find a match. Returns a sessionId for status tracking.
   * @param {QueueRequest} request.body.required - application/json
   * @returns {object} 202 - Match request accepted, includes the sessionId for tracking.
   * @returns {object} 400 - Validation failed (e.g., criteria missing).
   * @returns {object} 500 - Internal server error.
   * @security bearerAuth
   */
  router.post("/queue", [authenticate(false)], controller.queue);

  /**
   * GET /status/?token={token}
   * @summary Creates a Server-Sent Events (SSE) connection for real-time match status updates.
   * @description Keeps the connection open. Sends 'matchFound', 'matchFinalized', 'matchCancelled', 'sessionExpired', or 'rejoinedQueue' events.
   * @param {string} token.query.required - The session ID to monitor.
   * @returns {stream} 200 - An SSE stream.
   * @returns {object} 401 - Unauthorized (e.g., invalid or missing token).
   * @returns {object} 404 - Session ID not found in the queue.
   * @returns {object} 400 - An active SSE connection already exists for this session.
   * @security bearerAuth
   */
  router.get("/status", controller.getStatus);

  /**
   * POST /cancel
   * @summary Cancels the session, removing it from the queue and any pending match states.
   * @description Used to voluntarily exit the queue or a pending match before confirmation.
   * @param {SessionIdRequest} request.body.required - application/json
   * @returns {object} 200 - Success message.
   * @returns {object} 400 - Bad Request (e.g., missing sessionId).
   * @security bearerAuth
   */
  router.post("/cancel", [authenticate(false)], controller.cancel);

  /**
   * POST /confirm
   * @summary Confirms participation in a pending match (Three-Way Handshake step 2).
   * @description Saves the user's confirmation status. If both users have confirmed, the match is finalized.
   * @param {SessionIdRequest} request.body.required - application/json
   * @returns {object} 200.waiting - Confirmation received, waiting for partner.
   * @returns {object} 200.completed - Match finalized, returns collaboration token.
   * @returns {object} 400 - Match already confirmed.
   * @returns {object} 404 - Pending match not found or expired.
   * @security bearerAuth
   */
  router.post("/confirm", [authenticate(false)], controller.confirmMatch);

  /**
   * GET /is_in_queue_match
   * @summary Checks if the currently authenticated user is in the queue or in a pending match.
   * @description Used primarily by other services (e.g., User Service) or the client for pre-session checks.
   * @returns {object} 200 - { isWaiting: boolean, matchId: string|null }.
   * @returns {object} 401 - Unauthorized (missing or invalid token).
   * @security bearerAuth
   */
  router.get(
    "/is_in_queue_match",
    [authenticate(false)],
    controller.isInQueueOrMatch,
  );

  return router;
};
