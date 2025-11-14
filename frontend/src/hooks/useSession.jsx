// useSession.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useCollaborationSession } from "@/context/CollaborationSessionContext";
import { getQuestionById } from "@/lib/getQuestions";

const DEFAULT_STARTER = {
  javascript: `function solve(input) {\n  // Write your solution here\n}\n`,
  python: `def solve(data):\n    # Write your solution here\n    pass\n`,
};

function isPlaceholder(code) {
  if (!code || !code.trim()) return true;
  if (code.startsWith("# This question has no Python code stub")) return true;
  if (code.includes("Generating a generic Python")) return true;
  return false;
}

function normalizeQuestion(q) {
  if (!q) return null;
  return {
    id: q.QID ?? q.id ?? q._id,
    title: q.title ?? "Untitled Problem",
    difficulty: q.difficulty ?? "Unknown",
    topics: Array.isArray(q.topics) ? q.topics : [],

    descriptionHtml: q.body ?? null,
    descriptionText: q.description ?? "",

    examples: q.examples ?? q.samples ?? [],
    constraints: q.constraints ?? q.limits ?? [],
    hints: q.hints ?? [],

    starterCode: q.starterCode ??
      q.stubs ?? {
        javascript: q.jsStub,
        python: q.pyStub,
      },

    // sometimes a single code block exists; keep it for display-only sections
    codeBlock: q.code ?? null,

    preferredLanguage: q.preferredLanguage ?? q.defaultLanguage ?? "javascript",
  };
}

export function useSession() {
  const { session, code, version, sendOperation } =
    useCollaborationSession() ?? {};
  const [problem, setProblem] = useState(null);

  const seededRef = useRef(false);
  const lastKeyRef = useRef(null);

  // Reset seeding guard on session/question change
  useEffect(() => {
    const key = `${session?.id ?? "no-session"}:${
      session?.questionId ?? "no-q"
    }`;
    if (key !== lastKeyRef.current) {
      seededRef.current = false;
      lastKeyRef.current = key;
    }
  }, [session?.id, session?.questionId]);

  // Fetch & normalize question
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!session?.questionId) {
          if (!cancelled) setProblem(null);
          return;
        }
        const raw = await getQuestionById(session.questionId);
        const normalized = normalizeQuestion(raw);
        if (!cancelled) setProblem(normalized);
      } catch (err) {
        console.error("Failed to fetch question:", err);
        if (!cancelled) setProblem(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.questionId]);

  // Choose language (session wins, then problem, then default)
  const language = useMemo(() => {
    const fromSession = (session?.language || "").toLowerCase();
    const fromProblem = (problem?.preferredLanguage || "").toLowerCase();
    const pick = fromSession || fromProblem || "javascript";
    return pick === "python" ? "python" : "javascript";
  }, [session?.language, problem?.preferredLanguage]);

  // Starter code with fallback
  const starterByLang = useMemo(() => {
    const sc = problem?.starterCode || {};
    return {
      javascript: sc.javascript || DEFAULT_STARTER.javascript,
      python: sc.python || DEFAULT_STARTER.python,
    };
  }, [problem]);

  // Seed session doc if it still has placeholder content
  useEffect(() => {
    if (!session?.id) return;
    if (!sendOperation) return;
    if (seededRef.current) return;

    const current = typeof code === "string" ? code : "";
    if (!isPlaceholder(current)) return;

    const desired =
      language === "python" ? starterByLang.python : starterByLang.javascript;
    if (desired && desired !== current) {
      sendOperation({ type: "replace", content: desired, version });
      if (typeof sendOperation.flush === "function") sendOperation.flush();
      seededRef.current = true;
    }
  }, [session?.id, code, language, starterByLang, sendOperation, version]);

  return {
    session,
    problem,
    language,
    code,
    starterByLang,
  };
}
