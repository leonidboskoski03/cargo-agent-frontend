import { useEffect, type ReactNode } from "react";
import { refreshSession } from "@/shared/api/modules/auth";
import { getMe } from "@/shared/api/modules/users";
import { useAuthStore } from "./authStore";

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const setStatus = useAuthStore((state) => state.setStatus);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus("checking");
      try {
        await refreshSession();
        const user = await getMe();
        if (!cancelled) setUser(user);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setStatus, setUser]);

  return children;
}
