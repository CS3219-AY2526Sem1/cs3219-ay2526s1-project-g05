import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "@/context/UserContext";
import logo from "@/assets/logo.png";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }) {
  const { user, token, loading } = useUserContext();
  const location = useLocation();

  if (loading)
    return (
      <div className="animate-in fade-in duration-100 flex justify-center items-center w-screen h-screen">
        <div className="flex flex-col items-center">
          <img src={logo} className="h-24 mb-3" alt="logo" />
          <h1 className="text-2xl tracking-widest">Loading PeerPrep...</h1>
          <Loader2 className="w-16 h-16 mt-4 text-primary animate-spin" />
        </div>
      </div>
    );

  if (!user || !token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, reason: "auth" }}
      />
    );
  }

  return children;
}
