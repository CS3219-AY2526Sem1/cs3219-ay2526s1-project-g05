import { question_schema, question_indexes } from "./questions.js";
import { users_schema, users_indexes } from "./users.js";

// Add your schemas here!
export const COLLECTIONS = {
  questions: {
    schema: question_schema,
    indexes: question_indexes,
  },
  users: {
    schema: users_schema,
    indexes: users_indexes,
  },
};
