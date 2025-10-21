import { Router } from "express";
import { authenticate } from "../../../../common_scripts/authentication_middleware.js";

export const createMatchingRouter = (controller) => {
    const router = Router();

    /**
     * POST /queue
     * @summary Enters a user into the matching queue.
     * @description Adds the user to the queue and immediately attempts to find a match. Returns a sessionId for status tracking.
     * @param {object} request.body - The user and criteria data.
     * @param {object} request.body.user.required - User details (e.g., { id: '123', name: 'Alice' }).
     * @param {object} request.body.criteria.required - Matching criteria (e.g., { difficulty: 'easy', topics: ['data_structures'] }).
     * @returns {object} 202 - Match request accepted, includes the generated sessionId.
     * @returns {object} 400 - Bad Request (e.g., missing user or criteria, user already in queue).
     * @security bearerAuth
     */
    router.post("/queue", [authenticate], controller.queue);

    /**
     * GET /status/:userId
     * @summary Creates a Server-Sent Events (SSE) connection for real-time match status updates.
     * @description Keeps the connection open. Sends 'matchFound' event, then 'matchFinalized' or 'sessionExpired' event.
     * @param {string} userId.path.required - The user ID to monitor.
     * @returns {stream} 200 - An SSE stream.
     * @security bearerAuth
     */
    router.get("/status/:userId", [authenticate], controller.getStatus);

    /**
     * POST /cancel
     * @summary Cancels the session, removing it from the queue and any pending match states.
     * @description Used to voluntarily exit the queue or a pending match before confirmation. Closes any open SSE connection.
     * @param {object} request.body
     * @param {string} request.body.sessionId.required - The session ID to cancel.
     * @returns {object} 200 - Success message.
     * @security bearerAuth
     */
    router.post("/cancel", [authenticate], controller.cancel);

    /**
     * POST /confirm
     * @summary Confirms participation in a pending match (Three-Way Handshake step 2).
     * @description Saves the user's confirmation status. If both users have confirmed, the match is finalized and the room token is returned.
     * @param {object} request.body
     * @param {string} request.body.sessionId.required - The session ID confirming the match.
     * @returns {object} 200 - Status of the confirmation.
     * @returns {object} 400 - Bad Request (e.g., invalid sessionId, session not in pending match).
     * @security bearerAuth
     */
    router.post("/confirm", [authenticate], controller.confirmMatch);

    return router;
};
