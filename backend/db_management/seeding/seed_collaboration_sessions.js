import { MongoClientInstance } from "../../common_scripts/mongo.js";
import { seed_user } from "./seed_users.js";

const COLLABORATION_SESSION_DOCUMENTS = [
  {
    roomId: "9dcffa",
    language: "Python",
    questionId: 1,
    code: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        ",
  },
];

export const seed_collaboration_sessions = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  const db = MongoClientInstance.db;
  const collection = db.collection("collaboration_sessions");

  // Need to seed our own users to ensure independent function
  const users = await Promise.all([
    seed_user({
      username: "collab_user1",
      email: "collab_user1@mail.com",
      password: "Testing123!",
    }),
    seed_user({
      username: "collab_user2",
      email: "collab_user2@mail.com",
      password: "Testing123!",
    }),
  ]);

  const mapped_sessions = COLLABORATION_SESSION_DOCUMENTS.map((session) => ({
    roomId: session.roomId,
    language: session.language,
    questionId: session.questionId,
    code: session.code,
    version: 0,
    status: "active",
    participants: users.map((user) => ({
      userId: user.id,
      displayName: user.username,
      connected: false,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
      disconnectedAt: null,
      reconnectBy: null,
      endConfirmed: false,
    })),
    pendingQuestionChange: null,
    endRequests: [],
    cursorPositions: {},
    lastOperation: null,
    lastConflictAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await collection.insertMany(mapped_sessions);

  console.log(
    `${COLLABORATION_SESSION_DOCUMENTS.length} sessions seeded successfully`,
  );
};
