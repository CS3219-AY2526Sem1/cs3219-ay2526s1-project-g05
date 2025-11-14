import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import MainLayout from "@/layout/MainLayout";
import { CheckCircle2, Tags, Target, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMatching } from "@/context/MatchingContext";

export default function MatchedPage() {
  const navigate = useNavigate();
  const { matchInfo, confirmMatch, cancelMatching } = useMatching();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchInfo) navigate("/matchmaking");
  }, [matchInfo]);
  // Temporary mock data (replace with real matchmaking data later)

  const handleConfirmMatch = async () => {
    setLoading(true);
    await confirmMatch();
    setLoading(false);
  };

  return (
    <MainLayout>
      {matchInfo && (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center space-y-6 pb-8">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center ring-4 ring-green-200">
                <CheckCircle2
                  className="w-12 h-12 text-green-600 animate-in zoom-in duration-300"
                  strokeWidth={2.5}
                />
              </div>
              <div className="space-y-3">
                <p className="text-3xl font-bold tracking-tight">
                  Match Found! 🎉
                </p>
                <div className="text-center text-muted-foreground">
                  <p className="text-base leading-relaxed">
                    You’re now connected with a coding partner —
                  </p>
                  <p className="text-base leading-relaxed">
                    Get ready to start coding together!
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Partner</p>
                    <p className="font-semibold text-lg">
                      {matchInfo.matchDetails.partnerUser}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
                  <Target className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Difficulty Level
                    </p>
                    <Badge variant="outline" className="mt-1 font-medium">
                      {matchInfo.matchDetails.criteria.difficulty}
                    </Badge>
                  </div>
                </div>

                {matchInfo.matchDetails.criteria.topics &&
                  matchInfo.matchDetails.criteria.topics.length > 0 && (
                    <div className="flex items-start gap-3 p-4 bg-secondary rounded-lg">
                      <Tags className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">
                          Topics
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {matchInfo.matchDetails.criteria.topics.map(
                            (topic) => (
                              <Badge key={topic} variant="outline">
                                {topic}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
              {matchInfo.matchDetails.partnerConfirmed && (
                <div className="my-2 flex items-center animate-in fade-in duration-150">
                  <CheckCircle2
                    className="text-green-600 animate-in zoom-in duration-300"
                    strokeWidth={2.5}
                  />
                  <span className="ml-2 text-muted-foreground">
                    <b>{matchInfo.matchDetails.partnerUser}</b> has confirmed
                  </span>
                </div>
              )}

              <Button
                className="w-full"
                disabled={matchInfo.confirmed || loading}
                size="lg"
                onClick={() => {
                  handleConfirmMatch();
                }}
              >
                {matchInfo.confirmed
                  ? "Waiting for partner to confirm..."
                  : "Start Coding Session"}
              </Button>
              <Button
                onClick={() => {
                  cancelMatching();
                }}
                variant="destructive"
                className="w-full !mt-4"
              >
                Cancel Match
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
