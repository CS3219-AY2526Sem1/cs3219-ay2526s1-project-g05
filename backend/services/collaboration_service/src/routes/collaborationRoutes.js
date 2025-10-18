import { Router } from "express";

export const createCollaborationRouter = (controller) => {
  const router = Router();

  /**
   * POST /sessions
   * @summary Create a new collaboration session
   */
  router.post("/sessions", controller.createSession);

  /**
   * GET /sessions/:sessionId
   * @summary Fetch a collaboration session by its identifier
   */
  router.get("/sessions/:sessionId", controller.getSession);

  /**
   * GET /rooms/:roomId
   * @summary Fetch an active collaboration session using the public room id
   */
  router.get("/rooms/:roomId", controller.getSessionByRoomId);

  /**
   * POST /sessions/:sessionId/join
   * @summary Join an existing collaboration session
   */
  router.post("/sessions/:sessionId/join", controller.joinSession);

  /**
   * POST /sessions/:sessionId/operations
   * @summary Submit an editor operation for the collaboration session
   */
  router.post("/sessions/:sessionId/operations", controller.submitOperation);

  /**
   * POST /sessions/:sessionId/leave
   * @summary Leave the collaboration session or request termination
   */
  router.post("/sessions/:sessionId/leave", controller.leaveSession);

  /**
   * POST /sessions/:sessionId/reconnect
   * @summary Reconnect a participant that temporarily disconnected
   */
  router.post("/sessions/:sessionId/reconnect", controller.reconnectParticipant);

  /**
   * POST /sessions/:sessionId/question/propose
   * @summary Propose a new question for the collaboration session
   */
  router.post("/sessions/:sessionId/question/propose", controller.proposeQuestionChange);

  /**
   * POST /sessions/:sessionId/question/respond
   * @summary Respond to a pending question change proposal
   */
  router.post("/sessions/:sessionId/question/respond", controller.respondToQuestionChange);

  /**
   * POST /sessions/:sessionId/end
   * @summary Request to end the collaboration session (requires both participants)
   */
  router.post("/sessions/:sessionId/end", controller.requestSessionEnd);

  /**
   * POST /sessions/:sessionId/terminate
   * @summary Administrative termination of a collaboration session
   */
  router.post("/sessions/:sessionId/terminate", controller.terminateSession);

  return router;
};
