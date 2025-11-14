import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/useSession";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import Markdown from "react-markdown";
import "./Markdown.css";

function badgeVariantForDifficulty(diff) {
  const d = (diff || "").toLowerCase();
  if (d === "easy") return "secondary";
  if (d === "medium") return "default";
  if (d === "hard") return "destructive";
  return "outline";
}

export default function ProblemPanel() {
  const { problem } = useSession();

  if (!problem) {
    return (
      <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">No problem selected</CardTitle>
            <Badge variant="outline">—</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-6 text-sm text-muted-foreground">
          Choose a question to see its details here.
        </CardContent>
      </Card>
    );
  }

  const {
    title = "Untitled Problem",
    difficulty = "Unknown",
    topics = [],
    descriptionHtml,
    descriptionText = "",
    examples = [],
    constraints = [],
    hints = [],
    codeBlock,
  } = problem;

  const renderDescription = () => {
    if (descriptionHtml) {
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: descriptionHtml /* safe */ }}
        />
      );
    }
    if (descriptionText) {
      return (
        <p className="text-muted-foreground leading-relaxed">
          {descriptionText}
        </p>
      );
    }
    return (
      <p className="text-muted-foreground italic">No description provided.</p>
    );
  };

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="border-b min-h-20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{title}</CardTitle>
          <Badge
            variant={badgeVariantForDifficulty(difficulty)}
            className="ml-2"
          >
            {difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden !p-2">
        <div className="h-full w-full overflow-x-hidden overflow-y-auto">
          <div className="p-3 space-y-6">
            {/* Topics */}
            {Array.isArray(topics) && topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            )}

            <div className="markdown-body">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
              >
                {descriptionHtml}
              </Markdown>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
