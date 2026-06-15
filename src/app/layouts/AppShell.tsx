import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FileText,
  GitBranchPlus,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  MapPinned,
  Menu,
  Plus,
  Route,
  ScrollText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Handshake,
  Truck,
  UserRound,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "@/shared/api/modules/auth";
import { getCompanyCreditWallet } from "@/shared/api/modules/companyCredits";
import { getJobSeekerWallet } from "@/shared/api/modules/jobSeekerBilling";
import { fallbackLanguages, listSupportedLanguages } from "@/shared/api/modules/localization";
import { listNotifications } from "@/shared/api/modules/notifications";
import { updateMyUser } from "@/shared/api/modules/users";
import { Input } from "@/shared/components/ui/Form";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { languageStorageKey } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useUiStore } from "@/shared/stores/uiStore";
import type { UserRole } from "@/shared/types/auth";
import { useAuthStore } from "@/features/auth/authStore";
import {AnimatePresence, motion} from "framer-motion";

type NavShortcut = {
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
  description?: string;
  icon: LucideIcon;
  label: string;
  to: string;
};

type NavSection = {
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
  defaultTo: string;
  icon: LucideIcon;
  id: string;
  items: NavShortcut[];
  label: string;
  quickAction?: NavShortcut;
  shortLabel?: string;
};

