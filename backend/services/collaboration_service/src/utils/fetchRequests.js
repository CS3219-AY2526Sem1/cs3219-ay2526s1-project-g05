import { ApiError } from "../errors/ApiError.js";

export const fetchUser = async (userId) => {
  const result = await fetch(
    `http://localhost:${process.env.USERSERVICEPORT}/users/${userId}`,
  );
  if (result.status === 404) {
    throw new ApiError(404, `User ${userId} not found`);
  }
  if (!result.ok) {
    throw new ApiError(result.status, await result.text());
  }
  const resultJson = await result.json();
  return resultJson.user;
};

export const fetchQuestion = async (questionId) => {
  const result = await fetch(
    `http://localhost:${process.env.QUESTIONSERVICEPORT}/questions/${questionId}`,
  );
  if (result.status === 404) {
    throw new ApiError(404, `Question ${questionId} not found`);
  }
  if (!result.ok) {
    throw new ApiError(result.status, await result.text());
  }

  const resultJson = await result.json();
  return resultJson;
};

export const updateUserCurrentSession = async (userId, sessionId) => {
  const result = await fetch(
    `http://localhost:${process.env.USERSERVICEPORT}/users/update-current-collaboration-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, sessionId }),
    },
  );

  if (!result.ok) {
    throw new ApiError(result.status, await result.text());
  }

  const resultJson = await result.json();
  return resultJson;
};

export const addUserPastSession = async (userId, sessionId) => {
  const result = await fetch(
    `http://localhost:${process.env.USERSERVICEPORT}/users/add-past-collaboration-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, sessionId }),
    },
  );

  if (!result.ok) {
    throw new ApiError(result.status, await result.text());
  }

  const resultJson = await result.json();
  return resultJson;
};
