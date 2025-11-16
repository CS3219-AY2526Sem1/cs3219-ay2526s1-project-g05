import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCollaborationSession } from "@/context/CollaborationSessionContext";

export default function LeaveSessionDialog() {
  const {
    leaveSession,
    partnerRequestedLeave,
    acceptRequestedLeave,
    requestSessionEnd,
  } = useCollaborationSession();
  const [open, setOpen] = useState(false);
  const [forceEndEnabled, setForceEndEnabled] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const handleLeaveAnyway = async () => {
    setOpen(false);
    try {
      await leaveSession?.({ terminateForAll: true });
      toast("Session Disconnected", {
        description: "You have left the session.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't leave the session. Try again.");
    }
  };

  const handleRequestEnd = () => {
    requestSessionEnd();
    setOpen(false);
    toast("Request Sent", {
      description: "Waiting for your partner's response...",
    });
  };

  const handleAcceptRequestEnd = () => {
    acceptRequestedLeave();
  };

  const handleForceEnd = async () => {
    setOpen(false);
    try {
      await leaveSession?.({ terminateForAll: true });

      toast("Session Ended", {
        description: "You have ended the session.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't end the session.");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (partnerRequestedLeave) setOpen(true);
  }, [partnerRequestedLeave]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LogOut className="h-4 w-4" />
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        {partnerRequestedLeave ? (
          <>
            <AlertDialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl">
                  Leave Request
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base">
                Your partner has request to end the session.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialogCancel className="flex-1">Reject</AlertDialogCancel>

                <Button
                  onClick={handleAcceptRequestEnd}
                  className={cn(
                    "gap-2 flex-1",
                    "bg-destructive hover:bg-destructive/90",
                  )}
                >
                  End Session
                </Button>
              </div>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl">
                  Leave Session?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base">
                You can request to end the session with your partner, or leave
                immediately and disconnect.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>

                <Button
                  onClick={forceEndEnabled ? handleForceEnd : handleRequestEnd}
                  className={cn(
                    "gap-2 flex-1",
                    forceEndEnabled && "bg-destructive hover:bg-destructive/90",
                  )}
                >
                  {forceEndEnabled ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Force End Session
                    </>
                  ) : (
                    "Request to End"
                  )}
                </Button>
              </div>

              {/* divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              {/* immediate leave */}
              <Button
                variant="destructive"
                onClick={handleLeaveAnyway}
                className="w-full gap-2"
              >
                <LogOut className="h-4 w-4" />
                Leave Anyway
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
