import { MongoClientInstance } from "../common_scripts/mongo.js";

const run = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  const db = MongoClientInstance.db;

  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).drop();
    console.info(`Collection ${collection.name} dropped.`);
  }

  MongoClientInstance.close();
  return true;
};

run();
