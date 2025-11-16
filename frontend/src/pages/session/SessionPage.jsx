import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useState, useCallback, useMemo } from "react";
import ProblemPanel from "@/components/collab/ProblemPanel";
import CodeEditorPanel from "@/components/collab/CodeEditorPanel";
import ChatPanel from "@/components/collab/ChatPanel";
import MainLayout from "@/layout/MainLayout";
import LeaveSessionDialog from "@/components/collab/LeaveSessionDialog";
import { useSession } from "@/hooks/useSession";
import AIPanel from "@/components/collab/AIPanel";
import CodeExecutionPanel from "@/components/collab/CodeExecutionPanel";

const PANELS = {
  AI: 'ai',
  EXECUTION: 'execution',
  CHAT: 'chat',
};

const initialExecutionResult = {
  status: "Ready",
  output: "",
  error: "",
  executionTimeMs: 0,
  message: "Click 'Run Code' to see results.",
  timestamp: new Date().toLocaleTimeString(),
};

export default function SessionPage() {
  // Pull the currently selected problem (resolved from session.questionId) via the hook
  const { problem } = useSession();
  // const [displayAIPanel, setDisplayAIPanel] = useState(false);
  const [displayPanel, setDisplayPanel] = useState(PANELS.CHAT);
  const [executionHistory, setExecutionHistory] = useState([initialExecutionResult]);

  const handleCodeExecuted = useCallback((result) => {
    setExecutionHistory((prev) => {
      const newEntry = { ...result, timestamp: new Date().toLocaleTimeString() };
      if (prev.length > 0 && (prev[0].status === 'Running' || prev[0].status === 'Ready')) {
        return [
          newEntry,
          ...prev.slice(1)
        ];
      }
      return [newEntry, ...prev];
    });
    setDisplayPanel(PANELS.EXECUTION);
  }, []);

  const handleDisplayAIPanel = useCallback((shouldDisplay) => {
    setDisplayPanel(shouldDisplay ? PANELS.AI : PANELS.CHAT);
  }, []);
  const handleDisplayExecutionPanel = useCallback((shouldDisplay) => {
    setDisplayPanel(shouldDisplay ? PANELS.EXECUTION : PANELS.CHAT);
  }, []);

  const RightPanel = useMemo(() => {
    switch (displayPanel) {
      case PANELS.AI:
        return (
          <AIPanel setDisplayAIPanel={handleDisplayAIPanel} />
        );
      case PANELS.EXECUTION:
        return (
          <CodeExecutionPanel
            executionHistory={executionHistory}
            setDisplayExecutionPanel={handleDisplayExecutionPanel}
          />
        );
      case PANELS.CHAT:
      default:
        return <ChatPanel />;
    }
  }, [displayPanel, executionHistory, handleDisplayAIPanel, handleDisplayExecutionPanel]);

  return (
    <MainLayout>
      <div className="h-full w-full overflow-hidden flex flex-col">
        {/* Header with Leave Button */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          <h1 className="text-lg font-semibold">Collaborative Session</h1>
          <LeaveSessionDialog />
        </div>

        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* Problem Panel */}
            <ResizablePanel defaultSize={25} minSize={25} maxSize={40}>
              {/* ProblemPanel uses useSession() internally; no prop required */}
              <ProblemPanel />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Code Editor Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              {/* Pass problem so the editor can load the correct starter code when not in collab,
                  and seed the session if the server code is a placeholder */}
              <CodeEditorPanel
                problem={problem ?? undefined}
                setDisplayAIPanel={handleDisplayAIPanel}
                onCodeExecuted={handleCodeExecuted}
                setDisplayExecutionPanel={handleDisplayExecutionPanel}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Chat Panel */}
            <ResizablePanel defaultSize={25} minSize={25} maxSize={40}>
              {RightPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </MainLayout>
  );
}
