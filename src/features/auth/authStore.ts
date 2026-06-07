import { create } from "zustand";
import type { UserProfile } from "@/shared/api/modules/users";

type AuthStatus = "checking" | "authenticated" | "guest";

type AuthState = {
  status: AuthStatus;
  user: UserProfile | null;
  clearUser: () => void;
  setStatus: (status: AuthStatus) => void;
  setUser: (user: UserProfile | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  clearUser: () => set({ status: "guest", user: null }),
  setStatus: (status) => set({ status }),
  setUser: (user) => set({ status: user ? "authenticated" : "guest", user }),
  status: "checking",
  user: null,
}));
