import { Router } from "express";

export const createMatchingRouter = (controller) => {
    const router = Router();

    /**
     * POST /queue
     * @summary Enters a user into the matching queue.
     * @description Adds the user to the queue and immediately attempts to find a match. Returns a sessionId for status tracking.
     * @param {object} req.body - The user and criteria data.
     * @param {object} req.body.user.required - User details (e.g., { id: '123', name: 'Alice' }).
     * @param {object} req.body.criteria.required - Matching criteria (e.g., { difficulty: 'easy', topics: ['data_structures'] }).
     * @returns {object} 202 - Match request accepted, includes the generated sessionId.
     * @example
     * request: { "user": { "id": "u1", "name": "UserA" }, "criteria": { "difficulty": "medium", "topics": ["arrays"] } }
     * response: { "message": "Match request accepted. Check status for updates.", "sessionId": "session-u1-1678886400000" }
     */
    router.post("/queue", controller.queue);

    /**
     * GET /status/:sessionId
     * @summary Creates a Server-Sent Events (SSE) connection for real-time match status updates.
     * @description Keeps the connection open. Sends 'matchFound' event, then 'matchFinalized' or 'sessionExpired' event.
     * @param {string} sessionId.path.required - The session ID to monitor.
     * @returns {stream} 200 - An SSE stream.
     */
    router.get("/status/:sessionId", controller.getStatus);

    /**
     * POST /cancel
     * @summary Cancels the session, removing it from the queue and any pending match states.
     * @description Used to voluntarily exit the queue or a pending match before confirmation. Closes any open SSE connection.
     * @param {object} req.body
     * @param {string} req.body.sessionId.required - The session ID to cancel.
     * @returns {object} 200 - Success message.
     * @example
     * request: { "sessionId": "session-u1-1678886400000" }
     * response: { "message": "Exited queue successfully." }
     */
    router.post("/cancel", controller.cancel);

    /**
     * POST /confirm
     * @summary Confirms participation in a pending match (Three-Way Handshake step 2).
     * @description Saves the user's confirmation status. If both users have confirmed, the match is finalized and the room token is returned.
     * @param {object} req.body
     * @param {string} req.body.sessionId.required - The session ID confirming the match.
     * @returns {object} 200 - Status of the confirmation.
     * @returns {object} 200.waiting - Confirmation received, waiting for partner.
     * @returns {object} 200.completed - Match finalized, returns collaboration token.
     */
    router.post("/confirm", controller.confirmMatch);

    return router;
};
