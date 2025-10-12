export class LoginSecurityManager {
  static MAX_FAILED_ATTEMPTS = 5;
  static FAILURE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  static isAccountLocked(user) {
    return Boolean(user?.accountLocked);
  }

  static getLockMessage() {
    return "Account locked due to multiple failed login attempts. Please reset your password to unlock.";
  }

  static buildFailedAttemptUpdate(user) {
    const now = new Date();
    const priorWindowStart = user?.failedLoginWindowStart
      ? new Date(user.failedLoginWindowStart)
      : null;

    let failedAttempts = (user?.failedLoginAttempts ?? 0) + 1;
    let windowStart = priorWindowStart ?? now;

    if (!priorWindowStart || now.getTime() - priorWindowStart.getTime() > this.FAILURE_WINDOW_MS) {
      failedAttempts = 1;
      windowStart = now;
    }

    const update = {
      failedLoginAttempts: failedAttempts,
      failedLoginWindowStart: windowStart,
    };

    if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      update.accountLocked = true;
      update.accountLockedAt = now;
    }

    return update;
  }

  static buildSuccessfulLoginUpdate() {
    return {
      failedLoginAttempts: 0,
      failedLoginWindowStart: null,
      accountLocked: false,
      accountLockedAt: null,
    };
  }

  static buildUnlockUpdate() {
    return this.buildSuccessfulLoginUpdate();
  }
}
