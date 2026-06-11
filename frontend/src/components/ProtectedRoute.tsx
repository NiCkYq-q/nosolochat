import { Navigate, Outlet } from "react-router-dom";
import { ChatNotificationProvider } from "../context/ChatNotificationContext";
import { useAuth } from "../context/useAuth";
import FaviconController from "./FaviconController";
import SessionReadyBridge from "./SessionReadyBridge";
import ToastNotifications from "./ToastNotifications";

export function ProtectedRoute() {
  const { user } = useAuth();

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ChatNotificationProvider>
      <FaviconController />
      <SessionReadyBridge />
      <ToastNotifications />
      <Outlet />
    </ChatNotificationProvider>
  );
}

export function PublicOnlyRoute() {
  const { user } = useAuth();

  if (user !== null) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user } = useAuth();

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <ChatNotificationProvider>
      <FaviconController />
      <SessionReadyBridge />
      <ToastNotifications />
      <Outlet />
    </ChatNotificationProvider>
  );
}
