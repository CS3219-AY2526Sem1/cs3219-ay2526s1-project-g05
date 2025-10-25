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
};
