import { ObjectId } from "mongodb";

export class CollaborationSessionRepository {
  constructor(db) {
    this.collection = db.collection("collaboration_sessions");
  }

  static async initialize(db) {
    const repository = new CollaborationSessionRepository(db);
    await repository.ensureIndexes();
    return repository;
  }

  async ensureIndexes() {
    await Promise.all([
      this.collection.createIndex({ roomId: 1 }, { unique: true, name: "uniq_room" }),
      this.collection.createIndex({ "participants.userId": 1 }, { name: "participants_user" }),
      this.collection.createIndex({ status: 1, updatedAt: 1 }, { name: "status_updated" }),
    ]);
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
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByRoomId(roomId) {
    return this.collection.findOne({ roomId });
  }

  async updateById(id, operations, options = {}) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const update = this.buildUpdate(operations);
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: "after", ...options },
    );
    return result.value;
  }

  async updateOne(filter, operations, options = {}) {
    const update = this.buildUpdate(operations);
    const result = await this.collection.findOneAndUpdate(filter, update, {
      returnDocument: "after",
      ...options,
    });
    return result.value;
  }

  async deleteById(id) {
    if (!ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  async removeExpiredSessions(expiryDate) {
    const result = await this.collection.deleteMany({
      status: { $in: ["expired", "ended"] },
      updatedAt: { $lt: expiryDate },
    });
    return result.deletedCount;
  }
}
