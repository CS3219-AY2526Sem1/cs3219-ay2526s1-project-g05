import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import AppRoutes from "@/routes/AppRoutes";
import { UserProvider } from "@/context/UserContext";
import "@/App.css";
import { Toaster } from "sonner";
import { MatchingProvider } from "./context/MatchingContext";
import { CollaborationSessionProvider } from "./context/CollaborationSessionContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <Toaster />
      <BrowserRouter>
        <UserProvider>
          <MatchingProvider>
            <CollaborationSessionProvider>
              <AppRoutes />
            </CollaborationSessionProvider>
          </MatchingProvider>
        </UserProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
