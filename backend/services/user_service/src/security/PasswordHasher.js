import argon2 from "argon2";

export class PasswordHasher {
  constructor(options = {}) {
    this.options = {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
      ...options,
    };
  }

  async hash(password) {
    return argon2.hash(password, this.options);
  }

  async verify(hash, password) {
    try {
      return await argon2.verify(hash, password, this.options);
    } catch (error) {
      return false;
    }
  }
}
