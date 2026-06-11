import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { useAuth } from "./context/useAuth";
import { initViewportHeight } from "./utils/viewportHeight";
import "./index.css";

initViewportHeight();

function AppShell() {
  const { isAppReady } = useAuth();

  if (!isAppReady) {
    return <SplashScreen />;
  }

  return (
    <SocketProvider>
      <App />
    </SocketProvider>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
