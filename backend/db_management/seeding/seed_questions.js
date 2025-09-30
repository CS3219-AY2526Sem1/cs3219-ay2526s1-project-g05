import { MongoClientInstance } from "../../common_scripts/mongo.js";
import fs from "fs";

export const seed_question = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  const db = MongoClientInstance.db;
  const collection = db.collection("questions");

  if (!fs.existsSync("question.json")) {
    const response = await fetch("https://demo.parkaholic.sg/questions.json");
    const data = await response.text();
    fs.writeFileSync("question.json", data);
  }

  const questions = JSON.parse(fs.readFileSync("question.json", "utf-8"));
  await collection.insertMany(questions);
  console.log(`${questions.length} questions seeded successfully`);
};
