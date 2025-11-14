import { Router } from "express";
import {
  retrieve_question,
  retrieve_all_questions,
  retrieve_random_question,
} from "../services/retrieve_questions.js";
import { authenticate } from "../../../../common_scripts/authentication_middleware.js";

export const use_question_routes = () => {
  const router = Router();

  /**
   * GET /
   * @summary Gets list of questions, optionally filtered by topic and/or difficulty
   * @param {string[]} topic.query - List of topic names (e.g topic="Hash Table"&topic="String")
   * @param {string[]} difficulty.query - List of difficulties (e.g difficulty="Hard"&difficulty="Medium")
   * @param {string} search.query - Search the title of questions (e.g search="two sum") [Case insensitive]
   * @return {object[]} 200 - Success
   * @return {object} 400 - Bad Request (e.g invalid topic or difficulty)
   * @security bearerAuth
   */
  router.get("/", [authenticate(false)], async (req, res) => {
    const { topic, difficulty, search } = req.query;

    const result = await retrieve_all_questions(topic, difficulty, search);

    if (!result.success) {
      return res.status(result.code).json({ error: result.error });
    }

    return res.json(result.questions);
  });

  /**
   * GET /random
   * @summary Gets a random question, optionally filtered by topic and/or difficulty
   * @param {string[]} topic.query - List of topic names (e.g topic="Hash Table"&topic="String")
   * @param {string[]} difficulty.query - List of difficulties (e.g difficulty="Hard"&difficulty="Medium")
   * @return {object} 200 - Success
   * @return {object} 400 - Bad Request (e.g invalid topic or difficulty)
   * @security bearerAuth
   */
  router.get("/random", [authenticate(false)], async (req, res) => {
    const { topic } = req.query;
    const { difficulty } = req.query;

    const result = await retrieve_random_question(topic, difficulty);

    if (!result.success) {
      return res.status(result.code).json({ error: result.error });
    }

    return res.json(result.question);
  });

  /**
   * GET /{id}
   * @summary Gets the question by its Question ID
   * @param {string} id.path.required - Question ID (QID)
   * @return {object} 200 - Success
   * @return {object} 404 - Question not found
   * @security bearerAuth
   */
  router.get("/:id", [authenticate(false)], async (req, res) => {
    const { id } = req.params;
    const result = await retrieve_question(id);

    if (!result.success) {
      return res.status(result.code).json({ error: result.error });
    }

    return res.json(result.question);
  });

  return router;
};
