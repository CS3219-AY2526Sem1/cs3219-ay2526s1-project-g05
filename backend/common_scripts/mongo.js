import * as MongoDB from "mongodb";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(import.meta.dirname, "..", ".env") });
// Use the .env in backend/.env

export class MongoClientInstance {
  static client = null;
  static db = null;

  static start = async () => {
    if (MongoClientInstance.client) {
      console.info("Mongo client already connected");
      return MongoClientInstance.client;
    }
    try {
      const clientResponse = await MongoDB.MongoClient.connect(
        "mongodb://localhost:27017",
      );
      console.info("Connected to MongoDB successfully");
      MongoClientInstance.client = clientResponse;
      MongoClientInstance.db = clientResponse.db(process.env.MONGO_DB_NAME);
      return clientResponse;
    } catch (e) {
      console.error(`Error occured while connecting to MongoDB: ${e}`);
    }
    return false;
  };

  static close = async () => {
    if (!MongoClientInstance.client) {
      console.info("No Mongo client present");
      return;
    }

    await MongoClientInstance.client.close();
    MongoClientInstance.client = null;
    MongoClientInstance.db = null;
    console.info("Mongo client disconnected");
  };
}
