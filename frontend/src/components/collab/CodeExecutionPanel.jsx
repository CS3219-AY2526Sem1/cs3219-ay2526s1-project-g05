import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Play, AlertTriangle, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const STATUS_MAP = {
  Ready: { color: "text-gray-500", icon: Play },
  Success: { color: "text-green-600", icon: CheckCircle },
  "Runtime Error": { color: "text-red-600", icon: AlertTriangle },
  "Time Limit Exceeded": { color: "text-yellow-600", icon: AlertTriangle },
  "Setup/Docker Error": { color: "text-pink-600", icon: AlertTriangle },
  Failure: { color: "text-red-700", icon: AlertTriangle },
  Running: { color: "text-blue-600", icon: Loader2 },
};

export default function CodeExecutionPanel({
  executionHistory,
  setDisplayExecutionPanel,
}) {

  return (
    <Card className="h-full w-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="border-b !h-20">
        <div className="w-full flex justify-between items-center">
          <span className="text-xl font-semibold tracking-wider">
            Code Runner
          </span>
          <Button
            onClick={() => setDisplayExecutionPanel(false)}
          >
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="w-full h-full flex-1 flex flex-col !p-0 overflow-hidden">
        <div className="h-full flex flex-col">

          {/* Execution Log Area */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4 pb-2">
              {executionHistory.map((log, index) => {
                const { color: statusColor, icon: StatusIcon } = STATUS_MAP[log.status] || STATUS_MAP.Ready;

                return (
                  <div key={log.timestamp || index} className="border-b pb-2">
                    <div className="flex items-center text-sm font-semibold">
                      <StatusIcon className={`w-4 h-4 mr-2 ${statusColor} ${log.status === "Running" ? "animate-spin" : ""}`} />
                      <span className={statusColor}>{log.status}</span>
                      {log.timestamp && <span className="text-gray-400 ml-auto">{log.timestamp}</span>}
                    </div>

                    <p className="text-sm mt-1">{log.message}</p>

                    {log.error && (
                      <pre className="mt-2 bg-red-100 text-red-800 p-2 rounded text-xs overflow-x-auto">
                        <strong>Error:</strong> {log.error}
                      </pre>
                    )}

                    {log.output && (
                      <pre className="mt-2 bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap overflow-x-auto">
                        <strong>Output:</strong> {log.output}
                      </pre>
                    )}

                    {log.executionTimeMs > 0 && log.status !== "Running" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Time: {log.executionTimeMs.toFixed(2)} ms
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}