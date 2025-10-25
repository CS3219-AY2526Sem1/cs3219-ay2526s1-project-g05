import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { userApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

const UserContext = createContext(null);
const UNAUTHENTICATED_ROUTES = ["/register", "/login", "/"];

export const UserProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    handleInitialLoad();
  }, []);

  useEffect(() => {
    if (loading) return; // Return if initialLoad is not complete
    if (user) {
      if (location.pathname === "/register" || location.pathname === "/login") {
        // Don't allow auth users to access login/register pages
        navigate("/matchmaking");
      }
      return;
    }
    // If no valid user obj, we need to only allow routes to main page + login page
    if (!UNAUTHENTICATED_ROUTES.includes(location.pathname)) {
      toast.info("Please login to access this page.");
      navigate("/login");
    }
  }, [loading, user, location]);

  const setUserAndStorage = useCallback((newUser, token) => {
    if (newUser) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
    setUser(newUser);
  }, []);

  const loginUser = useCallback(
    (userData, token) => {
      setUserAndStorage(userData, token);
      toast.success("Logged in successfully!");
    },
    [setUserAndStorage],
  );

  const logout = useCallback(() => {
    setUserAndStorage(null);
    toast.success("Logged out successfully!");
    navigate("/");
  }, [setUserAndStorage, navigate]);

  const handleInitialLoad = useCallback(async () => {
    await refreshUserData();
    setLoading(false);
  });

  const refreshUserData = useCallback(async () => {
    try {
      // Fetch updated user data from API
      const response = await userApi.getMe();
      setUser(response.user);
      return response.user;
    } catch (e) {
      return null;
    }
  }, [user, setUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        setUser: setUserAndStorage,
        loginUser,
        logout,
        refreshUserData,
      }}
    >
      {loading ? (
        <div className="animate-in fade-in duration-100 flex justify-center items-center w-screen h-screen">
          <div className="flex flex-col items-center">
            <img src={logo} className="h-24 mb-3" alt="logo" />
            <h1 className="text-2xl tracking-widest">Loading PeerPrep...</h1>
            <Loader2 className="w-16 h-16 mt-4 text-primary animate-spin" />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in-100">{children}</div>
      )}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
