import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserContext } from "@/context/UserContext";
import MainLayout from "@/layout/MainLayout";
import { collaborationApi } from "@/lib/collaborationApi";
import { getQuestionById } from "@/lib/getQuestions";
import { Calendar, Clock, Code2, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const difficultyColors = {
  Easy: "bg-green-500/10 text-green-600 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Hard: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatDuration(ms) {
  if (ms == null || ms < 0) return "—";
  if (ms === 0) return "0 min";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function toCardModel(raw, currentUserId) {
  const doc = raw?.session ?? raw;
  const id = doc?._id || doc?.id || doc?.sessionId;
  const createdAt = doc?.createdAt ? new Date(doc.createdAt) : null;
  const updatedAt = doc?.updatedAt ? new Date(doc.updatedAt) : null;
  const endedAt = doc?.endedAt ? new Date(doc.endedAt) : null;
  const questionId = doc?.questionId;

  const others = Array.isArray(doc?.participants)
    ? doc.participants.filter((p) => p?.userId !== currentUserId)
    : [];
  const partner = others?.[0]?.displayName || "Unknown partner";

  const q = doc?.question || {};
  const problemTitle =
    q.title || doc?.questionTitle || (doc?.questionId != null ? `Question #${doc.questionId}` : "Untitled Problem");

  const difficulty = q.difficulty || doc?.difficulty || null;
  const topics = q.topics || doc?.topics || (doc?.language ? [doc.language] : []);

  const completed =
    !!endedAt ||
    doc?.status === "ended" ||
    (Array.isArray(doc?.participants) && doc.participants.length > 0
      ? doc.participants.every((p) => p?.endConfirmed)
      : false);

  let durationMs = null;
  if (createdAt && endedAt) durationMs = endedAt - createdAt;
  else if (createdAt && updatedAt) durationMs = updatedAt - createdAt;

  return {
    id,
    questionId,
    partner,
    problem: problemTitle,
    difficulty,
    topics: Array.isArray(topics) ? topics : [],
    date: createdAt,
    duration: formatDuration(durationMs),
    completed,
  };
}

export default function PastSessions() {
  const navigate = useNavigate();
  const { user } = useUserContext();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Only run once user is loaded
  const sessionIds = useMemo(() => {
    if (!user) return null;
    return user.pastCollaborationSessions || [];
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (user === null) return;
      setLoading(true);
      setError("");

      try {
        if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
          if (mounted) {
            setCards([]);
            setLoading(false);
          }
          return;
        }

        const results = await Promise.allSettled(
            sessionIds.map((id) => collaborationApi.getSessionAllowEnded(id))
        );

        const ok = results
          .filter((r) => r.status === "fulfilled" && r.value)
          .map((r) => r.value);

        let models = ok
          .map((raw) => toCardModel(raw, user?.id))
          .sort((a, b) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0));

        models = await Promise.all(
          models.map(async (s) => {
            if (s.questionId != null) {
              try {
                const q = await getQuestionById(s.questionId);
                s.question = q;
                s.problem = q?.title ?? s.problem;
                s.difficulty = q?.difficulty ?? s.difficulty;
                if ((!s.topics || s.topics.length === 0) && Array.isArray(q?.topics)) {
                  s.topics = q.topics;
                }
              } catch (e) {
                console.warn(`Failed to load question ${s.questionId}`, e);
              }
            }
            return s;
          })
        );

        if (mounted) {
          setCards(models);

          const failed = results.filter((r) => r.status === "rejected");
          if (failed.length) {
            const firstErr = failed[0].reason;
            const msg =
              firstErr?.response?.data?.message ||
              firstErr?.message ||
              "Some sessions couldn't be loaded.";
            setError(`${msg} (${failed.length} failed)`);
          }
        }
      } catch (e) {
        if (mounted) {
          const msg =
            e?.response?.data?.message || e?.message || "Failed to load past sessions.";
          setError(msg);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [sessionIds, user]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container max-w-5xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Past Sessions</h1>
              <p className="text-muted-foreground mt-1">
                Review your coding collaboration history
              </p>
            </div>
          </div>

          {error && (
            <Card className="border-destructive/30">
              <CardContent className="pt-6 text-destructive">{error}</CardContent>
            </Card>
          )}

          {loading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-1/3 bg-muted rounded mb-2" />
                    <div className="h-4 w-1/4 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 w-1/2 bg-muted rounded mb-3" />
                    <div className="h-4 w-1/3 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cards.length > 0 ? (
            <div className="grid gap-4">
              {cards.map((session) => {
                const problemTitle =
                  session.problem ||
                  session.questionTitle ||
                  session.question?.title ||
                  (session.questionId != null ? `Question #${session.questionId}` : "Untitled Problem");

                const difficulty =
                  session.difficulty || session.question?.difficulty || null;

                const topics =
                  (Array.isArray(session.topics) && session.topics.length > 0
                    ? session.topics
                    : session.question?.topics) || [];

                const diffClass = difficulty ? (difficultyColors[difficulty] ?? "") : "";

                return (
                  <Card
                    key={session.id}
                    className="hover:shadow-lg transition-shadow border-2"
                    onClick={() => navigate(`/session/${session.id}`)}
                  >
                    <CardHeader>
                      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl mb-2 flex items-center gap-2 min-w-0">
                            <Code2 className="w-5 h-5 text-primary shrink-0" />
                             <span className="min-w-0 break-words [overflow-wrap:anywhere] whitespace-normal leading-snug">
                              {problemTitle}
                             </span>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <User className="w-4 h-4 shrink-0" />
                            <span className="truncate sm:whitespace-normal">
                              Partnered with {session.partner}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge
                          variant={difficulty ? "outline" : "secondary"}
                          className={`${diffClass} shrink-0 sm:ml-4`}
                        >
                          {difficulty || "—"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {topics.map((topic) => (
                            <Badge key={topic} variant="secondary">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {session.date
                            ? session.date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {session.duration}
                        </div>
                        <Badge
                          variant={session.completed ? "default" : "outline"}
                          className="ml-auto"
                        >
                          {session.completed ? "Completed" : "Incomplete"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Code2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Past Sessions</h3>
              <p className="text-muted-foreground mb-4">
                Start your first coding session to see it here
              </p>
              <Button onClick={() => navigate("/matchmaking")}>
                Find a Partner
              </Button>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
