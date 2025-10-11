import express from "express";
import { MongoClientInstance } from "../../../common_scripts/mongo.js";
import { startSwaggerDocs } from "../../../common_scripts/swagger_docs.js";
import { use_question_routes } from "./routes/questions.js";
import cors from "cors";

const app = express();
const PORT = process.env.QUESTIONSERVICEPORT || 4002;

const start = async () => {
  if (!(await MongoClientInstance.start())) {
    console.error("Failed to connect to MongoDB");
    process.exit(1);
  }

  app.use(express.json());

  startSwaggerDocs(app, "Question Service API", PORT);

  if (process.env.NODE_ENV === "development") {
    app.use(cors());
  }

  /**
   * GET /status
   * @summary Heartbeat for the question service
   * @return {object} 200 - success response
   */
  app.get("/status", (_req, res) => {
    res.json({ status: "Question service is running" });
  });

  app.use("/questions", use_question_routes());

  app.listen(PORT, () => {
    console.log(`Question service listening on port ${PORT}`);
  });
};
start();
