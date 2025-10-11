import {
  get_question_by_id,
  get_all_questions,
} from "../repositories/retrieve_questions.js";
import { TOPICS, DIFFICULTIES } from "../utils/constants.js";

export const retrieve_question = async (id) => {
  const question = await get_question_by_id(parseInt(id));

  if (!question) {
    return { success: false, error: "Question not found", code: 404 };
  }

  return { success: true, question };
};

export const retrieve_all_questions = async (
  topic = null,
  difficulty = null,
  search = null,
) => {
  // Make them into arrays if they aren't (i.e we only get 1 topic/difficulty)
  if (topic && !Array.isArray(topic)) {
    topic = [topic];
  }
  if (difficulty && !Array.isArray(difficulty)) {
    difficulty = [difficulty];
  }

  // Search for invalid topics/difficulties
  if (topic) {
    for (const t of topic) {
      if (!(t in TOPICS)) {
        return { success: false, error: "Invalid topic", code: 400 };
      }
    }
  }

  if (difficulty) {
    for (const d of difficulty) {
      if (!(d in DIFFICULTIES)) {
        return { success: false, error: "Invalid difficulty", code: 400 };
      }
    }
  }

  const questions = await get_all_questions(topic, difficulty, search);

  return { success: true, questions };
};

export const retrieve_random_question = async (
  topic = null,
  difficulty = null,
) => {
  const result = await retrieve_all_questions(topic, difficulty);

  if (!result.success) {
    return result;
  }

  const questions = result.questions;
  if (questions.length === 0) {
    return {
      success: false,
      error: "No questions found for these filters",
      code: 404,
    };
  }

  const randomIndex = Math.floor(Math.random() * questions.length);
  return { success: true, question: questions[randomIndex] };
};
