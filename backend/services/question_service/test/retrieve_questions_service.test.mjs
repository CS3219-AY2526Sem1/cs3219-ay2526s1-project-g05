import { jest } from "@jest/globals";

const example_question = {
  QID: 1,
  title: "Fibonacci Number",
  titleSlug: "fibonacci-number",
  difficulty: "Easy",
  hints: [],
  companies: null,
  topics: ["Recursion", "Algorithms"],
  body: "The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is,\n\n <code>F(0) = 0, F(1) = 1 \n F(n) = F(n - 1) + F(n -2), for n > 1.</code>Given n, calculate <br> F(n)",
  code: "class Solution:\n    def fib(self, n: int) -> int:\n        ",
  similarQuestions: [],
};
const example_question_2 = {
  QID: 2,
  title: "Rotate Image",
  titleSlug: "rotate-image",
  difficulty: "Medium",
  hints: [],
  companies: null,
  topics: ["Arrays", "Algorithms"],
  body: "You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).",
  code: "class Solution:\n    def rotate(self, matrix: List[List[int]]) -> None:\n        ",
  similarQuestions: [],
};
const example_questions = [example_question, example_question_2];

await jest.unstable_mockModule(
  "../src/repositories/retrieve_questions.js",
  () => ({
    get_question_by_id: jest.fn().mockResolvedValue(example_question),
    get_all_questions: jest.fn().mockResolvedValue(example_questions),
  }),
);

const { retrieve_question, retrieve_all_questions } = await import(
  "../src/services/retrieve_questions.js"
);

test("Should retrieve a single question by ID", async () => {
  const response = await retrieve_question(1);
  expect(response).toEqual({ success: true, question: example_question });
});

test("Should retrieve all questions - no filters", async () => {
  const response = await retrieve_all_questions();
  expect(response).toEqual({ success: true, questions: example_questions });
});
