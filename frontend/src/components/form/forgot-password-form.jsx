import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function ForgotPasswordForm({ className, ...props }) {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", general: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const parseErrors = (errors) => {
    const fieldErrs = { email: "", general: "" };
    if (Array.isArray(errors)) {
      errors.forEach((error) => {
        const e = error.toLowerCase();
        if (e.includes("email")) fieldErrs.email = error;
        else fieldErrs.general = error;
      });
    } else if (typeof errors === "string") {
      fieldErrs.general = errors;
    }
    return fieldErrs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({ email: "", general: "" });

    try {
      await requestPasswordReset(email);

      toast.success(
        "If an account exists for that email, a password reset link has been sent."
      );
      setSubmitted(true);
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        setFieldErrors(parseErrors(error.errors));
      } else if (error.message) {
        setFieldErrors(parseErrors([error.message]));
      } else {
        setFieldErrors({ email: "", general: "Unable to connect to server." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Check Your Email</CardTitle>
            <CardDescription>
              If an account exists for {email}, we&apos;ve sent password reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Try Again
              </Button>
              <div className="text-sm mt-2">
                <Link to="/login" className="underline underline-offset-4">
                Back to Login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot Password</CardTitle>
          <CardDescription>Enter your email below to reset your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              {fieldErrors.general && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {fieldErrors.general}
                </div>
              )}

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors({ email: "", general: "" });
                  }}
                  disabled={isLoading}
                  required
                  className={fieldErrors.email ? "border-destructive" : ""}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Reset Password"}
              </Button>

              <div className="relative text-center text-sm my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <span className="relative px-2 bg-card text-muted-foreground">OR</span>
              </div>

              <div className="flex flex-col gap-2 text-center text-sm">
                <Link to="/login" className="underline underline-offset-4">
                  Back to Login
                </Link>
                <Link to="/register" className="underline underline-offset-4">
                  Create New Account
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
