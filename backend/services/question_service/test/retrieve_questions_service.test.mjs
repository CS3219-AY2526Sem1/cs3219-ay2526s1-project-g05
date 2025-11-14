import { jest } from "@jest/globals";

const example_question = {
  QID: 1,
  title: "Two Sum",
  titleSlug: "two-sum",
  difficulty: "Easy",
  hints: [
    "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, it's best to try out brute force solutions just for completeness. It is from these brute force solutions that you can come up with optimizations.",
    "So, if we fix one of the numbers, say <code>x</code>, we have to scan the entire array to find the next number <code>y</code> which is <code>value - x</code> where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
    "The second train of thought is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?",
  ],
  companies: null,
  topics: ["Array", "Hash Table"],
  body: '<p>Given an array of integers <code>nums</code>&nbsp;and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>\n\n<p>You may assume that each input would have <strong><em>exactly</em> one solution</strong>, and you may not use the <em>same</em> element twice.</p>\n\n<p>You can return the answer in any order.</p>\n\n<p>&nbsp;</p>\n<p><strong class="example">Example 1:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [2,7,11,15], target = 9\n<strong>Output:</strong> [0,1]\n<strong>Explanation:</strong> Because nums[0] + nums[1] == 9, we return [0, 1].\n</pre>\n\n<p><strong class="example">Example 2:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [3,2,4], target = 6\n<strong>Output:</strong> [1,2]\n</pre>\n\n<p><strong class="example">Example 3:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [3,3], target = 6\n<strong>Output:</strong> [0,1]\n</pre>\n\n<p>&nbsp;</p>\n<p><strong>Constraints:</strong></p>\n\n<ul>\n\t<li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>\n\t<li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>\n\t<li><code>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>\n\t<li><strong>Only one valid answer exists.</strong></li>\n</ul>\n\n<p>&nbsp;</p>\n<strong>Follow-up:&nbsp;</strong>Can you come up with an algorithm that is less than <code>O(n<sup>2</sup>)</code><font face="monospace">&nbsp;</font>time complexity?',
  code: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        ",
  similarQuestions: [
    15, 18, 167, 170, 560, 653, 1099, 1679, 1711, 2006, 2023, 2200, 2351, 2354,
    2367, 2374, 2399, 2395, 2441, 2465, 2824,
  ],
};
const example_question_2 = {
  QID: 2,
  title: "Add Two Numbers",
  titleSlug: "add-two-numbers",
  difficulty: "Medium",
  hints: [],
  companies: null,
  topics: ["Linked List", "Math"],
  body: "Example question 2 body",
  code: "class Solution:\n    def addTwoNumbers(self, l1: ListNode, l2: ListNode) -> ListNode:\n        ",
  similarQuestions: [21, 445, 725, 989, 1572],
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
