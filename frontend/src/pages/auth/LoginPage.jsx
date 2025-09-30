import { LoginForm } from "@/components/form/login-form"
import MainLayout from "@/layout/MainLayout"

export default function LoginPage() {
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
