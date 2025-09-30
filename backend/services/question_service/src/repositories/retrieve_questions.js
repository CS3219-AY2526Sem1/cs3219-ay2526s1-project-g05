import { MongoClientInstance } from "../../../../common_scripts/mongo.js";

export const get_question_by_id = async (id) => {
  // Placeholder implementation
  const collection = MongoClientInstance.db.collection("questions");
  return await collection.findOne({ QID: id }, { projection: { _id: 0 } });
};
