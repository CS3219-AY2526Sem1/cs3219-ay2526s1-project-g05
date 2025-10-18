// useAuth.js
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { userApi } from "@/lib/api";
import { useUserContext } from "@/context/UserContext";

export function useAuth() {
  const navigate = useNavigate();
  const { loginUser, logout } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);

  const register = useCallback(async (data, setFieldErrors) => {
    setIsLoading(true);
    try {
      const response = await userApi.register(data);
      loginUser(response.user, response.token);
      navigate("/");
    } catch (error) {
      // handle field-level errors
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        setFieldErrors(prev => ({
          ...prev,
          ...backendErrors,
          general: "",
        }));
      } else {
        setFieldErrors(prev => ({
          ...prev,
          general: "Registration failed. Please try again.",
        }));
      }
      toast.error("Registration failed.");
    } finally {
      setIsLoading(false);
    }
  }, [loginUser, navigate]);

  const login = useCallback(async (data, setFieldErrors) => {
    setIsLoading(true);
    try {
      const response = await userApi.login(data);
      loginUser(response.user, response.token);
      navigate("/");
    } catch (error) {
      if (error.response?.data?.errors) {
        setFieldErrors(prev => ({
          ...prev,
          ...error.response.data.errors,
          general: "",
        }));
      } else {
        setFieldErrors(prev => ({
          ...prev,
          general: "Login failed. Check your credentials.",
        }));
      }
      toast.error("Login failed.");
    } finally {
      setIsLoading(false);
    }
  }, [loginUser, navigate]);

  const logoutUser = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  return { login, register, logout: logoutUser, isLoading };
}
