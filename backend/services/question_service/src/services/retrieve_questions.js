import { get_question_by_id } from "../repositories/retrieve_questions.js";

export const retrieve_question = async (id) => {
  return await get_question_by_id(parseInt(id));
};
