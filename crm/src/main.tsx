import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TanstackQueryProvider } from "@/providers/TanstackQueryProvider";
import { HelmetProvider } from "react-helmet-async";

import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NuqsAdapter } from "nuqs/adapters/react";

const root = document.getElementById("root") || document.body;
createRoot(root).render(
  <StrictMode>
    <TanstackQueryProvider>
      <HelmetProvider>
        <ThemeProvider defaultTheme="system">
          <NuqsAdapter>
            <App />
          </NuqsAdapter>
        </ThemeProvider>
      </HelmetProvider>
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </TanstackQueryProvider>
  </StrictMode>
);
