export const collaboration_sessions_schema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "roomId",
        "language",
        "questionId",
        "code",
        "version",
        "status",
        "participants",
        "pendingQuestionChange",
        "endRequests",
        "cursorPositions",
        "lastOperation",
        "lastConflictAt",
        "createdAt",
        "updatedAt",
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },

        roomId: { bsonType: "string", minLength: 1 },

        language: {
          bsonType: "string",
          enum: ["Python", "Javascript"],
          description: "Must be one of the supported programming languages",
        },

        questionId: { bsonType: ["int", "long"], minimum: 0 },

        code: { bsonType: "string" },

        version: { bsonType: ["int", "long"], minimum: 0 },

        status: { bsonType: "string" },

        participants: {
          bsonType: "array",
          minItems: 2, // Min. 2 participants
          items: {
            bsonType: "object",
            required: [
              "userId",
              "displayName",
              "connected",
              "joinedAt",
              "lastSeenAt",
              "disconnectedAt",
              "reconnectBy",
              "endConfirmed",
            ],
            additionalProperties: false,
            properties: {
              userId: { bsonType: "string", minLength: 1 },
              displayName: { bsonType: "string", minLength: 1 },
              connected: { bsonType: "bool" },
              joinedAt: { bsonType: "date" },
              lastSeenAt: { bsonType: "date" },
              disconnectedAt: { bsonType: ["date", "null"] },
              reconnectBy: { bsonType: ["date", "null"] },
              endConfirmed: { bsonType: "bool" },
            },
          },
        },

        pendingQuestionChange: { bsonType: ["object", "null"] },

        endRequests: {
          bsonType: "array",
          items: { bsonType: "object" },
        },

        cursorPositions: {
          // TODO: Update with final structure
          bsonType: "object",
          additionalProperties: true,
        },

        lastOperation: { bsonType: ["object", "null"] },

        lastConflictAt: { bsonType: ["date", "null"] },

        createdAt: { bsonType: "date" },

        updatedAt: { bsonType: "date" },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
};

export const collaboration_sessions_indexes = [
  { key: { language: 1 }, options: { name: "language_index" } },
  { key: { status: 1 }, options: { name: "status_index" } },
  {
    key: { "participants.userId": 1 },
    options: { name: "participants.userId_index" },
  },
];
