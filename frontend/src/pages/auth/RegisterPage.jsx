import { RegisterForm } from "@/components/form/register-form"
import MainLayout from "@/layout/MainLayout"

export default function RegisterPage() {
  return (
    <MainLayout>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <RegisterForm />
        </div>
      </div>
    </MainLayout>
  )
}
