import { LoginForm } from "@/components/form/login-form";
import { useLocation } from "react-router-dom";
import MainLayout from "@/layout/MainLayout"
import { useEffect } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const location = useLocation();

  useEffect(() => {
    const reason = location.state?.reason;
    if (reason === "auth") {
      toast.info("Please login to access this page.");
    }
  }, [location.key]); // reacts only to new navigations

  return (
    <MainLayout>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <LoginForm />
        </div>
      </div>
    </MainLayout>
  )
}
