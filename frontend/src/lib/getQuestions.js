// api/questions.js
import { apiFetch } from "@/lib/api";

const QUESTION_SERVICE_ENDPOINT =
  import.meta.env.MODE === "production"
    ? "/questions"
    : "http://localhost:4002";

export async function getQuestions() {
  try {
    const response = await apiFetch(`${QUESTION_SERVICE_ENDPOINT}/`, {
      method: "GET",
    });
    return response; // Expecting array of { QID, title, difficulty, topics }
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
}

/**
 * Fetch a single question by its ID.
 * Returns full details including title, body, examples, constraints, etc.
 * Example usage: const question = await getQuestionById(1);
 */
export async function getQuestionById(qid) {
  try {
    const questions = await apiFetch(`${QUESTION_SERVICE_ENDPOINT}/${qid}`, {
      method: "GET",
    });
    return questions;
  } catch (error) {
    console.error(`Error fetching question ${qid}:`, error);
    return null;
  }
}
