import { Router } from "express";
import { authenticate } from "../../../../common_scripts/authentication_middleware.js";

export const createMatchingRouter = (controller) => {
  const router = Router();

  /**
   * POST /queue
   * @summary Enters a user into the matching queue.
   * @description Adds the user to the queue and immediately attempts to find a match. Returns a sessionId for status tracking.
   * @param {object} request.body - The user and criteria data.
   * @param {string} request.body.difficulty.required - 'easy', 'medium', 'hard'.
   * @param {string[]} request.body.topics.required - List of topics the user wants to match on.
   * @returns {object} 202 - Match request accepted, includes the generated sessionId.
   * @returns {object} 400 - Bad Request (e.g., missing user or criteria, user already in queue).
   * @security bearerAuth
   */
  router.post("/queue", [authenticate(false)], controller.queue);

  /**
   * GET /status/?token={token}
   * @summary Creates a Server-Sent Events (SSE) connection for real-time match status updates.
   * @description Keeps the connection open. Sends 'matchFound' event, then 'matchFinalized' or 'sessionExpired' event.
   * @returns {stream} 200 - An SSE stream.
   */
  router.get("/status", controller.getStatus);

  /**
   * POST /cancel
   * @summary Cancels the session, removing it from the queue and any pending match states.
   * @description Used to voluntarily exit the queue or a pending match before confirmation. Closes any open SSE connection.
   * @param {object} request.body
   * @returns {object} 200 - Success message.
   * @security bearerAuth
   */
  router.post("/cancel", [authenticate(false)], controller.cancel);

  /**
   * POST /confirm
   * @summary Confirms participation in a pending match (Three-Way Handshake step 2).
   * @description Saves the user's confirmation status. If both users have confirmed, the match is finalized and the room token is returned.
   * @param {object} request.body
   * @returns {object} 200 - Status of the confirmation.
   * @returns {object} 400 - Bad Request (e.g., invalid sessionId, session not in pending match).
   * @security bearerAuth
   */
  router.post("/confirm", [authenticate(false)], controller.confirmMatch);

  /**
   * GET /is_in_queue
   * @summary Checks whether the user is currently in the matching queue.
   * @returns {object} 200 - Status of the confirmation.
   * @returns {object} 400 - Bad Request (e.g., invalid sessionId, session not in pending match).
   * @security bearerAuth
   */
  router.get(
    "/is_in_queue_match",
    [authenticate(false)],
    controller.isInQueueOrMatch,
  );

  return router;
};
