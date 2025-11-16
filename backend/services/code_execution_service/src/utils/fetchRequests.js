export const setCodeRunnerServiceUsage = async (userId, containerId) => {
  const result = await fetch(
    `http://${process.env.USERSERVICE_NAME}:${process.env.USERSERVICEPORT}/add-current-code-runner`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, containerId }),
    },
  );

  if (!result.ok) {
    throw new Error(result.status + (await result.text()));
  }

  const resultJson = await result.json();
  return resultJson;
};
