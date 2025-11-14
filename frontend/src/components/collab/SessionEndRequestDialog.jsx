import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { UserX, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function SessionEndRequestDialog({
  open,
  onAccept,
  onReject,
  partnerName = "Your partner",
}) {
  const navigate = useNavigate();

  const handleAccept = () => {
    onAccept();
    navigate("/match-timeout");
    toast({
      title: "Session Ended",
      description: "Both parties agreed to end the session.",
    });
  };

  const handleReject = () => {
    onReject();
    toast({
      title: "Request Rejected",
      description: "Continuing the session...",
    });
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 animate-scale-in">
              <UserX className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl">End Session Request</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            <span className="font-semibold text-foreground">{partnerName}</span> wants to end the session. 
            Do you want to end it as well?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleReject}
            className="gap-2 sm:w-auto"
          >
            <X className="h-4 w-4" />
            Keep Going
          </Button>
          <Button
            onClick={handleAccept}
            className="gap-2 sm:w-auto bg-primary hover:bg-primary/90"
          >
            <Check className="h-4 w-4" />
            Accept and End
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
