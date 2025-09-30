import { Router } from "express";
import { retrieve_question } from "../services/retrieve_questions.js";

export const use_question_routes = () => {
  const router = Router();

  /**
   * GET /questions/{id}
   * @param {string} id.path.required - Question ID (QID)
   * @summary Gets the question by its Question ID
   * @return {object} 200 - Success
   * @return {object} 404 - Question not found
   */
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const question = await retrieve_question(id);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    return res.json({ question });
  });

  return router;
};
