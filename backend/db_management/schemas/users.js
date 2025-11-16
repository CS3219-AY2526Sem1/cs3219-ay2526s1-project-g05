export const users_schema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "username",
        "email",
        "passwordHash",
        "createdAt",
        "updatedAt",
        "failedLoginAttempts",
        "failedLoginWindowStart",
        "accountLocked",
        "accountLockedAt",
        "collaborationSessionId",
        "pastCollaborationSessions",
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        username: {
          bsonType: "string",
          pattern: "^[A-Za-z0-9_]{3,30}$",
          description: "3 to 30 chars. Letters, numbers, underscores only",
        },
        email: {
          bsonType: "string",
          maxLength: 320,
          pattern: "^(?:[\\w.!#$%&'*+/=?^`{|}~-]+)@(?:[\\w-]+\\.)+[\\w-]{2,}$",
          description: "Valid email string",
        },
        passwordHash: {
          bsonType: "string",
          description: "Argon2id encoded hash",
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp",
        },
        updatedAt: {
          bsonType: "date",
          description: "Last update timestamp",
        },
        failedLoginAttempts: {
          bsonType: "int",
          minimum: 0,
          description: "Non-negative integer",
        },
        failedLoginWindowStart: {
          bsonType: ["date", "null"],
          description: "Nullable date",
        },
        accountLocked: {
          bsonType: "bool",
          description: "Account lock flag",
        },
        accountLockedAt: {
          bsonType: ["date", "null"],
          description: "Nullable date",
        },
        collaborationSessionId: {
          bsonType: ["string", "null"],
          description:
            "Nullable string for collaborative session ID - indicates whether user is in a collaborative session",
        },
        pastCollaborationSessions: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Array of strings for past collaborative session IDs",
        },
        codeRunnerServiceUsage: {
          bsonType: ["string", "null"],
          description: "ID of container this user is running code on, if any",
        },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
};

export const users_indexes = [
  { key: { username: 1 }, options: { unique: true, name: "username_index" } },
  { key: { email: 1 }, options: { unique: true, name: "email_index" } },
];

export const users_user = {
  username: process.env.USERSERVICE_DB_USER,
  password: process.env.USERSERVICE_DB_PASSWORD,
};
