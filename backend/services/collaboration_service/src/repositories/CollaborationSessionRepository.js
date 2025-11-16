import { ObjectId } from "mongodb";
import { RedisClient } from "../utils/RedisClient.js";
import { parseDate } from "../utils/misc.js";
export class CollaborationSessionRepository {
  constructor(db) {
    this.collection = db.collection("collaboration_sessions");
  }

  static async initialize(db) {
    const repository = new CollaborationSessionRepository(db);
    return repository;
  }

  buildUpdate({ set = {}, unset = {}, inc = {}, push = {}, pull = {} } = {}) {
    const update = {};
    const now = new Date();
    update.$set = { updatedAt: now, ...set };

    if (Object.keys(unset).length > 0) {
      update.$unset = unset;
    }

    if (Object.keys(inc).length > 0) {
      update.$inc = inc;
    }

    if (Object.keys(push).length > 0) {
      update.$push = push;
    }

    if (Object.keys(pull).length > 0) {
      update.$pull = pull;
    }

    return update;
  }

  async create(payload) {
    const now = new Date();
    const doc = {
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async findById(id) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    // Update redis state for this session
    const session = await RedisClient.client.get(`collab_session:${id}`);
    if (session) {
      const parsedSession = JSON.parse(session);

      return {
        ...parsedSession,
        lastConflictAt: parseDate(parsedSession.lastConflictAt),
        createdAt: parseDate(parsedSession.createdAt),
        updatedAt: parseDate(parsedSession.updatedAt),
        participants: parsedSession.participants.map((p) => ({
          ...p,
          joinedAt: parseDate(p.joinedAt),
          lastSeenAt: parseDate(p.lastActiveAt),
          disconnectedAt: parseDate(p.disconnectedAt),
          reconnectBy: parseDate(p.reconnectBy),
        })),
      };
    }

    const session_from_db = await this.collection.findOne({
      _id: new ObjectId(id),
    });
    if (session_from_db) {
      await RedisClient.client.set(
        `collab_session:${id}`,
        JSON.stringify(session_from_db),
      );
    }

    return session_from_db;
  }

  async updateById(id, operations, options = {}) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const update = this.buildUpdate(operations);

    let result;
    try {
      result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        update,
        { returnDocument: "after", ...options },
      );
    } catch (e) {
      console.dir(e, { depth: null });
    }

    // Update redis state for this session
    await RedisClient.client.set(
      `collab_session:${id}`,
      JSON.stringify(result),
      {
        EX: 300, // expire in 5 minutes
      },
    );

    return result;
  }

  async deleteById(id) {
    if (!ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });

    // Update redis state for this session
    await RedisClient.client.del(`collab_session:${id}`);

    return result.deletedCount === 1;
  }

  async removeExpiredSessions(expiryDate) {
    const result = await this.collection.deleteMany({
      status: { $in: ["expired", "ended"] },
      updatedAt: { $lt: expiryDate },
    });
    return result.deletedCount;
  }

  async getParticipantActiveSessions(userId) {
    return await this.collection
      .find({
        status: "active",
        "participants.userId": userId,
      })
      .toArray();
  }
}
