import { MongoClientInstance } from "../../common_scripts/mongo.js";
import argon2 from "argon2";

const USER_DOCUMENTS = [
  {
    username: "test1",
    email: "test1@mail.com",
    password: "Testing123!",
  },
  {
    username: "test2",
    email: "test2@mail.com",
    password: "Testing123!",
  },
];

export const seed_user = async (user) => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  const db = MongoClientInstance.db;
  const collection = db.collection("users");

  const doc = {
    username: user.username,
    email: user.email,
    passwordHash: await argon2.hash(user.password),
    createdAt: new Date(),
    updatedAt: new Date(),
    failedLoginAttempts: 0,
    failedLoginWindowStart: null,
    accountLocked: false,
    accountLockedAt: null,
    collaborationSessionId: null,
    pastCollaborationSessions: [],
    codeRunnerServiceUsage: null,
  };
  const insertedDoc = await collection.insertOne(doc);

  return { ...doc, id: insertedDoc.insertedId.toString() };
};

export const seed_users = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }

  try {
    const db = MongoClientInstance.db;
    const collection = db.collection("users");

    const mapped_users = await Promise.all(
      USER_DOCUMENTS.map(async (user) => ({
        username: user.username,
        email: user.email,
        passwordHash: await argon2.hash(user.password),
        createdAt: new Date(),
        updatedAt: new Date(),
        failedLoginAttempts: 0,
        failedLoginWindowStart: null,
        accountLocked: false,
        accountLockedAt: null,
        collaborationSessionId: null,
        pastCollaborationSessions: [],
        codeRunnerServiceUsage: null,
      })),
    );

    await collection.insertMany(mapped_users);

    console.log(`${USER_DOCUMENTS.length} users seeded successfully`);
  } catch (err) {
    console.dir(
      err.errInfo?.details ?? err.writeErrors?.[0]?.errInfo?.details ?? err,
      { depth: null },
    );
  }
};
