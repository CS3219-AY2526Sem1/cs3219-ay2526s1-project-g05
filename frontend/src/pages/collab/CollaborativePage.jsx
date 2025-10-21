import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ProblemPanel from "@/components/collab/ProblemPanel";
import CodeEditorPanel from "@/components/collab/CodeEditorPanel";
import ChatPanel from "@/components/collab/ChatPanel";
import MainLayout from "@/layout/MainLayout";

export default function EditorPage() {
  return (
    <MainLayout>
      <div className="h-screen w-full overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
        {/* Problem Panel */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <ProblemPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Code Editor Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <CodeEditorPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Chat Panel */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <ChatPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
    </MainLayout>
  );
}
