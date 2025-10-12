export const question_schema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "QID",
        "title",
        "titleSlug",
        "difficulty",
        "topics",
        "body",
        "code",
      ],
      properties: {
        QID: {
          bsonType: "int",
          description: "Question ID must be an integer and is required",
        },
        title: {
          bsonType: "string",
          description: "Title must be a string and is required",
        },
        titleSlug: {
          bsonType: "string",
          description: "Slug must be a string and is required",
        },
        difficulty: {
          enum: ["Easy", "Medium", "Hard"],
          description: "Difficulty must be one of Easy, Medium, Hard",
        },
        hints: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Hints must be an array of strings",
        },
        companies: {
          bsonType: ["array", "null"],
          items: { bsonType: "string" },
          description: "Optional array of company names or null",
        },
        topics: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Topics must be an array of strings",
        },
        body: {
          bsonType: "string",
          description: "Body text must be a string and is required",
        },
        code: {
          bsonType: "string",
          description: "Code snippet must be a string and is required",
        },
        similarQuestions: {
          bsonType: "array",
          items: { bsonType: "int" },
          description: "Similar questions must be an array of integers",
        },
      },
    },
  },
};

export const question_indexes = [
  { key: { QID: 1 }, options: { unique: true, name: "QID_index" } },
  { key: { topics: 1 }, options: { name: "topic_index" } },
  { key: { difficulty: 1 }, options: { name: "difficulty_index" } },
  { key: { title: "text" }, options: { name: "title_text_index" } },
];
