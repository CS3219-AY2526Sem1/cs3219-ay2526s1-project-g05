import MainLayout from "@/layout/MainLayout";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MatchingPage() {
  const navigate = useNavigate();
  const [dots, setDots] = useState("");

  return (
    <MainLayout>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-8">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />

            <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground">
                Searching for your perfect coding match...{dots}
            </h1>
            <p className="text-muted-foreground">
                Hang tight while we find someone just right!
            </p>
            </div>
        </div>
        </div>
    </MainLayout>
  );
}
