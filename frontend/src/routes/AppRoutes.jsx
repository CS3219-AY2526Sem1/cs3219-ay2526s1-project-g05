import { Navigate, Route, Routes } from "react-router-dom";

import App from "@/App";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import LoginPage from "@/pages/auth/LoginPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ErrorPage from "@/pages/ErrorPage";
import MatchedPage from "@/pages/match/MatchedPage";
import MatchingPage from "@/pages/match/MatchingPage";
import MatchmakingPage from "@/pages/match/MatchmakingPage";
import QuestionPage from "@/pages/questions/QuestionPage";
import MatchTimeoutPage from "@/pages/match/MatchTimeoutPage";
import CollaborativePage from "@/pages/collab/CollaborativePage";
import PastSessionsPage from "@/pages/profile/PastSessionsPage";
import QuestionDetailPage from "@/pages/questions/QuestionDetailPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/problemset" element={<QuestionPage />} />

      {/* Matching Flow */}
      <Route path="/matchmaking" element={<MatchmakingPage />} />
      <Route path="/matching" element={<MatchingPage />} />
      <Route path="/matched" element={<MatchedPage />} />
      <Route path="/match-timeout" element={<MatchTimeoutPage />} />

      {/* Profile */}
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/session-history" element={<PastSessionsPage />} />

      {/* Questions */}
      <Route path="/question/:id" element={<QuestionDetailPage />} />

      {/* Session */}
      <Route path="/session" element={<CollaborativePage />} />

      {/* Error + Catch-all */}
      <Route path="/404" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
