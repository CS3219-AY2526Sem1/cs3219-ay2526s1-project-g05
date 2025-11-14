export const collaboration_sessions_schema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
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

        language: {
          bsonType: "string",
          enum: ["Python", "Javascript"],
          description: "Must be one of the supported programming languages",
        },

        openai_conversationId: { bsonType: ["string", "null"] },

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
              joinedAt: { bsonType: ["date", "null"] },
              lastSeenAt: { bsonType: ["date", "null"] },
              disconnectedAt: { bsonType: ["date", "null"] },
              reconnectBy: { bsonType: ["date", "null"] },
              endConfirmed: { bsonType: "bool" },
            },
          },
        },

        pendingQuestionChange: {
          bsonType: ["object", "null"],
          properties: {
            questionId: { bsonType: "int" },
            proposedBy: { bsonType: "string" },
            rationale: { bsonType: ["string", "null"] },
            approvals: { bsonType: "array", items: { bsonType: "string" } },
            createdAt: { bsonType: "date" },
          },
        },

        endRequests: {
          bsonType: "array",
          items: { bsonType: "string" },
        },

        cursorPositions: {
          bsonType: "object",
          additionalProperties: true,
          properties: {
            line: { bsonType: "int" },
            ch: { bsonType: "int" },
            updatedAt: { bsonType: "date" },
          },
        },

        lastOperation: {
          bsonType: ["object", "null"],
          properties: {
            userId: { bsonType: "string" },
            type: { bsonType: "string" },
            version: { bsonType: "int" },
            timestamp: { bsonType: "date" },
            conflict: { bsonType: "bool" },
          },
        },

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

export const collaboration_sessions_user = {
  username: process.env.COLLABORATIONSERVICE_DB_USER,
  password: process.env.COLLABORATIONSERVICE_DB_PASSWORD,
};
