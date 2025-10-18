import { MongoClientInstance } from "../common_scripts/mongo.js";
import { seed_question } from "./seeding/seed_questions.js";

const run = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  await seed_question();

  MongoClientInstance.close();
};
run();
