import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const setUserAndStorage = useCallback((newUser, token, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;

    if (newUser) {
      storage.setItem("user", JSON.stringify(newUser));
      if (token) storage.setItem("token", token);
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
    }
    setUser(newUser);
  }, []);

  const loginUser = useCallback((userData, token, rememberMe = false) => {
    setUserAndStorage(userData, token, rememberMe);
    toast.success("Logged in successfully!");
  }, [setUserAndStorage]);

  const logout = useCallback(() => {
    setUserAndStorage(null);
    toast.success("Logged out successfully!");
    navigate("/");
  }, [setUserAndStorage, navigate]);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser: setUserAndStorage,
        loginUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
