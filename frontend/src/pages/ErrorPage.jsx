import MainLayout from "@/layout/MainLayout";
import { Link } from "react-router-dom";

export default function ErrorPage() {
  return (
    <MainLayout>
      <div className="flex items-center min-h-screen px-4 py-12 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="w-full space-y-6 text-center">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl transition-transform hover:scale-110">404</h1>
            <p className="text-gray-500">Hmm, we couldn't find that page. Let's get you back on track.</p>
          </div>
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
            prefetch={false}
          >
            Return to website
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}