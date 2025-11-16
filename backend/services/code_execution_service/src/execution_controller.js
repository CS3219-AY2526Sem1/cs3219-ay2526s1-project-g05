import { executeCode } from "./docker_runner.js";
import { setCodeRunnerServiceUsage } from "./utils/fetchRequests.js";

/**
 * Handles the incoming POST request to run code.
 */
export async function runCodeHandler(req, res) {
  const { code, language, input } = req.body;

  if (!code || !language) {
    return res
      .status(400)
      .json({ error: "Missing required fields: code and language." });
  }

  const supportedLanguages = ["javascript", "python"];
  if (!supportedLanguages.includes(language.toLowerCase())) {
    return res
      .status(400)
      .json({ error: `Language '${language}' is not supported.` });
  }

  const user = res.locals.user;
  if (user.codeRunnerServiceUsage) {
    return res.status(429).json({
      error:
        "You have an ongoing code execution. Please wait for it to finish before submitting a new one.",
    });
  }

  console.log(`[Controller] Received execution request for: ${language}`);
  const runnerName = `peerprep-runner-${crypto.randomUUID()}`;
  await setCodeRunnerServiceUsage(user.id, runnerName);

  try {
    const result = await executeCode(code, language, input || "", runnerName);

    await setCodeRunnerServiceUsage(user.id, null);

    return res.status(200).json({
      status: result.status,
      output: result.output,
      error: result.error,
      executionTimeMs: result.executionTimeMs,
      message: result.message,
    });
  } catch (err) {
    console.error(`[Controller] Internal Error during execution:`, err);

    await setCodeRunnerServiceUsage(user.id, null);
    return res.status(500).json({
      status: "Internal Error",
      error: "An unexpected server error occurred during code execution.",
    });
  }
}
