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

  // Drop users created in this DB
  const usersInfo = await db.command({ usersInfo: 1 });
  for (const u of usersInfo.users ?? []) {
    await db.command({ dropUser: u.user });
  }

  // Drop *custom* roles created in this DB (skip built-ins)
  const rolesInfo = await db.command({ rolesInfo: 1, showBuiltinRoles: false });
  for (const r of rolesInfo.roles ?? []) {
    await db.command({ dropRole: r.role });
  }

  MongoClientInstance.close();
  return true;
};

run();
