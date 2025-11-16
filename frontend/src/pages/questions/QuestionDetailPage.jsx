import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import MainLayout from "@/layout/MainLayout";
import { getQuestionById } from "@/lib/getQuestions";
import { ArrowLeft, Code2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const getDifficultyVariant = (difficulty) => {
  switch (difficulty) {
    case "Easy":
      return "secondary";
    case "Medium":
      return "default";
    case "Hard":
      return "destructive";
    default:
      return "default";
  }
};

export default function QuestionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    if (!id) return;
    async function fetchQuestion() {
      const data = await getQuestionById(id);
      setQuestion(data);
    }
    fetchQuestion();
  }, [id]);

  if (!question) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-12 text-center">
              <Code2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Question Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The question you're looking for doesn't exist.
              </p>
              <Button onClick={() => navigate("/problemset")}>
                Back to Problems
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/problemset")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">{question.title}</h1>
              <Badge variant={getDifficultyVariant(question.difficulty)}>
                {question.difficulty}
              </Badge>
            </div>
          </div>

          <Card>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <CardContent className="pt-4 p-4 space-y-4">
                {/* Topics */}
                <div className="flex flex-wrap gap-2">
                  {question.topics.map((topic) => (
                    <Badge key={topic} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>

                {/* Problem Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <div
                    className="text-muted-foreground leading-normal"
                    dangerouslySetInnerHTML={{ __html: question.body }}
                  />
                </div>

                {/* Hints */}
                {question.hints?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Hints</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      {question.hints.map((hint, idx) => (
                        <li
                          key={idx}
                          dangerouslySetInnerHTML={{ __html: hint }}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Starter Code */}
                {question.code && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Starter Code</h3>
                    <pre className="bg-muted/50 p-3 rounded overflow-auto text-sm">
                      {question.code}
                    </pre>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
