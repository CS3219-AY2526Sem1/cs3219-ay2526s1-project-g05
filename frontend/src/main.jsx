import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import AppRoutes from "@/routes/AppRoutes";
import { UserProvider } from "@/context/UserContext";
import "@/App.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
        <BrowserRouter>
          <UserProvider>
              <AppRoutes />
          </UserProvider>
        </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
