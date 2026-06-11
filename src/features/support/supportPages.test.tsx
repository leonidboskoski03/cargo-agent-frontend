import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { AuditLogsPage } from "./AuditLogsPage";
import { DocumentsPage } from "./DocumentsPage";
import { NotificationsPage } from "./NotificationsPage";

const documentsApi = vi.hoisted(() => ({
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  listDocuments: vi.fn(),
  restoreDocument: vi.fn(),
}));
const notificationsApi = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));
const auditApi = vi.hoisted(() => ({ listAuditLogs: vi.fn() }));
const usersApi = vi.hoisted(() => ({ listUsers: vi.fn() }));

vi.mock("@/shared/api/modules/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/documents")>()),
  createDocument: documentsApi.createDocument,
  deleteDocument: documentsApi.deleteDocument,
  listDocuments: documentsApi.listDocuments,
  restoreDocument: documentsApi.restoreDocument,
}));

vi.mock("@/shared/api/modules/notifications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/notifications")>()),
  listNotifications: notificationsApi.listNotifications,
  markAllNotificationsRead: notificationsApi.markAllNotificationsRead,
  markNotificationRead: notificationsApi.markNotificationRead,
}));

vi.mock("@/shared/api/modules/auditLogs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/auditLogs")>()),
  listAuditLogs: auditApi.listAuditLogs,
}));

vi.mock("@/shared/api/modules/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/users")>()),
  listUsers: usersApi.listUsers,
}));

const adminUser = {
  companyId: "company_123",
  email: "admin@cargo.test",
  firstName: "Ada",
  id: "user_123",
  isActive: true,
  lastName: "Admin",
  role: "COMPANY_ADMIN" as const,
};

const driverUser = {
  ...adminUser,
  email: "driver@cargo.test",
  id: "user_driver",
  role: "COMPANY_DRIVER" as const,
};

function renderWithProviders(ui: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("support pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentsApi.listDocuments.mockResolvedValue([]);
    notificationsApi.listNotifications.mockResolvedValue([]);
    auditApi.listAuditLogs.mockResolvedValue([]);
    usersApi.listUsers.mockResolvedValue([]);
  });

  it("shows notification read controls", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderWithProviders(<NotificationsPage />);

    expect(await screen.findByRole("button", { name: /mark all read/i })).toBeInTheDocument();
  });

  it("links accepted-bid notifications to the created contract when present", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });
    notificationsApi.listNotifications.mockResolvedValue([
      {
        body: "Your bid has been accepted.",
        createdAt: "2026-06-09T10:00:00.000Z",
        id: "notification_1",
        isRead: false,
        payloadJson: { bidId: "bid_1", contractId: "contract_1", postId: "post_1" },
        title: "Bid accepted",
        type: "BID_ACCEPTED",
      },
    ]);

    renderWithProviders(<NotificationsPage />);

    expect(await screen.findByText("Bid accepted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open contract/i })).toHaveAttribute("href", "/contracts/contract_1");
  });

  it("shows document create controls only to admins", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    renderWithProviders(<DocumentsPage />);
    expect(await screen.findByRole("button", { name: /create document/i })).toBeInTheDocument();

    cleanup();
    useAuthStore.setState({ status: "authenticated", user: driverUser });
    renderWithProviders(<DocumentsPage />);
    expect(await screen.findByText(/read-only document view/i)).toBeInTheDocument();
  });

  it("keeps audit logs admin-only", () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderWithProviders(<AuditLogsPage />);

    expect(screen.getByRole("heading", { name: /admin access required/i })).toBeInTheDocument();
  });
});
