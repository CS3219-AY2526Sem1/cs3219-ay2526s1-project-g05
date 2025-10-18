import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProblemPanel({ problem }) {
  // Mock data for now
  const defaultProblem = {
    title: "Two Sum",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]"
      }
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "Only one valid answer exists."
    ]
  };

  const displayProblem = problem || defaultProblem;

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{displayProblem.title}</CardTitle>
          <Badge 
            variant={displayProblem.difficulty === "Easy" ? "secondary" : "default"}
            className="ml-2"
          >
            {displayProblem.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {displayProblem.description}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Examples</h3>
              <div className="space-y-4">
                {displayProblem.examples.map((example, idx) => (
                  <div key={idx} className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-sm font-medium">Input: </span>
                      <code className="text-sm">{example.input}</code>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Output: </span>
                      <code className="text-sm">{example.output}</code>
                    </div>
                    {example.explanation && (
                      <div>
                        <span className="text-sm font-medium">Explanation: </span>
                        <span className="text-sm text-muted-foreground">
                          {example.explanation}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {displayProblem.constraints && displayProblem.constraints.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Constraints</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {displayProblem.constraints.map((constraint, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2">•</span>
                      <code className="flex-1">{constraint}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
