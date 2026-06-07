import { create } from "zustand";

type UiState = {
  activeNavSectionId: string;
  closeSecondaryPanel: () => void;
  secondaryPanelOpen: boolean;
  setActiveNavSection: (sectionId: string) => void;
  sidebarOpen: boolean;
  toggleSecondaryPanel: () => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeNavSectionId: "home",
  closeSecondaryPanel: () => set({ secondaryPanelOpen: false, sidebarOpen: false }),
  secondaryPanelOpen: false,
  setActiveNavSection: (sectionId) => set({ activeNavSectionId: sectionId }),
  sidebarOpen: false,
  toggleSecondaryPanel: () => set((state) => ({ secondaryPanelOpen: !state.secondaryPanelOpen, sidebarOpen: !state.secondaryPanelOpen })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
