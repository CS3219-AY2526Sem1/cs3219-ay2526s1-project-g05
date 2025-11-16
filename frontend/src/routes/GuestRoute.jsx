import { Navigate } from "react-router-dom";
import { useUserContext } from "@/context/UserContext";

export function GuestRoute({ children, redirectTo = "/" }) {
  const { user, loading } = useUserContext();

  if (loading) return <p>Loading...</p>;

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
