import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./authStore";

export function ProtectedRoute() {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted">
        Checking secure session...
      </div>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (user.role === "JOB_SEEKER") {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}
