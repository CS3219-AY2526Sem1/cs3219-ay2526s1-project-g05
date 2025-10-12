import { MongoClientInstance } from "../common_scripts/mongo.js";
import { COLLECTIONS } from "./schemas/index.js";

const run = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  const db = MongoClientInstance.db;

  // Create collections if they do not exist
  for (const collectionName in COLLECTIONS) {
    const { schema, indexes: question_indexes } = COLLECTIONS[collectionName];

    const collections = await db
      .listCollections({ name: collectionName })
      .toArray();
    if (collections.length > 0) {
      await db.command({
        collMod: "users",
        validator: schema.validator,
      });
      console.info(`Updadted existing "${collectionName}" with new schema.`);
    } else {
      await db.createCollection(collectionName, schema);
      console.info(`Collection "${collectionName}" created with schema.`);
    }

    const collection = db.collection(collectionName);
    for (const index of question_indexes) {
      await collection.createIndex(index.key, index.options);
      console.info(
        `Index "${index.options.name}" created on ${collectionName}.`,
      );
    }
    console.info(`===============================`);
  }

  MongoClientInstance.close();
  return true;
};

run();
