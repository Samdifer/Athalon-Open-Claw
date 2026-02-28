import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import "./app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      >
        <BrowserRouter>
          <ConvexClientProvider>
            <App />
            <Toaster richColors position="bottom-right" />
          </ConvexClientProvider>
        </BrowserRouter>
      </ClerkProvider>
    </ThemeProvider>
  </React.StrictMode>
);
