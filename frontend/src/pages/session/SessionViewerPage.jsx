import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { collaborationApi } from "@/lib/collaborationApi";
import { getQuestionById } from "@/lib/getQuestions";

const difficultyColors = {
  Easy: "bg-green-500/10 text-green-600 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Hard: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function SessionViewer() {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true); setErr("");
        const s = await collaborationApi.getSessionAllowEnded(sessionId);
        if (!mounted) return;
        setSession(s?.session ?? s);

        if ((s?.session ?? s)?.questionId != null) {
          try {
            const q = await getQuestionById((s?.session ?? s).questionId);
            if (mounted) setQuestion(q);
          } catch (e) {
            console.warn("question fetch failed", e);
          }
        }

        try {
          const conv = await collaborationApi.getConversation(sessionId);
          if (mounted) setConversation(conv?.messages ?? conv ?? []);
        } catch (e) {
          console.warn("conversation fetch failed", e);
        }
      } catch (e) {
        setErr(e?.message || "Failed to load session");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  const difficulty = question?.difficulty || session?.difficulty;
  const diffClass = difficulty ? (difficultyColors[difficulty] ?? "") : "";

return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold break-words">
              {question?.title ||
               session?.questionTitle ||
               (session?.questionId != null ? `Question #${session.questionId}` : "Session")}
            </h1>
            {difficulty && (
              <Badge variant="outline" className={`${diffClass} mt-2`}>
                {difficulty}
              </Badge>
            )}
          </div>
          <Link to="/session-history" className="text-sm text-muted-foreground hover:underline shrink-0">
            ← Back to Past Sessions
          </Link>
        </div>

        {err && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6 text-destructive">{err}</CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-4">
            <Card className="animate-pulse"><CardContent className="h-24" /></Card>
            <Card className="animate-pulse"><CardContent className="h-48" /></Card>
            <Card className="animate-pulse"><CardContent className="h-48" /></Card>
          </div>
        ) : (
          <>
            {/* Question Details */}
            <Card>
              <CardHeader>
                <CardTitle>Problem</CardTitle>
              </CardHeader>
              <CardContent>
                {question?.body ? (
                  <div
                    className="break-words text-sm leading-relaxed space-y-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted/60 [&_pre]:p-4 [&_code]:font-mono [&_img]:max-w-full [&_table]:w-full"
                    dangerouslySetInnerHTML={{ __html: question.body }}
                  />
                ) : (
                  <p className="text-muted-foreground">No description available.</p>
                )}
              </CardContent>
            </Card>

            {/* Last Edited Code (read-only) */}
            <Card>
              <CardHeader>
                <CardTitle>Last Edited Code</CardTitle>
              </CardHeader>
              <CardContent>
                {session?.code
                  ? (
                    <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                      <code>{session.code}</code>
                    </pre>
                  )
                  : <p className="text-muted-foreground">No code saved for this session.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
