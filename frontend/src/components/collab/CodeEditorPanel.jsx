import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Sparkles } from "lucide-react";
import {
  Decoration,
  EditorView,
  WidgetType,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import {
  EditorState,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { useCollaborationSession } from "@/context/CollaborationSessionContext";
import { useUserContext } from "@/context/UserContext";
import { executeCode } from "@/lib/codeExecutionApi";
import { Annotation } from "@codemirror/state";

export const ExternalChange = Annotation.define();

const languageExtensions = {
  javascript: javascript(),
  python: python(),
};

const sanitizeLanguage = (value) => {
  if (typeof value !== "string") return "javascript";
  const normalized = value.trim().toLowerCase();
  return normalized === "python" ? "python" : "javascript";
};

const defaultCode = {
  javascript: `function twoSum(nums, target) {
  // Write your solution here
  
}`,
  python: `def two_sum(nums, target):
    # Write your solution here
    pass`,
};

const REMOTE_CURSOR_COLORS = [
  "#ec4899",
  "#6366f1",
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#f43f5e",
  "#14b8a6",
  "#a855f7",
];

const remoteCursorEffect = StateEffect.define();

const remoteCursorField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    if (tr.docChanged) {
      value = value.map(tr.changes);
    }
    for (const effect of tr.effects) {
      if (effect.is(remoteCursorEffect)) {
        return effect.value;
      }
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const remoteCursorTheme = EditorView.baseTheme({
  ".cm-remote-cursor": {
    position: "relative",
    width: "0px",
    pointerEvents: "none",
    zIndex: 10,
  },
  ".cm-remote-cursor-caret": {
    position: "absolute",
    left: "-1px",
    top: "0",
    bottom: "0",
    width: "2px",
    borderRadius: "1px",
  },
  ".cm-remote-cursor-label": {
    position: "absolute",
    top: "-1.4em",
    left: "0",
    transform: "translate(-50%, -2px)",
    padding: "0 6px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 600,
    color: "white",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
});

class RemoteCursorWidget extends WidgetType {
  constructor(color, label) {
    super();
    this.color = color;
    this.label = label;
  }

  eq(other) {
    return other.color === this.color && other.label === this.label;
  }

  toDOM() {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-remote-cursor";

    const caret = document.createElement("span");
    caret.className = "cm-remote-cursor-caret";
    caret.style.backgroundColor = this.color;
    wrapper.appendChild(caret);

    if (this.label) {
      const label = document.createElement("span");
      label.className = "cm-remote-cursor-label";
      label.style.backgroundColor = this.color;
      label.textContent = this.label;
      wrapper.appendChild(label);
    }

    return wrapper;
  }

  ignoreEvent() {
    return true;
  }
}

const getReadableParticipantName = (rawName, fallback) => {
  const name = rawName ?? fallback ?? "Guest";
  return name.length > 18 ? `${name.slice(0, 17)}...` : name;
};

const normalizeUserId = (user) => {
  if (!user) return null;
  return user.id ?? user._id ?? user.userId ?? null;
};

const getColorForUser = (userId) => {
  const value = String(userId ?? "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % REMOTE_CURSOR_COLORS.length;
  return REMOTE_CURSOR_COLORS[index];
};

const createRemoteCursorDecorations = (state, cursors) => {
  if (!Array.isArray(cursors) || cursors.length === 0) {
    return Decoration.none;
  }

  const builder = new RangeSetBuilder();
  const { doc } = state;

  cursors.forEach(({ line, column, color, label }) => {
    if (typeof line !== "number" || typeof column !== "number") {
      return;
    }

    const lineNumber = Math.max(1, Math.min(doc.lines, line + 1));
    const lineInfo = doc.line(lineNumber);
    const lineLength = lineInfo.length;
    const clampedColumn = Math.max(0, Math.min(column, lineLength));
    const position = lineInfo.from + clampedColumn;

    const widget = Decoration.widget({
      widget: new RemoteCursorWidget(color, label),
      side: 1,
    });
    builder.add(position, position, widget);
  });

  return builder.finish();
};

export default function CodeEditorPanel({ _problem, setDisplayAIPanel, onCodeExecuted, setDisplayExecutionPanel }) {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const sendOperationRef = useRef(null);
  const sendCursorRef = useRef(null);
  const fetchSnapshotRef = useRef(null);
  const connectedRef = useRef(false);
  const isJoiningRef = useRef(false);
  const sessionIdRef = useRef(null);
  const versionRef = useRef(0);
  const lastCursorRef = useRef(null);
  const [language, setLanguage] = useState(() => sanitizeLanguage("python"));

  const { user } = useUserContext();

  const {
    session,
    code,
    version,
    connected,
    isJoining,
    participants,
    cursorPositions,
    sendOperation,
    sendCursor,
    fetchSessionSnapshot,
  } = useCollaborationSession();

  useEffect(() => {
    sendOperationRef.current = sendOperation;
  }, [sendOperation]);

  useEffect(() => {
    sendCursorRef.current = sendCursor;
  }, [sendCursor]);

  useEffect(() => {
    fetchSnapshotRef.current = fetchSessionSnapshot;
  }, [fetchSessionSnapshot]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    isJoiningRef.current = isJoining;
  }, [isJoining]);

  useEffect(() => {
    sessionIdRef.current = session?.id ?? null;
  }, [session?.id]);

  useEffect(() => {
    versionRef.current = version ?? 0;
  }, [version]);

  useEffect(() => {
    if (!session?.language) return;
    const normalized = sanitizeLanguage(session.language);
    setLanguage((prev) => (prev === normalized ? prev : normalized));
  }, [session?.language]);

  const effectiveLanguage = useMemo(() => sanitizeLanguage(language), [
    language,
  ]);

  const currentUserId = useMemo(() => normalizeUserId(user), [user]);

  const remoteCursors = useMemo(() => {
    if (!participants || !cursorPositions) return [];
    const result = [];

    participants.forEach((participant) => {
      const participantId = participant?.userId;
      if (
        !participantId ||
        participantId === currentUserId ||
        participant?.connected === false
      ) {
        return;
      }

      const cursor = cursorPositions[participantId];
      if (!cursor) return;

      result.push({
        userId: participantId,
        line: cursor.line,
        column: cursor.column,
        color: getColorForUser(participantId),
        label: getReadableParticipantName(
          participant.displayName ?? participant.username,
          participantId,
        ),
      });
    });

    return result;
  }, [participants, cursorPositions, currentUserId]);

  const getChangeRange = useCallback((changes) => {
    let start = null;
    let endExclusive = null;
    changes.iterChanges((from, to) => {
      start = start === null ? from : Math.min(start, from);
      endExclusive = endExclusive === null ? to : Math.max(endExclusive, to);
    });
    if (start === null) return null;
    return { start, endExclusive };
  }, []);

  const applyRemoteCode = useCallback((nextCode) => {
    if (!viewRef.current || typeof nextCode !== "string") return;
    const editor = viewRef.current;
    const current = editor.state.doc.toString();
    if (current === nextCode) return;

    applyingRemoteRef.current = true;
    editor.dispatch({
      changes: { from: 0, to: current.length, insert: nextCode },
      annotations: [ExternalChange.of(true)],
    });
    applyingRemoteRef.current = false;
  }, []);

  const handleEditorUpdate = useCallback(
    (update) => {
      if (
        !sessionIdRef.current ||
        !connectedRef.current ||
        isJoiningRef.current ||
        !sendOperationRef.current
      ) {
        return;
      }

      const isExternal = update.transactions.some(
        // This is a change from the server, do not propogate back to remote
        (tr) => tr.annotation(ExternalChange) === true,
      );
      if (isExternal) return;

      if (update.docChanged) {
        if (applyingRemoteRef.current) {
          return;
        }

        const nextDoc = update.state.doc.toString();
        const changeRange = getChangeRange(update.changes);
        const normalizedRange = changeRange
          ? {
            start: changeRange.start,
            end:
              changeRange.endExclusive <= changeRange.start
                ? changeRange.start
                : changeRange.endExclusive - 1,
          }
          : undefined;

        sendOperationRef.current({
          type: "replace",
          content: nextDoc,
          range: normalizedRange,
          version: versionRef.current,
        });
      }

      if (update.selectionSet && sendCursorRef.current) {
        const main = update.state.selection.main;
        if (!main) return;

        const pos = main.head;
        const lineInfo = update.state.doc.lineAt(pos);
        const cursorPosition = {
          line: Math.max(0, lineInfo.number - 1),
          column: Math.max(0, pos - lineInfo.from),
        };

        const last = lastCursorRef.current;
        if (
          !last ||
          last.line !== cursorPosition.line ||
          last.column !== cursorPosition.column
        ) {
          lastCursorRef.current = cursorPosition;
          sendCursorRef.current({
            cursor: cursorPosition,
            version: versionRef.current,
          });
        }
      }
    },
    [getChangeRange],
  );

  useEffect(() => {
    if (!editorRef.current) return;
    if (viewRef.current) return;

    const initialDoc =
      session?.id != null ? "" : defaultCode[effectiveLanguage] ?? "";

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
          ...closeBracketsKeymap,
        ]),
        languageExtensions[effectiveLanguage],
        remoteCursorField,
        remoteCursorTheme,
        EditorView.updateListener.of(handleEditorUpdate),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "'Fira Code', 'Monaco', 'Courier New', monospace",
          },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });
  }, [effectiveLanguage, handleEditorUpdate, session?.id]);

  useEffect(() => {
    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;
    if (session?.id != null) {
      applyRemoteCode(typeof code === "string" ? code : "");
    }
  }, [code, session?.id, applyRemoteCode]);

  useEffect(() => {
    if (!viewRef.current) return;
    const view = viewRef.current;
    const decorations = createRemoteCursorDecorations(
      view.state,
      remoteCursors,
    );
    view.dispatch({
      effects: remoteCursorEffect.of(decorations),
      annotations: [ExternalChange.of(true)],
    });
  }, [remoteCursors]);

  const handleRun = async () => {
    const code = viewRef.current?.state.doc.toString() || "";
    if (onCodeExecuted) {
      onCodeExecuted({ status: 'Running', message: 'Executing code...' });
    }
    if (setDisplayExecutionPanel) {
      setDisplayExecutionPanel(true);
    }
    let result;
    try {
      result = await executeCode({
        language: sanitizeLanguage(language),
        code,
        input: "",
      });
    } catch (error) {
      console.error("Code execution failed:", error);
      result = {
        status: "Failure",
        output: "",
        error: "Failed to execute code. Please try again later.",
        executionTimeMs: 0,
        message: "Execution failed.",
      };
    }
    if (onCodeExecuted) {
      onCodeExecuted(result);
    }
  };

  const handleAIExplanation = () => {
    setDisplayAIPanel(true);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(sanitizeLanguage(newLanguage));
  };

  const connectionLabel = useMemo(() => {
    if (!session?.id) return "Waiting for session";
    if (isJoining) return "Joining session...";
    return connected ? "Live" : "Reconnecting...";
  }, [session?.id, connected, isJoining]);

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="border-b !h-20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-xl">Code Editor</CardTitle>
            <span className="text-xs text-muted-foreground">
              {connectionLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={sanitizeLanguage(language)}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  {language === "python" ? "Python" : "JavaScript"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAIExplanation}
              className="bg-purple-600 hover:bg-purple-500"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              AI
            </Button>
            <Button onClick={handleRun} size="sm">
              <Play className="w-4 h-4 mr-1" />
              Run
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 !p-0 overflow-hidden">
        <div ref={editorRef} className="h-full w-full" />
      </CardContent>
    </Card>
  );
}