const navSections: NavSection[] = [
  {
    defaultTo: "/dashboard",
    icon: Home,
    id: "home",
    items: [
      { description: "Company workspace summary", icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
      { description: "Latest account messages", icon: Bell, label: "Notifications", to: "/notifications" },
    ],
    label: "Home",
  },
  {
    defaultTo: "/locations",
    allowedRoles: ["COMPANY_ADMIN", "COMPANY_DRIVER"],
    icon: Route,
    id: "planning",
    items: [
      { description: "Reusable origins and destinations", icon: Map, label: "Locations", to: "/locations" },
      { description: "Company-private lanes", icon: Route, label: "Routes", to: "/routes" },
    ],
    label: "Planning",
    quickAction: { description: "Create a reusable route point", icon: Plus, label: "Create location", to: "/locations" },
    shortLabel: "Plan",
  },
  {
    defaultTo: "/posts/quick",
    allowedRoles: ["COMPANY_ADMIN", "COMPANY_DRIVER"],
    icon: MapPinned,
    id: "posts",
    items: [
      { description: "Open transport demand from other companies", icon: Search, label: "Marketplace", to: "/posts/marketplace" },
      { description: "Company-owned transport posts", icon: FileText, label: "My posts", to: "/posts/mine" },
      { description: "Create route and post together", icon: GitBranchPlus, label: "Quick route post", to: "/posts/quick" },
      { description: "Reuse planned transport routes", icon: MapPinned, label: "Planned post", to: "/posts/planned" },
    ],
    label: "Posts",
    quickAction: { description: "Minimum route and post flow", icon: Plus, label: "Create quick post", to: "/posts/quick" },
  },
  {
    defaultTo: "/contracts",
    allowedRoles: ["COMPANY_ADMIN", "COMPANY_DRIVER"],
    icon: Handshake,
    id: "bids-contracts",
    items: [
      { description: "Received and sent route marketplace offers", icon: Handshake, label: "Bids", to: "/bids" },
      { description: "Accepted bids and active agreements", icon: BriefcaseBusiness, label: "Contracts", to: "/contracts" },
    ],
    label: "Bids",
    shortLabel: "Deals",
  },
  {
    defaultTo: "/jobs",
    icon: BriefcaseBusiness,
    id: "jobs",
    items: [
      { allowedRoles: ["JOB_SEEKER"], description: "Independent driver profile and readiness", icon: UserRound, label: "Profile", to: "/job-profile" },
      { description: "Lane-aware job marketplace feed", icon: BriefcaseBusiness, label: "Browse jobs", to: "/jobs" },
      { allowedRoles: ["COMPANY_ADMIN", "JOB_SEEKER"], description: "Incoming submissions for your job posts", icon: Send, label: "Applications", to: "/jobs/applications" },
      { allowedRoles: ["COMPANY_ADMIN", "JOB_SEEKER"], description: "Your job marketplace posts", icon: FileText, label: "My listings", to: "/jobs/mine" },
      { allowedRoles: ["COMPANY_ADMIN", "JOB_SEEKER"], description: "Create a job marketplace post", icon: Plus, label: "Create listing", to: "/jobs/new" },
      { allowedRoles: ["JOB_SEEKER"], description: "Credits, quota, and purchases", icon: WalletCards, label: "Job wallet", to: "/job-wallet" },
    ],
    label: "Jobs",
    quickAction: { allowedRoles: ["COMPANY_ADMIN", "JOB_SEEKER"], description: "Publish a job marketplace post", icon: Plus, label: "Create listing", to: "/jobs/new" },
  },
  {
    defaultTo: "/vehicle-marketplace",
    allowedRoles: ["COMPANY_ADMIN", "COMPANY_DRIVER", "JOB_SEEKER"],
    icon: Truck,
    id: "vehicle-market",
    items: [
      { description: "Browse trucks, trailers, and vans", icon: Truck, label: "Browse vehicles", to: "/vehicle-marketplace" },
      { allowedRoles: ["COMPANY_ADMIN", "JOB_SEEKER"], description: "Publish a sale or rental listing", icon: Plus, label: "Create listing", to: "/vehicle-marketplace/new" },
      { allowedRoles: ["COMPANY_ADMIN", "JOB_SEEKER"], description: "Manage owned vehicle listings", icon: FileText, label: "My listings", to: "/vehicle-marketplace/mine" },
      { allowedRoles: ["COMPANY_ADMIN", "JOB_SEEKER"], description: "Sent and received buyer inquiries", icon: Bell, label: "Inquiries", to: "/vehicle-marketplace/inquiries" },
    ],
    label: "Vehicle market",
    quickAction: { allowedRoles: ["COMPANY_ADMIN", "JOB_SEEKER"], description: "Create vehicle marketplace listing", icon: Plus, label: "Create listing", to: "/vehicle-marketplace/new" },
    shortLabel: "Market",
  },
  {
    defaultTo: "/fleet",
    allowedRoles: ["COMPANY_ADMIN", "COMPANY_DRIVER"],
    icon: Truck,
    id: "fleet",
    items: [
      { description: "Fleet operations summary", icon: LayoutDashboard, label: "Overview", to: "/fleet" },
      { description: "Truck and trailer registry", icon: Truck, label: "Vehicles", to: "/fleet/vehicles" },
      { description: "Driver credentials", icon: FileText, label: "Licenses", to: "/fleet/licenses" },
      { description: "Vehicle-driver windows", icon: BriefcaseBusiness, label: "Assignments", to: "/fleet/assignments" },
    ],
    label: "Fleet",
    quickAction: { description: "Add truck or trailer record", icon: Plus, label: "Add vehicle", to: "/fleet/vehicles" },
  },
  {
    defaultTo: "/documents",
    allowedRoles: ["COMPANY_ADMIN", "COMPANY_DRIVER"],
    icon: FileText,
    id: "docs",
    items: [{ description: "Company document metadata", icon: FileText, label: "Documents", to: "/documents" }],
    label: "Docs",
  },
  {
    defaultTo: "/company",
    allowedRoles: ["COMPANY_ADMIN", "COMPANY_DRIVER"],
    icon: Building2,
    id: "company",
    items: [
      { description: "Workspace profile and identity", icon: Building2, label: "Company", to: "/company" },
      { adminOnly: true, description: "Members and company roles", icon: Users, label: "Team", to: "/team" },
      { description: "Plans and subscription state", icon: CreditCard, label: "Billing", to: "/billing" },
      { description: "Marketplace credit wallet", icon: WalletCards, label: "Credits", to: "/company-credits" },
      { adminOnly: true, description: "Admin-only platform event log", icon: ScrollText, label: "Audit logs", to: "/audit-logs" },
      { adminOnly: true, description: "Release gates and provider status", icon: ShieldCheck, label: "Release readiness", to: "/release-readiness" },
    ],
    label: "Company",
    quickAction: { adminOnly: true, description: "Invite and manage users", icon: Plus, label: "Manage team", to: "/team" },
    shortLabel: "Co.",
  },
];

const companyDriverSectionIds = new Set(["planning", "posts", "company"]);

const languageFlags: Record<string, string> = {
  al: "AL",
  bg: "BG",
  en: "EN",
  mk: "MK",
  sr: "SR",
};

function canSeeItem(item: { adminOnly?: boolean; allowedRoles?: UserRole[] }, role: UserRole | undefined, isAdmin: boolean) {
  if (item.adminOnly && !isAdmin) return false;
  if (item.allowedRoles?.length) return Boolean(role && item.allowedRoles.includes(role));
  return true;
}

function canSeeSection(section: NavSection, role: UserRole | undefined, isAdmin: boolean) {
  if (role === "COMPANY_DRIVER" && !companyDriverSectionIds.has(section.id)) return false;
  return canSeeItem(section, role, isAdmin);
}

function isRouteActive(pathname: string, to: string) {
  if (to === "/fleet") return pathname === "/fleet";
  if (to === "/posts") return pathname === "/posts";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function sectionForPath(pathname: string, sections: NavSection[]) {
  return sections.find((section) => section.items.some((item) => isRouteActive(pathname, item.to))) ?? sections[0];
}

function sectionItems(section: NavSection, role: UserRole | undefined, isAdmin: boolean) {
  const items = section.items.filter((item) => canSeeItem(item, role, isAdmin));
  if (role === "COMPANY_DRIVER" && section.id === "posts") {
    return items
      .filter((item) => item.to === "/posts/mine")
      .map((item) => ({ ...item, description: "Company transport posts assigned to your workspace", label: "Company posts" }));
  }
  if (role === "COMPANY_DRIVER" && section.id === "company") {
    return items.filter((item) => item.to === "/company");
  }
  return items;
}

function sectionDefaultTo(section: NavSection, role: UserRole | undefined) {
  if (role === "COMPANY_DRIVER" && section.id === "posts") return "/posts/mine";
  return section.defaultTo;
}

export function AppShell() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const setUser = useAuthStore((state) => state.setUser);
  const activeNavSectionId = useUiStore((state) => state.activeNavSectionId);
  const closeSecondaryPanel = useUiStore((state) => state.closeSecondaryPanel);
  const secondaryPanelOpen = useUiStore((state) => state.secondaryPanelOpen);
  const setActiveNavSection = useUiStore((state) => state.setActiveNavSection);
  const toggleSecondaryPanel = useUiStore((state) => state.toggleSecondaryPanel);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [panelSearch, setPanelSearch] = useState("");
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const hoverCloseTimeout = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const isAdmin = user?.role === "COMPANY_ADMIN";
  const visibleSections = useMemo(() => navSections.filter((section) => canSeeSection(section, user?.role, isAdmin)), [isAdmin, user?.role]);
  const activeSection = visibleSections.find((section) => section.id === activeNavSectionId) ?? sectionForPath(location.pathname, visibleSections);
  const hoveredSection = hoveredSectionId ? visibleSections.find((section) => section.id === hoveredSectionId) : null;
  const displayedSection = secondaryPanelOpen ? activeSection : hoveredSection;
  const languagesQuery = useQuery({ queryFn: listSupportedLanguages, queryKey: ["localization", "languages"], staleTime: 1000 * 60 * 30 });
  const notificationsQuery = useQuery({
    queryFn: () => listNotifications({ pageSize: 5 }),
    queryKey: ["notifications", "shell", "latest"],
    staleTime: 1000 * 30,
  });
  const companyWalletQuery = useQuery({
    enabled: Boolean(user?.companyId && user.role !== "JOB_SEEKER"),
    queryFn: getCompanyCreditWallet,
    queryKey: ["company-credits", "wallet"],
    staleTime: 1000 * 30,
  });
  const jobWalletQuery = useQuery({
    enabled: user?.role === "JOB_SEEKER",
    queryFn: getJobSeekerWallet,
    queryKey: ["job-seeker-billing", "wallet"],
    staleTime: 1000 * 30,
  });
  const languages = languagesQuery.data?.length ? languagesQuery.data : fallbackLanguages;
  const latestNotifications = notificationsQuery.data ?? [];
  const unreadCount = latestNotifications.filter((notification) => !notification.isRead).length;
  const logoutMutation = useAppMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearUser();
      queryClient.clear();
    },
  });
  const languageMutation = useAppMutation({
    mutationFn: updateMyUser,
    onSuccess: (profile) => {
      setUser(profile);
      queryClient.setQueryData(["users", "me"], profile);
    },
  });

  useEffect(() => {
    const routeSection = sectionForPath(location.pathname, visibleSections);
    if (routeSection.id !== activeNavSectionId) setActiveNavSection(routeSection.id);
  }, [activeNavSectionId, location.pathname, setActiveNavSection, visibleSections]);

  useEffect(
    () => () => {
      if (hoverCloseTimeout.current) window.clearTimeout(hoverCloseTimeout.current);
    },
    [],
  );

  useEffect(() => {
    if (!user?.preferredLanguage || user.preferredLanguage === i18n.language) return;
    window.localStorage.setItem(languageStorageKey, user.preferredLanguage);
    void i18n.changeLanguage(user.preferredLanguage);
  }, [i18n, user?.preferredLanguage]);

  const selectLanguage = (languageCode: string) => {
    window.localStorage.setItem(languageStorageKey, languageCode);
    void i18n.changeLanguage(languageCode);
    setLanguageOpen(false);
    if (user) languageMutation.mutate({ preferredLanguage: languageCode });
  };

  const panelItems = displayedSection ? sectionItems(displayedSection, user?.role, isAdmin) : [];
  const filteredPanelItems = panelItems.filter((item) => {
    const needle = panelSearch.trim().toLowerCase();
    if (!needle) return true;
    return `${item.label} ${item.description ?? ""}`.toLowerCase().includes(needle);
  });
  const quickAction = displayedSection?.quickAction && canSeeItem(displayedSection.quickAction, user?.role, isAdmin) && !(user?.role === "COMPANY_DRIVER" && displayedSection.id === "posts") ? displayedSection.quickAction : null;
  const leftOffset = secondaryPanelOpen ? "lg:pl-[180px]" : "lg:pl-[86px]";
  const accountLink = user?.role === "JOB_SEEKER"
    ? { label: "Profile", to: "/job-profile" }
    : null;
  const walletLink = user?.role === "JOB_SEEKER"
    ? {
      balance: jobWalletQuery.data?.balanceCredits,
      isLoading: jobWalletQuery.isLoading,
      label: "Job wallet",
      to: "/job-wallet",
    }
    : user?.companyId
      ? {
        balance: companyWalletQuery.data?.balanceCredits,
        isLoading: companyWalletQuery.isLoading,
        label: "Company credits",
        to: "/company-credits",
      }
      : null;
  const walletBalanceLabel = walletLink?.isLoading ? "Loading credits" : `${walletLink?.balance ?? 0} credits`;

  const cancelHoverClose = () => {
    if (hoverCloseTimeout.current) {
      window.clearTimeout(hoverCloseTimeout.current);
      hoverCloseTimeout.current = null;
    }
  };

  const previewSection = (sectionId: string) => {
    if (secondaryPanelOpen) return;
    cancelHoverClose();
    setHoveredSectionId(sectionId);
    setPanelSearch("");
  };

  const schedulePreviewClose = () => {
    if (secondaryPanelOpen) return;
    cancelHoverClose();
    hoverCloseTimeout.current = window.setTimeout(() => setHoveredSectionId(null), 140);
  };

  const openSection = (section: NavSection) => {
    setActiveNavSection(section.id);
    setPanelSearch("");
    void navigate(sectionDefaultTo(section, user?.role));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed bottom-3 left-2 top-2 z-30 hidden w-[55px] rounded-[10px] bg-gradient-to-b from-[#6750e8] via-[#4e34b8] to-[#2d236a] text-white shadow-[0_12px_28px_rgba(35,30,80,0.28),inset_-1px_0_rgba(255,255,255,0.12)] lg:flex lg:flex-col">
        <div className="px-2 pb-2 pt-3">
          <button
            aria-label={secondaryPanelOpen ? "Unpin sidebar" : "Pin sidebar"}
            className="grid h-8 w-full place-items-center rounded-lg text-white outline-none transition hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/50"
            onClick={() => {
              setHoveredSectionId(null);
              setPanelSearch("");
              toggleSecondaryPanel();
            }}
            type="button"
          >
            <ChevronsRight className={cn("size-5 transition-transform duration-200", secondaryPanelOpen && "rotate-180")} aria-hidden="true" />
          </button>
          <div className="mx-auto mt-2 h-px w-5 bg-white/25" />

        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-0.5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleSections.map((section) => {
            const selected = section.id === activeSection.id;
            return (
              <Tooltip key={section.id} label={section.label} side="right">
                <button
                  aria-current={selected ? "page" : undefined}
                  aria-label={`Open ${section.label}`}
                  className={cn(
                    "relative flex w-11 flex-col items-center gap-0 rounded-lg px-1  py-1.5 text-[10px] font-bold leading-[1.05] text-white/86 outline-none transition hover:bg-white/12 hover:text-white",
                    "focus-visible:ring-2 focus-visible:ring-white/50",
                    selected && " text-white hover:bg-white/16 hover:text-white",
                  )}
                  onBlur={schedulePreviewClose}
                  onClick={() => openSection(section)}
                  onFocus={() => previewSection(section.id)}
                  onMouseEnter={() => previewSection(section.id)}
                  onMouseLeave={schedulePreviewClose}
                  type="button"
                >
                  <span className={cn("grid size-6 place-items-center rounded-lg transition", selected && "bg-white text-[#4f32b7] shadow-sm")}>
                    <section.icon className="size-[16px]" aria-hidden="true" />
                  </span>
                  <span className="w-full truncate text-center text-[10px]">{section.shortLabel ?? section.label}</span>
                  {/*{panelOpenForSection ? (*/}
                  {/*  <span className="absolute -right-[12px] top-1/2 z-40 size-4 -translate-y-1/2 rotate-45 rounded-[3px] bg-[#f7f7f8] shadow-[-1px_1px_0_rgba(224,224,224,0.9)]" aria-hidden="true" />*/}
                  {/*) : null}*/}
                </button>
              </Tooltip>
            );
          })}
        </nav>
      </aside>

      {displayedSection ? (
          <AnimatePresence>
        <motion.aside
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 5 }}
            transition={{ duration: 0 }}
            exit={{ opacity: 0, x: 0, transition: { duration: 12 } }}
          className="fixed bottom-30 left-[84px] top-3 z-20 hidden w-60 rounded-xl border border-black/10 bg-[#f7f7f8] shadow-[0_14px_34px_rgba(29,29,31,0.16)] transition-all duration-200 lg:block"
          onMouseEnter={cancelHoverClose}
          onMouseLeave={schedulePreviewClose}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-xl" data-testid="secondary-nav-panel">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold tracking-normal">{displayedSection.label}</h2>
                </div>
                <div className="flex items-center">
                  <button
                      aria-label="Close sidebar"
                      className="grid size-8 place-items-center rounded-lg text-muted outline-none transition hover:bg-surface-pearl hover:text-foreground focus-visible:ring-2 focus-visible:ring-slate-300"
                      onClick={() => {
                        setHoveredSectionId(null);
                        closeSecondaryPanel();
                      }}
                      type="button"
                  >
                    <Search className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    aria-label="Close sidebar"
                    className="grid size-8 place-items-center rounded-lg text-muted outline-none transition hover:bg-surface-pearl hover:text-foreground focus-visible:ring-2 focus-visible:ring-slate-300"
                    onClick={() => {
                      setHoveredSectionId(null);
                      closeSecondaryPanel();
                    }}
                    type="button"
                  >
                    <ChevronsLeft className="size-4" aria-hidden="true" />
                  </button>
                  {/*{quickAction ? (*/}
                  {/*  <NavLink*/}
                  {/*    className="grid size-8 place-items-center rounded-lg border border-border bg-card text-foreground shadow-sm transition hover:bg-surface-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"*/}
                  {/*    to={quickAction.to}*/}
                  {/*    onClick={() => {*/}
                  {/*      setHoveredSectionId(null);*/}
                  {/*      setPanelSearch("");*/}
                  {/*    }}*/}
                  {/*  >*/}
                  {/*    <Plus className="size-4" aria-hidden="true" />*/}
                  {/*  </NavLink>*/}
                  {/*) : null}*/}
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input
                  aria-label="Search sidebar"
                  className="h-9 rounded-lg pl-9 pr-9 text-sm"
                  onChange={(event) => setPanelSearch(event.target.value)}
                  placeholder="Search sidebar..."
                  value={panelSearch}
                />
                {panelSearch ? (
                  <button
                    aria-label="Clear sidebar search"
                    className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-surface-pearl text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-slate-300"
                    onClick={() => setPanelSearch("")}
                    type="button"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {quickAction ? (
                <NavLink
                  className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-surface-pearl px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  to={quickAction.to}
                  onClick={() => {
                    setHoveredSectionId(null);
                    setPanelSearch("");
                  }}
                >
                  <quickAction.icon className="size-4 text-primary" aria-hidden="true" />
                  <span>{quickAction.label}</span>
                </NavLink>
              ) : null}
              {filteredPanelItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-surface-pearl p-4 text-sm text-muted">No matching shortcuts</div>
              ) : (
                <div className="space-y-1">
                  {filteredPanelItems.map((item) => (
                    <NavLink
                      className={({ isActive }) =>
                        cn(
                          "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-surface-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
                          isActive && "bg-primary text-primary-foreground hover:bg-primary",
                        )
                      }
                      end={item.to === "/fleet" || item.to === "/posts"}
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        setHoveredSectionId(null);
                        setPanelSearch("");
                      }}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn("mt-0.5 size-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted")} aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block font-semibold">{item.label}</span>
                            {item.description ? <span className={cn("mt-0.5 block text-xs", isActive ? "text-primary-foreground/78" : "text-muted")}>{item.description}</span> : null}
                          </span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.aside>
          </AnimatePresence>
      ) : null}

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation overlay" className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} type="button" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(360px,88vw)] flex-col border-r border-border bg-card shadow-xl" data-testid="mobile-nav-drawer">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">CA</div>
                <div>
                  <p className="text-sm font-semibold">Cargo Agent</p>
                  <p className="text-xs text-muted">{t("app.subtitle")}</p>
                </div>
              </div>
              <button
                aria-label="Close navigation"
                className="grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                onClick={() => setMobileNavOpen(false)}
                type="button"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 space-y-5 overflow-y-auto p-4">
              {visibleSections.map((section) => {
                const items = sectionItems(section, user?.role, isAdmin);
                if (items.length === 0) return null;
                return (
                  <div key={section.id}>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted">
                      <section.icon className="size-4" aria-hidden="true" />
                      {section.label}
                    </p>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <NavLink
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-surface-pearl",
                              isActive && "bg-primary text-primary-foreground hover:bg-primary",
                            )
                          }
                          key={item.to}
                          onClick={() => {
                            setActiveNavSection(section.id);
                            setMobileNavOpen(false);
                          }}
                          to={item.to}
                        >
                          <item.icon className="size-4" aria-hidden="true" />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}

      <div className={cn("transition-[padding] duration-200", leftOffset)}>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between  bg-background/80 px-4 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              className="grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              type="button"
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {walletLink ? (
              <Tooltip label={`${walletLink.label}: ${walletBalanceLabel}`}>
                <NavLink
                  aria-label={`${walletLink.label}: ${walletBalanceLabel}`}
                  className="flex h-9 min-w-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm outline-none transition hover:border-slate-300 hover:bg-surface-pearl focus-visible:ring-2 focus-visible:ring-slate-300"
                  to={walletLink.to}
                >
                  <WalletCards className="size-[15px] text-primary" aria-hidden="true" />
                  <span className="hidden sm:inline">{walletBalanceLabel}</span>
                  <span className="sm:hidden">{walletLink.isLoading ? "..." : walletLink.balance ?? 0}</span>
                </NavLink>
              </Tooltip>
            ) : null}
            <div className="relative">
              <button
                aria-expanded={languageOpen}
                aria-label={t("actions.changeLanguage")}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold shadow-sm outline-none hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-300"
                onBlur={() => window.setTimeout(() => setLanguageOpen(false), 120)}
                onClick={() => setLanguageOpen((current) => !current)}
                type="button"
              >
                <span>{languageFlags[i18n.language] ?? languageFlags.en}</span>
              </button>
              {languageOpen ? (
                <div className="absolute right-0 top-10 z-40 w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
                  {languages.map((language) => (
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold hover:bg-surface-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      key={language.code}
                      onClick={() => selectLanguage(language.code)}
                      type="button"
                    >
                      <span>{languageFlags[language.code] ?? language.code.toUpperCase()}</span>
                      <span>{language.nativeName || language.label || language.code.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="group relative">
              <NavLink
                aria-label={t("nav.notifications")}
                className="relative grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                to="/notifications"
              >
                <Bell className="size-[15px]" aria-hidden="true" />
                {unreadCount ? <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger" /> : null}
              </NavLink>
              <div className="pointer-events-none absolute right-0 top-11 z-30 hidden w-72 rounded-xl border border-border bg-card p-3 text-left shadow-lg group-hover:block group-focus-within:block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase text-muted">Latest notifications</p>
                  <span className="text-xs text-muted">{unreadCount} unread</span>
                </div>
                {latestNotifications.length === 0 ? (
                  <p className="rounded-lg bg-surface-pearl px-3 py-2 text-sm text-muted">No notifications yet.</p>
                ) : (
                  <div className="space-y-2">
                    {latestNotifications.slice(0, 4).map((notification) => (
                      <div className="rounded-lg bg-surface-pearl px-3 py-2" key={notification.id}>
                        <p className="truncate text-sm font-semibold text-foreground">{notification.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{notification.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <button
                aria-expanded={accountMenuOpen}
                aria-label="Open account menu"
                className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-left shadow-sm outline-none transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-300"
                onBlur={() => window.setTimeout(() => setAccountMenuOpen(false), 120)}
                onClick={() => setAccountMenuOpen((current) => !current)}
                type="button"
              >
                <span className="grid size-6 place-items-center rounded-md bg-surface-pearl text-xs font-semibold text-primary">
                  {user?.firstName?.[0] ?? "C"}{user?.lastName?.[0] ?? "A"}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-xs font-semibold text-foreground">{user ? `${user.firstName} ${user.lastName}` : "Cargo Agent"}</span>
                  {/*<span className="block truncate text-[11px] text-muted">{user?.role?.replace("_", " ")}</span>*/}
                </span>
                <Settings className="size-4 text-muted" aria-hidden="true" />
              </button>
              {accountMenuOpen ? (
                <div className="absolute right-0 top-10 z-40 w-56 rounded-lg border border-border bg-card p-1 shadow-lg">
                  <div className="border-b border-border px-2.5 py-2">
                    <p className="truncate text-sm font-semibold text-foreground">{user ? `${user.firstName} ${user.lastName}` : "Cargo Agent"}</p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                  </div>
                  {accountLink ? (
                    <NavLink
                      className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold hover:bg-surface-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      onClick={() => setAccountMenuOpen(false)}
                      to={accountLink.to}
                    >
                      <UserRound className="size-4 text-muted" aria-hidden="true" />
                      {accountLink.label}
                    </NavLink>
                  ) : null}
                  <NavLink
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold hover:bg-surface-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    onClick={() => setAccountMenuOpen(false)}
                    to="/account/password"
                  >
                    <Settings className="size-4 text-muted" aria-hidden="true" />
                    Change password
                  </NavLink>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-danger hover:bg-surface-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    disabled={logoutMutation.isPending}
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logoutMutation.mutate();
                    }}
                    type="button"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-1 sm:px-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
