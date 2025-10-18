import { question_schema, question_indexes } from "./questions.js";

// Add your schemas here!
export const COLLECTIONS = {
  questions: {
    schema: question_schema,
    indexes: question_indexes,
  },
};
