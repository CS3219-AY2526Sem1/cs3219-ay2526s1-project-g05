import { MongoClientInstance } from "../common_scripts/mongo.js";
import { seed_collaboration_sessions } from "./seeding/seed_collaboration_sessions.js";
import { seed_question } from "./seeding/seed_questions.js";
import { seed_users } from "./seeding/seed_users.js";

const run = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  await seed_question();
  await seed_users();
  await seed_collaboration_sessions();

  MongoClientInstance.close();
};
run();
