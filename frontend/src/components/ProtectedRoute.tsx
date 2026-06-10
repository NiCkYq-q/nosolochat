import { Navigate, Outlet } from "react-router-dom";
import { ChatNotificationProvider } from "../context/ChatNotificationContext";
import { useAuth } from "../context/useAuth";
import ToastNotifications from "./ToastNotifications";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="page">
        <p>Загрузка...</p>
      </main>
    );
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ChatNotificationProvider>
      <ToastNotifications />
      <Outlet />
    </ChatNotificationProvider>
  );
}

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="page">
        <p>Загрузка...</p>
      </main>
    );
  }

  if (user !== null) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="page">
        <p>Загрузка...</p>
      </main>
    );
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <ChatNotificationProvider>
      <ToastNotifications />
      <Outlet />
    </ChatNotificationProvider>
  );
}
