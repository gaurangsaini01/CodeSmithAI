import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { ReactNode } from "react";

// Redirects to /login when not authenticated.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useSelector((s: RootState) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Redirects to / when already authenticated (for /login, /signup).
export function GuestRoute({ children }: { children: ReactNode }) {
  const user = useSelector((s: RootState) => s.auth.user);
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
