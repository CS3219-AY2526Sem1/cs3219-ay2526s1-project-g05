import { MongoClientInstance } from "../common_scripts/mongo.js";
import { COLLECTIONS } from "./schemas/index.js";

const roleExists = async (db, roleName, dbName) => {
  const res = await db.command({ rolesInfo: { role: roleName, db: dbName } });
  return Array.isArray(res.roles) && res.roles.length > 0;
};

async function userExists(db, username, dbName) {
  const res = await db.command({ usersInfo: { user: username, db: dbName } });
  return Array.isArray(res.users) && res.users.length > 0;
}

const run = async () => {
  if (!(await MongoClientInstance.start())) {
    return false;
  }
  const db = MongoClientInstance.db;

  // Create collections if they do not exist
  for (const collectionName in COLLECTIONS) {
    const { schema, indexes, user } = COLLECTIONS[collectionName];

    const collections = await db
      .listCollections({ name: collectionName })
      .toArray();
    if (collections.length > 0) {
      await db.command({
        collMod: collectionName,
        validator: schema.validator,
      });
      console.info(`Updated existing "${collectionName}" with new schema.`);
    } else {
      await db.createCollection(collectionName, schema);
      console.info(`Collection "${collectionName}" created with schema.`);
    }

    const collection = db.collection(collectionName);
    for (const index of indexes) {
      await collection.createIndex(index.key, index.options);
      console.info(
        `Index "${JSON.stringify(index.key)}" created on ${collectionName}.`,
      );
    }

    // Let's also create roles for that has access to each collection
    const roleName = `${collectionName}_RW`;
    if (!(await roleExists(db, roleName, db.databaseName))) {
      await db.command({
        createRole: roleName,
        privileges: [
          {
            resource: { db: db.databaseName, collection: collectionName },
            actions: ["find", "insert", "update", "remove"],
          },
        ],
        roles: [],
      });
      console.info(`Role "${roleName}" created.`);
    }

    if (!(await userExists(db, user.username, db.databaseName))) {
      await db.command({
        createUser: user.username,
        pwd: user.password,
        roles: [{ role: roleName, db: db.databaseName }],
      });
      console.info(`User "${user.username}" created.`);
    }
    console.info(`===============================`);
  }

  MongoClientInstance.close();
  return true;
};

run();
