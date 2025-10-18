import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Code2, User, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layout/MainLayout";

const pastSessions = [
  {
    id: "1",
    partner: "Alex Chen",
    problem: "Two Sum",
    difficulty: "Easy",
    topics: ["Arrays", "Hash Tables"],
    date: "2025-10-15",
    duration: "45 min",
    completed: true,
  },
  {
    id: "2",
    partner: "Sarah Johnson",
    problem: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    topics: ["Hash Tables", "Sliding Window"],
    date: "2025-10-12",
    duration: "60 min",
    completed: true,
  },
  {
    id: "3",
    partner: "Mike Rodriguez",
    problem: "Merge K Sorted Lists",
    difficulty: "Hard",
    topics: ["Linked Lists", "Heap"],
    date: "2025-10-10",
    duration: "38 min",
    completed: false,
  },
];

const difficultyColors = {
  Easy: "bg-green-500/10 text-green-600 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Hard: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function PastSessions() {
  const navigate = useNavigate();

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

            <div className="grid gap-4">
            {pastSessions.map((session) => (
                <Card
                key={session.id}
                className="hover:shadow-lg transition-shadow -pointer border-2"
                onClick={() => navigate(`/session`)}
                >
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl mb-2 flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-primary shrink-0" />
                        <span>{session.problem}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Partnered with {session.partner}
                        </CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className={`${difficultyColors[session.difficulty]} shrink-0`}
                    >
                        {session.difficulty}
                    </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                    {session.topics.map((topic) => (
                        <Badge key={topic} variant="secondary">
                        {topic}
                        </Badge>
                    ))}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(session.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        })}
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
            ))}
            </div>

            {pastSessions.length === 0 && (
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
