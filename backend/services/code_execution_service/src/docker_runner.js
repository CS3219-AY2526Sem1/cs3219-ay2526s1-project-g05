import Docker from "dockerode";
import { writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import os from "os";
import tar from "tar-stream";
import { Writable } from "stream";
import { makeCodeRunnable } from "./utils/makeCodeExecutable.js";

const docker = new Docker();
const MAX_TIMEOUT_MS = 5000;
const CONTAINER_WORKDIR = "/home/nonroot";
const CODE_FILENAME = "solution"; // name of file in docker container
const INPUT_FILENAME = "input.txt";
const LANGUAGE_CONFIG = {
  javascript: {
    image: "peerprep/js-sandbox:latest",
    command: "node",
    extension: ".js",
  },
  python: {
    image: "peerprep/py-sandbox:latest",
    command: "python3",
    extension: ".py",
  },
};

/**
 * Executes the user's code using Docker's copy and exec APIs.
 */
export async function executeCode(code, language, input, runnerName) {
  const config = LANGUAGE_CONFIG[language.toLowerCase()];
  const tempDir = os.tmpdir();

  const codeFilePath = path.join(tempDir, `${runnerName}${config.extension}`);
  const inputFilePath = path.join(tempDir, `${runnerName}${INPUT_FILENAME}`);

  const containerCodePath = `${CONTAINER_WORKDIR}/${CODE_FILENAME}${config.extension}`;
  const containerInputPath = `${CONTAINER_WORKDIR}/${INPUT_FILENAME}`;

  let container;
  let cleanupFiles = [codeFilePath, inputFilePath];

  let result = {
    status: "Failure",
    output: "",
    error: "",
    executionTimeMs: 0,
    message: "",
  };

  const executableCode = makeCodeRunnable(code, language, containerInputPath);
  try {
    await writeFile(codeFilePath, executableCode);
    await writeFile(inputFilePath, input || "");

    const containerConfig = {
      name: runnerName,
      Image: config.image,
      Cmd: [containerCodePath],
      Tty: false,
      HostConfig: {
        NetworkMode: "none",
        Memory: 256 * 1024 * 1024,
        CpuShares: 1024,
        AutoRemove: true,
      },
    };
    container = await docker.createContainer(containerConfig);

    await copyFileToContainer(
      container,
      codeFilePath,
      CONTAINER_WORKDIR,
      CODE_FILENAME + config.extension,
    );
    await copyFileToContainer(
      container,
      inputFilePath,
      CONTAINER_WORKDIR,
      INPUT_FILENAME,
    );

    const {
      stdout,
      stderr,
      startTime,
      endTime,
      exitCode,
    } = // If resolve() successfully
      await exeuteContainer({ container, timeout: MAX_TIMEOUT_MS });

    // kill the container after execution
    await container.kill().catch(() => {});

    result.executionTimeMs = Number(endTime - startTime) / 1000000;
    result.output = stdout;

    if (exitCode !== 0) {
      result.status = "Runtime Error";
      result.error = stderr || stdout;
      result.message = `Code failed with exit code ${exitCode} after ${result.executionTimeMs.toFixed(2)}ms.`;
    } else {
      result.status = "Success";
      result.message = `Execution successful in ${result.executionTimeMs.toFixed(2)}ms.`;
    }
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const startTime = error.startTime || endTime;

    result.executionTimeMs = Number(endTime - startTime) / 1000000;

    if (error.message === "TIMEOUT_EXCEEDED") {
      result.status = "Time Limit Exceeded";
      result.error = `Execution exceeded the maximum limit of ${MAX_TIMEOUT_MS / 1000} seconds.`;
      result.message =
        "The container was killed (TLE). Check for infinite loops.";
    } else {
      result.status = "Setup/Docker Error";
      result.error = error.message;
      result.message = `Failed to execute code. Details: ${error.message}`;
    }
  } finally {
    // stop the container if the code execution times out or errors out
    if (container) {
      await container.stop().catch(() => {});
    }
    for (const fPath of cleanupFiles) {
      await unlink(fPath).catch((e) =>
        console.error(`Failed to clean up file ${fPath}:`, e),
      );
    }
  }
  return result;
}

/**
 * Utility function to create a tar stream and upload a file to a container.
 */
async function copyFileToContainer(
  container,
  sourcePath,
  destinationDir,
  fileName,
) {
  const pack = tar.pack();
  const fileContent = await readFile(sourcePath);
  pack.entry({ name: fileName }, fileContent);
  pack.finalize();
  await container.putArchive(pack, { path: destinationDir });
}

/**
 * Utility function to attach Writables to gather execution output, and start the container.
 */
async function exeuteContainer({ container, timeout }) {
  let stderr = "";
  let stdout = "";
  let startTime = process.hrtime.bigint();
  let endTime = null;

  await container.start();
  const waitPromise = container.wait(); // resolves to { StatusCode }
  const logStream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
  });

  const logsPromise = new Promise((resolve) => {
    const cleanup = () => {
      logStream.removeListener("end", onEnd);
    };

    const onEnd = () => {
      endTime = process.hrtime.bigint();
      cleanup();
      resolve();
    };

    container.modem.demuxStream(
      logStream,
      new Writable({
        write(chunk, _enc, cb) {
          stdout += chunk.toString();
          cb();
        },
      }),
      new Writable({
        write(chunk, _enc, cb) {
          stderr += chunk.toString();
          cb();
        },
      }),
    );

    logStream.on("end", onEnd);
  });

  // Main promise: wait for container to exit AND logs to finish
  const mainPromise = (async () => {
    const [{ StatusCode }] = await Promise.all([waitPromise, logsPromise]);

    return {
      stdout,
      stderr,
      startTime,
      endTime,
      exitCode: StatusCode,
    };
  })();

  // Timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(async () => {
      await container.kill().catch(() => {});
      const err = new Error("TIMEOUT_EXCEEDED");
      err.startTime = startTime;
      reject(err);
    }, timeout);
  });

  return Promise.race([mainPromise, timeoutPromise]);
}
