import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import MainLayout from "@/layout/MainLayout";
import { CheckCircle2, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SessionEndedPage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
                <Card className="border-2 shadow-lg">
                <CardHeader className="text-center space-y-6 pb-8">
                    <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center ring-4 ring-primary/5">
                    <CheckCircle2 className="w-12 h-12 text-primary animate-in zoom-in duration-300" strokeWidth={2.5} />
                    </div>
                    <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Session Ended
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed">
                        Both of you chose to end the session. Thanks for collaborating!
                    </p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 pb-8">
                    <Button 
                    className="w-full h-12 text-base gap-2" 
                    onClick={() => navigate("/")}
                    >
                    <Home className="w-4 h-4" />
                    Back to Home
                    </Button>
                </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                You can view your past sessions in your dashboard
                </p>
            </div>
        </div>
    </MainLayout>
  )
}