import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Send } from "lucide-react";
import { useCollaborationSession } from "@/context/CollaborationSessionContext";
import { useEffect } from "react";
import { collaborationApi } from "@/lib/collaborationApi";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import "./Markdown.css";
import { useRef } from "react";

export default function AIPanel({ setDisplayAIPanel }) {
  const chatContainerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { session } = useCollaborationSession();

  const scrollToBottom = () => {
    if (!chatContainerRef.current) return;

    chatContainerRef.current.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleExplainCode = async () => {
    setIsUpdating(true);
    try {
      const response = await collaborationApi.explainCode(session?.id);
      setConversation(response.conversation);
    } catch (e) {
      if (e.status === 503) {
        toast.error(e.message);
      } else {
        toast.error("Failed to get code explanation from AI.");
      }
    }
    setIsUpdating(false);
  };

  const handleSendMessage = async () => {
    if (conversation.length === 0) return;
    setIsUpdating(true);
    try {
      const response = await collaborationApi.sendCustomMessage(
        session?.id,
        newMessage,
      );
      setConversation(response.conversation);
      setNewMessage("");
    } catch (e) {
      if (e.status === 503) {
        toast.error(e.message);
      } else {
        toast.error("Failed to send message to AI.");
      }
    }
    setIsUpdating(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleGetConversation = async () => {
    setLoading(true);
    try {
      const response = await collaborationApi.getConversation(session?.id);
      setConversation(response.conversation);
    } catch (e) {
      toast.error("Failed to get AI conversation");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!session) return;
    handleGetConversation();
  }, [session?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation, isUpdating]);

  return (
    <Card className="h-full w-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="border-b !h-20">
        <div className="w-full flex justify-between items-center">
          <span className="text-xl font-semibold tracking-wider">
            AI Assistant
          </span>
          <Button
            onClick={() => {
              setDisplayAIPanel(false);
              setLoading(false);
            }}
          >
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="w-full h-full flex-1 flex flex-col !p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center mt-4">
            <h1 className="text-xl tracking-wider">Loading Conversation...</h1>
            <Loader2 className="w-12 h-12 mt-4 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <div className="h-full flex flex-col">
              <div
                ref={chatContainerRef}
                className="overflow-y-auto h-full p-3"
              >
                {isUpdating || conversation.length > 0 ? (
                  <>
                    {conversation.map((message, index) => (
                      <div
                        key={index}
                        className={`flex mt-4 ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`w-[95%] overflow-hidden rounded-lg shadow-xl p-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-purple-700 text-white"
                          }`}
                        >
                          <p className="text-sm font-medium mb-1">
                            {message.role === "user" ? "User" : "AI Assistant"}
                          </p>
                          <div className="markdown-body">
                            <Markdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw, rehypeSanitize]}
                            >
                              {message.content}
                            </Markdown>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col justify-center items-center text-center">
                    <h1 className="text-lg font-bold">Squeek Squeek</h1>
                    <h3 className="mt-1">
                      It is a little lonely here... Start by clicking on the
                      "Explain" button below!
                    </h3>
                  </div>
                )}

                {isUpdating && (
                  <div className="flex flex-col items-center mt-4">
                    <h1 className="text-xl tracking-wider">Updating</h1>
                    <Loader2 className="w-8 h-8 mt-4 text-primary animate-spin" />
                  </div>
                )}
              </div>
              <div className="shadow-2xl flex items-center bg-secondary p-1">
                <Input
                  placeholder="Ask the assistant a question..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={conversation.length === 0 || isUpdating}
                  className="flex-1"
                />
                <Button
                  disabled={conversation.length === 0 || isUpdating}
                  onClick={handleSendMessage}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleExplainCode}
                  disabled={isUpdating}
                  className="bg-purple-600 hover:bg-purple-500 ml-1"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Explain
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
