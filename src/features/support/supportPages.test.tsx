import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  uploadDocument: vi.fn(),
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
  uploadDocument: documentsApi.uploadDocument,
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
    documentsApi.restoreDocument.mockResolvedValue({});
    documentsApi.uploadDocument.mockResolvedValue({ createdAt: "2026-06-13T00:00:00.000Z", id: "document_uploaded", name: "Uploaded document", type: "OTHER" });
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
    expect(await screen.findByRole("button", { name: /upload document/i })).toBeInTheDocument();

    cleanup();
    useAuthStore.setState({ status: "authenticated", user: driverUser });
    renderWithProviders(<DocumentsPage />);
    expect(await screen.findByText(/read-only document view/i)).toBeInTheDocument();
  });

  it("lets company admins upload a document into the registry", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    renderWithProviders(<DocumentsPage />);

    await screen.findByRole("button", { name: /upload document/i });
    await userEvent.upload(
      screen.getByLabelText(/select file to upload/i),
      new File(["license"], "license.pdf", { type: "application/pdf" }),
    );
    await userEvent.type(screen.getByLabelText(/name/i), "Operating license");
    await userEvent.click(screen.getByRole("button", { name: /upload document/i }));

    expect(documentsApi.uploadDocument).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "license.pdf",
      kind: "OTHER",
      mimeType: "application/pdf",
      name: "Operating license",
    }));
    expect(String(documentsApi.uploadDocument.mock.calls[0][0].contentBase64)).toMatch(/^data:application\/pdf;base64,/);
  });

  it("shows deleted documents in a dedicated admin view and restores them", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    documentsApi.listDocuments.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [{
          createdAt: "2026-06-13T00:00:00.000Z",
          deletedAt: "2026-06-13T00:10:00.000Z",
          id: "document_deleted",
          name: "Deleted insurance",
          type: "INSURANCE",
        }]
        : [{
          createdAt: "2026-06-13T00:00:00.000Z",
          deletedAt: null,
          id: "document_active",
          name: "Active license",
          type: "COMPANY_LICENSE",
        }],
    ));

    renderWithProviders(<DocumentsPage />);

    expect(await screen.findByText("Active license")).toBeInTheDocument();
    expect(documentsApi.listDocuments).toHaveBeenCalledWith(expect.objectContaining({ deleted: "active" }));

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("Deleted insurance")).toBeInTheDocument();
    expect(screen.queryByText("Active license")).not.toBeInTheDocument();
    expect(documentsApi.listDocuments).toHaveBeenCalledWith(expect.objectContaining({ deleted: "only" }));
    await userEvent.click(screen.getByRole("button", { name: /restore/i }));

    expect(documentsApi.restoreDocument).toHaveBeenCalledWith("document_deleted", expect.anything());
  });

  it("renders document records with business labels and no technical table columns", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    documentsApi.listDocuments.mockResolvedValue([
      {
        createdAt: "2026-06-13T00:00:00.000Z",
        deletedAt: null,
        id: "document_active",
        metadataJson: { internal: "keep-hidden" },
        mimeType: "application/pdf",
        name: "Carrier operating license",
        ownerCompanyId: "company_123",
        type: "COMPANY_LICENSE",
        url: "https://example.com/license.pdf",
      },
    ]);

    renderWithProviders(<DocumentsPage />);

    expect(await screen.findByText("Carrier operating license")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Company License")).toBeInTheDocument();
    expect(within(table).queryByText("COMPANY_LICENSE")).not.toBeInTheDocument();
    expect(within(table).queryByText("application/pdf")).not.toBeInTheDocument();
    expect(within(table).queryByText("https://example.com/license.pdf")).not.toBeInTheDocument();
    expect(within(table).queryByText("company_123")).not.toBeInTheDocument();
    expect(within(table).queryByText("keep-hidden")).not.toBeInTheDocument();
  });

  it("keeps audit logs admin-only", () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderWithProviders(<AuditLogsPage />);

    expect(screen.getByRole("heading", { name: /admin access required/i })).toBeInTheDocument();
  });
});
