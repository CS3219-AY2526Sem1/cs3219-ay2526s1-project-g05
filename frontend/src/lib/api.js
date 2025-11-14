export const API_BASE_URL = import.meta.env.MODE === "production" ? "/api" : "";

/**
 * Base fetch wrapper with error handling
 */
export async function apiFetch(endpoint, options = {}, isAuthenticated = true) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const config = {
    headers: {
      "Content-Type": "application/json",

      ...options.headers,
    },
    ...options,
  };

  if (isAuthenticated) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "An error occurred");
    error.status = response.status;
    error.errors = data.errors || [];
    throw error;
  }

  return data;
}

const USER_API_BASE_URL =
  import.meta.env.MODE === "production" ? "/users" : "http://localhost:4001";
/**
 * User API methods
 */
export const userApi = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Password
   * @returns {Promise<Object>} Registered user data
   */
  register: async (userData) => {
    return apiFetch(
      `${USER_API_BASE_URL}/register`,
      {
        method: "POST",
        body: JSON.stringify(userData),
      },
      false,
    );
  },

  /**
   * Login a user
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - Email address
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} User data and authentication token
   */
  login: async (credentials) => {
    return apiFetch(
      `${USER_API_BASE_URL}/login`,
      {
        method: "POST",
        body: JSON.stringify(credentials),
      },
      false,
    );
  },

  /**
   * Get own user
   * @returns {Promise<Object>} User data
   */
  getMe: async () => {
    return apiFetch(`${USER_API_BASE_URL}/me`, {
      method: "GET",
    });
  },

  /**
   * Update own user
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user data
   */
  update: async (updates) => {
    return apiFetch(`${USER_API_BASE_URL}/me`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete user account
   * @param {string} password - Password confirmation
   * @returns {Promise<Object>} Deletion confirmation
   */
  delete: async (password) => {
    return apiFetch(`${USER_API_BASE_URL}/me`, {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
  },

  /**
   * Request password reset
   * @param {string} email - Email address
   * @returns {Promise<Object>} Password reset confirmation
   */
  requestPasswordReset: async (email) => {
    return apiFetch(`${USER_API_BASE_URL}/password-reset/request`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Reset password with token
   * @param {string} token - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Password reset confirmation
   */
  resetPassword: async (token, newPassword) => {
    return apiFetch(`${USER_API_BASE_URL}/password-reset/confirm`, {
      method: "POST",
      body: JSON.stringify({ token, password: newPassword }),
    });
  },
};
