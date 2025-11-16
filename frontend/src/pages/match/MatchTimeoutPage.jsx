import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { XCircle, RefreshCw, Settings } from "lucide-react";
import MainLayout from "@/layout/MainLayout";

export default function MatchTimeoutPage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
            <Card className="border-2 shadow-lg">
            <CardHeader className="text-center space-y-6 pb-8">
                <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center ring-4 ring-destructive/5">
                <XCircle className="w-12 h-12 text-destructive animate-in zoom-in duration-300" strokeWidth={2.5} />
                </div>
                <div className="space-y-3">
                <p className="text-3xl font-bold tracking-tight">
                    No Match Found
                </p>
                <p className="text-muted-foreground text-base leading-relaxed">
                    We couldn’t find a coding partner at the moment. <br/>Try again soon or tweak your preferences to improve your chances!
                </p>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-8">
                <Button 
                className="w-full h-12 text-base gap-2" 
                onClick={() => navigate("/matching")}
                >
                <RefreshCw className="w-4 h-4" />
                Try Again
                </Button>
                <Button 
                variant="outline"
                className="w-full h-12 text-base gap-2" 
                onClick={() => navigate("/matchmaking")}
                >
                <Settings className="w-4 h-4" />
                Change Preferences
                </Button>
            </CardContent>
            </Card>

            {/* <p className="text-center text-sm text-muted-foreground">
            Tip: Peak matching times are usually during evenings and weekends
            </p> */}
        </div>
        </div>
    </MainLayout>
  );
};
