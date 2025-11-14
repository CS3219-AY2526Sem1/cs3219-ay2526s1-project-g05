import { apiFetch } from "./api.js";

export const MATCHING_API_URL =
  import.meta.env.MODE === "production" ? "/matching" : "http://localhost:4003";
/**
 * Matching API methods
 */
export const matchingApi = {
  /**
   * Start a new matchmaking process
   * @param {Object} matchingCriteria - User registration data
   * @param {string} matchingCriteria.difficulty - difficulty level
   * @param {string[]} matchingCriteria.topics - list of topics
   * @returns {Promise<Object>} Registered user data
   */
  enterQueue: async (matchingCriteria) => {
    return apiFetch(`${MATCHING_API_URL}/queue`, {
      method: "POST",
      body: JSON.stringify(matchingCriteria),
    });
  },

  checkIsInQueueOrMatch: async () => {
    return apiFetch(`${MATCHING_API_URL}/is_in_queue_match`, {
      method: "GET",
    });
  },

  cancelQueue: async () => {
    return apiFetch(`${MATCHING_API_URL}/cancel`, {
      method: "POST",
    });
  },

  confirmMatch: async () => {
    return apiFetch(`${MATCHING_API_URL}/confirm`, {
      method: "POST",
    });
  },
};
