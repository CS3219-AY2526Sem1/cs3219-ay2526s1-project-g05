import path from "path";
import { MongoClientInstance } from "../../common_scripts/mongo.js";
import fs from "fs";

export const seed_question = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  const db = MongoClientInstance.db;
  const collection = db.collection("questions");
  const file_path = path.join(import.meta.dirname, "questions.json");

  if (!fs.existsSync(file_path)) {
    const response = await fetch("https://demo.parkaholic.sg/questions.json");
    const data = await response.text();
    fs.writeFileSync(file_path, data);
  }

  const questions = JSON.parse(fs.readFileSync(file_path, "utf-8"));
  await collection.insertMany(questions);
  console.log(`${questions.length} questions seeded successfully`);
};
