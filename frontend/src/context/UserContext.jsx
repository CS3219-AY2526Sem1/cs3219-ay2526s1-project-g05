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

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    handleInitialLoad();
  }, []);
  const setUserAndStorage = useCallback(
    (newUser, token = undefined, rememberMe = false) => {
      setUser(newUser);
      if (typeof token !== "undefined") {
        setToken(token);

        const storage = rememberMe ? localStorage : sessionStorage;
        if (newUser) {
          storage.setItem("token", token);
        } else {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
        }
      }
    },
    [setUser, setToken],
  );

  const loginUser = useCallback(
    (userData, token, rememberMe) => {
      setUserAndStorage(userData, token, rememberMe);
      toast.success("Logged in successfully!");
    },
    [setUserAndStorage],
  );

  const logout = useCallback(() => {
    navigate("/login", { replace: true, state: {} });
    setUserAndStorage(null, null);
    toast.success("Logged out successfully!");
  }, [setUserAndStorage, navigate]);

  const refreshUserData = useCallback(async () => {
    try {
      // Fetch updated user data from API
      const response = await userApi.getMe();
      setUser(response.user);
      return response.user;
    } catch (e) {
      if (e.status === 401) {
        setUserAndStorage(null, null); // Invalid token, maybe expired
      }
      return null;
    }
  }, [setUser]);

  const handleInitialLoad = useCallback(async () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      const isValidUser = await refreshUserData();
      if (isValidUser) setToken(token);
    }
    setLoading(false);
  }, [refreshUserData]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        token,
        setUser: setUserAndStorage,
        loginUser,
        logout,
        refreshUserData,
      }}
    >
      <div className="animate-in fade-in-100">{children}</div>
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
