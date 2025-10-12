export class UserValidator {
  static emailRegex = /^(?:[\w.!#$%&'*+/=?^`{|}~-]+)@(?:[\w-]+\.)+[\w-]{2,}$/i;
  static usernameRegex = /^[A-Za-z0-9_]{3,30}$/;
  static passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  static normalizeEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : "";
  }

  static normalizeUsername(username) {
    return typeof username === "string" ? username.trim() : "";
  }

  static validateRegistration({ username, email, password }) {
    const errors = [];
    const normalizedUsername = this.normalizeUsername(username);
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedUsername || !this.usernameRegex.test(normalizedUsername)) {
      errors.push(
        "Username must be 3-30 characters long and contain only letters, numbers, or underscores.",
      );
    }

    if (!normalizedEmail || !this.emailRegex.test(normalizedEmail)) {
      errors.push("A valid email address is required.");
    }

    if (!this.isValidPassword(password)) {
      errors.push(
        "Password must be at least 8 characters long and include 1 uppercase letter, 1 number, and 1 special character.",
      );
    }

    return {
      errors,
      normalized: {
        username: normalizedUsername,
        email: normalizedEmail,
        password,
      },
    };
  }

  static validateLogin({ email, password }) {
    const errors = [];
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail || !this.emailRegex.test(normalizedEmail)) {
      errors.push("A valid email address is required.");
    }

    if (typeof password !== "string" || password.length === 0) {
      errors.push("Password is required.");
    }

    return { errors, normalized: { email: normalizedEmail, password } };
  }

  static validateUpdate(updates) {
    const errors = [];
    const sanitizedUpdates = {};

    if (Object.hasOwn(updates, "email")) {
      const normalizedEmail = this.normalizeEmail(updates.email);
      if (!normalizedEmail || !this.emailRegex.test(normalizedEmail)) {
        errors.push("A valid email address is required.");
      } else {
        sanitizedUpdates.email = normalizedEmail;
      }
    }

    if (Object.hasOwn(updates, "username")) {
      const normalizedUsername = this.normalizeUsername(updates.username);
      if (!normalizedUsername || !this.usernameRegex.test(normalizedUsername)) {
        errors.push(
          "Username must be 3-30 characters long and contain only letters, numbers, or underscores.",
        );
      } else {
        sanitizedUpdates.username = normalizedUsername;
      }
    }

    if (Object.hasOwn(updates, "password")) {
      if (!this.isValidPassword(updates.password)) {
        errors.push(
          "Password must be at least 8 characters long and include 1 uppercase letter, 1 number, and 1 special character.",
        );
      } else {
        sanitizedUpdates.password = updates.password;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      errors.push("At least one updatable field (email, username, password) must be provided.");
    }

    return { errors, sanitizedUpdates };
  }

  static isValidPassword(password) {
    return typeof password === "string" && this.passwordRegex.test(password);
  }
}
