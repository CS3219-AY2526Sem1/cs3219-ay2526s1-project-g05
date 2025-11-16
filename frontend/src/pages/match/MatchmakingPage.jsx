import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import topics from "@/data/topics.json";
import MainLayout from "@/layout/MainLayout";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMatching } from "@/context/MatchingContext";

const difficulties = [
  { id: "Easy", label: "Easy", color: "from-green-500 to-emerald-500" },
  { id: "Medium", label: "Medium", color: "from-yellow-500 to-orange-500" },
  { id: "Hard", label: "Hard", color: "from-red-500 to-pink-500" },
];

export default function MatchmakingPage() {
  const navigate = useNavigate();
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const { handleEnterQueue } = useMatching();

  const handleTopicToggle = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  };

  const handleStartMatching = async () => {
    if (!selectedDifficulty) {
      toast.error("Please select a difficulty level");
      return;
    }
    setLoading(true);
    await handleEnterQueue({
      difficulty: selectedDifficulty,
      topics: selectedTopics,
    });
    setLoading(false);

    // toast.success("Finding your coding partner...", {
    //   description: `Difficulty: ${selectedDifficulty}${
    //     selectedTopics.length > 0 ? ` | Topics: ${selectedTopics.join(", ")}` : ""
    //   }`,
    // });
  };

  return (
    <MainLayout>
      <div className="pb-4 bg-background">
        <div className="container mx-auto px-4 md:py-6">
          {/* Container for header + cards */}
          <div className="rounded-2xl">
            {/* Header */}
            <div className="mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="mb-4 hover:bg-black/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Set Your Preferences
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Choose your difficulty level and optional topics to get matched.
              </p>
            </div>

            {/* Cards */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Difficulty Selection Card */}
              <Card className="p-8 border-border bg-gradient-to-br from-card to-card/50">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-black" />
                  Difficulty Level
                  <span className="text-sm text-destructive ml-2">
                    *Required
                  </span>
                </h2>
                <div className="space-y-4">
                  {difficulties.map((difficulty) => (
                    <button
                      key={difficulty.id}
                      onClick={() => setSelectedDifficulty(difficulty.id)}
                      className={`w-full p-6 rounded-xl border-2 transition-all duration-300 ${
                        selectedDifficulty === difficulty.id
                          ? "border-black scale-105 shadow-lg"
                          : "border-border hover:border-black/50 hover:scale-102"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium">
                          {difficulty.label}
                        </span>
                        <div
                          className={`h-3 w-3 rounded-full bg-gradient-to-r ${difficulty.color}`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Topics Selection Card */}
              <Card className="p-8 border-border bg-gradient-to-br from-card to-card/50">
                <h2 className="text-2xl font-semibold mb-6">
                  Topics
                  <span className="text-sm text-muted-foreground ml-2 font-normal">
                    Optional
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                  {topics.map((topic) => (
                    <label
                      key={topic}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-black/50 hover:bg-black/5 cursor-pointer transition-all duration-200"
                    >
                      <Checkbox
                        checked={selectedTopics.includes(topic)}
                        onCheckedChange={() => handleTopicToggle(topic)}
                        className="data-[state=checked]:bg-black data-[state=checked]:border-black [&>span>svg]:text-white"
                      />
                      <span className="text-sm font-medium">{topic}</span>
                    </label>
                  ))}
                </div>
                {selectedTopics.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {selectedTopics.length} topic
                      {selectedTopics.length !== 1 ? "s" : ""} selected
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 mb-8 flex justify-center">
            <Button
              size="lg"
              onClick={handleStartMatching}
              disabled={loading || !selectedDifficulty}
              className="w-xl bg-black text-white hover:bg-black/90 disabled:opacity-50"
            >
              Find Coding Partner
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
