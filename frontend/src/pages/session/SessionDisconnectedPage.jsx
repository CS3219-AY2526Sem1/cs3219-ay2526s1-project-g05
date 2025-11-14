import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import MainLayout from "@/layout/MainLayout";
import { RefreshCw, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SessionDisconnectedPage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <Card className="border-2 shadow-lg">
            <CardHeader className="text-center space-y-6 pb-8">
              <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center ring-4 ring-destructive/5">
                <XCircle
                  className="w-12 h-12 text-destructive animate-in zoom-in duration-300"
                  strokeWidth={2.5}
                />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  Session Disconnected
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                  The session was ended by one participant or the connection was
                  lost.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-8">
              <Button
                className="w-full h-12 text-base gap-2"
                onClick={() => navigate("/matchmaking")}
              >
                <RefreshCw className="w-4 h-4" />
                Find Another Partner
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
