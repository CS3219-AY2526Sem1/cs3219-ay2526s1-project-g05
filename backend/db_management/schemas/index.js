import {
  question_schema,
  question_indexes,
  question_user,
} from "./questions.js";
import { users_schema, users_indexes, users_user } from "./users.js";
import {
  collaboration_sessions_schema,
  collaboration_sessions_indexes,
  collaboration_sessions_user,
} from "./collaboration_sessions.js";

// Add your schemas here!
export const COLLECTIONS = {
  questions: {
    schema: question_schema,
    indexes: question_indexes,
    user: question_user,
  },
  users: {
    schema: users_schema,
    indexes: users_indexes,
    user: users_user,
  },
  collaboration_sessions: {
    schema: collaboration_sessions_schema,
    indexes: collaboration_sessions_indexes,
    user: collaboration_sessions_user,
  },
};
