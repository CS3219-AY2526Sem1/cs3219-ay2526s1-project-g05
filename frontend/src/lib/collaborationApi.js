import { apiFetch } from "./api.js";

export const COLLABORATION_API_URL =
  import.meta.env.MODE === "production"
    ? "/collaboration"
    : "http://localhost:4004";

/**
 * Matching API methods
 */
export const collaborationApi = {
  /**
   * Start a new matchmaking process
   * @param {Object} matchingCriteria - User registration data
   * @param {string} matchingCriteria.difficulty - difficulty level
   * @param {string[]} matchingCriteria.topics - list of topics
   * @returns {Promise<Object>} Registered user data
   */
  enterQueue: async (matchingCriteria) => {
    return apiFetch(`${COLLABORATION_API_URL}/queue`, {
      method: "POST",
      body: JSON.stringify(matchingCriteria),
    });
  },

  getSession: async (sessionId) => {
    return apiFetch(`${COLLABORATION_API_URL}/sessions/${sessionId}`, {
      method: "GET",
    });
  },

  getSessionAllowEnded: async (sessionId) => {
    return apiFetch(
      `${COLLABORATION_API_URL}/sessions/${sessionId}?includeEnded=1`,
      { method: "GET" }
    );
  },

  explainCode: async (sessionId) => {
    return apiFetch(
      `${COLLABORATION_API_URL}/sessions/${sessionId}/explain-code`,
      {
        method: "POST",
      },
    );
  },

  getConversation: async (sessionId) => {
    return apiFetch(
      `${COLLABORATION_API_URL}/sessions/${sessionId}/conversation`,
      {
        method: "GET",
      },
    );
  },

  sendCustomMessage: async (sessionId, message) => {
    return apiFetch(`${COLLABORATION_API_URL}/sessions/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
};
