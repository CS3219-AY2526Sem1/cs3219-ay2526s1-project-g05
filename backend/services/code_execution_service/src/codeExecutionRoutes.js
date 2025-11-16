import { Router } from "express";
import { runCodeHandler } from "./execution_controller.js";
import { authenticate } from "../../../common_scripts/authentication_middleware.js";

export const createCodeExecutionRouter = () => {
  const router = Router();

  /**
   * POST /run
   * @summary Execute the provided code snippet
   */
  router.post("/run", [authenticate(false)], async (req, res) => {
    const result = await runCodeHandler(req, res);
    return result;
  });

  return router;
};
