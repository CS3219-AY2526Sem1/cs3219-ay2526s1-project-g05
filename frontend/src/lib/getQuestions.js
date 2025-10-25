// api/questions.js

export async function getQuestions() {
  const token = localStorage.getItem("token");

  try {
    const response = await fetch("http://localhost:4002", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch questions:", response.status);
      return [];
    }

    const data = await response.json();
    return data; // Expecting array of { QID, title, difficulty, topics }
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
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`http://localhost:4002/${qid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch question ${qid}:`, response.status);
      return null;
    }

    const data = await response.json();
    return data; // Matches your JSON structure
  } catch (error) {
    console.error(`Error fetching question ${qid}:`, error);
    return null;
  }
}
