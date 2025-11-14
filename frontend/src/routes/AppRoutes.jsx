import { Navigate, Route, Routes } from "react-router-dom";

import App from "@/App";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ErrorPage from "@/pages/ErrorPage";
import MatchedPage from "@/pages/match/MatchedPage";
import MatchingPage from "@/pages/match/MatchingPage";
import MatchmakingPage from "@/pages/match/MatchmakingPage";
import MatchTimeoutPage from "@/pages/match/MatchTimeoutPage";
import PastSessionsPage from "@/pages/profile/PastSessionsPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import QuestionDetailPage from "@/pages/questions/QuestionDetailPage";
import QuestionPage from "@/pages/questions/QuestionPage";
import SessionDisconnectedPage from "@/pages/session/SessionDisconnectedPage";
import SessionEndedPage from "@/pages/session/SessionEndedPage";
import SessionPage from "@/pages/session/SessionPage";
import SessionViewerPage from "@/pages/session/SessionViewerPage";
import { GuestRoute } from "@/routes/GuestRoute";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/login"
        element={
          <GuestRoute redirectTo="/matchmaking">
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        }
      />

      {/* Questions List */}
      <Route
        path="/problemset"
        element={
          <ProtectedRoute>
            <QuestionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/question/:id"
        element={
          <ProtectedRoute>
            <QuestionDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Matching Flow */}
      <Route
        path="/matchmaking"
        element={
          <ProtectedRoute>
            <MatchmakingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matching"
        element={
          <ProtectedRoute>
            <MatchingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matched"
        element={
          <ProtectedRoute>
            <MatchedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/match-timeout"
        element={
          <ProtectedRoute>
            <MatchTimeoutPage />
          </ProtectedRoute>
        }
      />

      {/* Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session-history"
        element={
          <ProtectedRoute>
            <PastSessionsPage />
          </ProtectedRoute>
        }
      />

      {/* Session */}
      <Route
        path="/session"
        element={
          <ProtectedRoute>
            <SessionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session-disconnected"
        element={
          <ProtectedRoute>
            <SessionDisconnectedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session-ended"
        element={
          <ProtectedRoute>
            <SessionEndedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session/:sessionId"
        element={
          <ProtectedRoute>
            <SessionViewerPage />
          </ProtectedRoute>
        }
      />

      {/* Error + Catch-all */}
      <Route path="/404" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
