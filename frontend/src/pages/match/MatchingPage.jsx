import MainLayout from "@/layout/MainLayout";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMatching } from "@/context/MatchingContext";

export default function MatchingPage() {
  const navigate = useNavigate();
  const { cancelMatching, isInQueue } = useMatching();
  const [loadingCancel, setLoadingCancel] = useState(false);

  useEffect(() => {
    if (!isInQueue) {
      navigate("/matchmaking");
    }
  }, []);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-8">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground">
              Searching for your perfect coding match...
            </h1>
            <p className="text-muted-foreground">
              Hang tight while we find someone just right!
            </p>
          </div>

          <Button
            disabled={loadingCancel}
            variant="destructive"
            onClick={async () => {
              setLoadingCancel(true);
              if (!(await cancelMatching())) {
                setLoadingCancel(false);
              }
            }}
          >
            Cancel Search
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
