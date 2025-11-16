import { ObjectId } from "mongodb";

export class UserRepository {
  constructor(db) {
    this.collection = db.collection("users");
  }

  static async initialize(db) {
    const repository = new UserRepository(db);
    return repository;
  }

  async create(user) {
    const now = new Date();
    const payload = {
      ...user,
      createdAt: now,
      updatedAt: now,
      failedLoginAttempts: 0,
      failedLoginWindowStart: null,
      accountLocked: false,
      accountLockedAt: null,
      pastCollaborationSessions: [],
      collaborationSessionId: null,
    };
    const result = await this.collection.insertOne(payload);
    return { ...payload, _id: result.insertedId };
  }

  async findByEmail(email) {
    return this.collection.findOne({ email });
  }

  async findByUsername(username) {
    return this.collection.findOne({ username });
  }

  async findByEmailOrUsername(email, username) {
    return this.collection.findOne({
      $or: [{ email }, { username }],
    });
  }

  async findById(id) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByResetToken(hashedToken) {
    return this.collection.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() },
    });
  }

  async updateById(id, { set = {}, unset = {}, push = {} }) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const update = {};
    const updatedAt = new Date();
    update.$set = { updatedAt, ...set };
    if (Object.keys(unset).length > 0) {
      update.$unset = unset;
    }
    if (Object.keys(push).length > 0) {
      update.$push = push;
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: "after" },
    );
    return result;
  }

  async updateOne(filter, { set = {}, unset = {}, push = {} }) {
    const update = {};
    const updatedAt = new Date();
    update.$set = { updatedAt, ...set };
    if (Object.keys(unset).length > 0) {
      update.$unset = unset;
    }
    if (Object.keys(push).length > 0) {
      update.$push = push;
    }

    const result = await this.collection.findOneAndUpdate(filter, update, {
      returnDocument: "after",
    });
    return result;
  }

  async deleteById(id) {
    if (!ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  async findPastCollaborationSession(userId, sessionId) {
    const result = await this.collection.findOne({
      _id: new ObjectId(userId),
      pastCollaborationSessions: sessionId,
    });

    return result;
  }
}
