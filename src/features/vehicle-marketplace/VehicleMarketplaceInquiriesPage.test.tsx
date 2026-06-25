import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { VehicleMarketplaceInquiriesPage } from "./VehicleMarketplaceInquiriesPage";

const vehicleMarketplaceApi = vi.hoisted(() => ({
  createVehicleMarketplaceInquiryReply: vi.fn(),
  listVehicleMarketplaceInquiries: vi.fn(),
  listVehicleMarketplaceInquiryReplies: vi.fn(),
  updateVehicleMarketplaceInquiry: vi.fn(),
}));

vi.mock("@/shared/api/modules/vehicleMarketplace", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicleMarketplace")>()),
  createVehicleMarketplaceInquiryReply: vehicleMarketplaceApi.createVehicleMarketplaceInquiryReply,
  listVehicleMarketplaceInquiries: vehicleMarketplaceApi.listVehicleMarketplaceInquiries,
  listVehicleMarketplaceInquiryReplies: vehicleMarketplaceApi.listVehicleMarketplaceInquiryReplies,
  updateVehicleMarketplaceInquiry: vehicleMarketplaceApi.updateVehicleMarketplaceInquiry,
}));

const adminUser = {
  companyId: "company_1",
  email: "admin@test.local",
  firstName: "Admin",
  id: "user_admin",
  isActive: true,
  lastName: "User",
  role: "COMPANY_ADMIN" as const,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <VehicleMarketplaceInquiriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("VehicleMarketplaceInquiriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    vehicleMarketplaceApi.createVehicleMarketplaceInquiryReply.mockResolvedValue({
      authorCompanyId: "company_1",
      authorUserId: "user_admin",
      createdAt: "2026-06-14T10:10:00.000Z",
      id: "reply_created",
      inquiryId: "inquiry_received",
      message: "Yes, it is available.",
      updatedAt: "2026-06-14T10:10:00.000Z",
    });
    vehicleMarketplaceApi.listVehicleMarketplaceInquiryReplies.mockResolvedValue([]);
    vehicleMarketplaceApi.listVehicleMarketplaceInquiries.mockResolvedValue([
      {
        contactName: "Buyer One",
        createdAt: "2026-06-14T10:00:00.000Z",
        id: "inquiry_received",
        listing: {
          city: "Skopje",
          countryCode: "MK",
          id: "listing_owned",
          intent: "RENTAL",
          ownerCompanyId: "company_1",
          ownerUserId: null,
          status: "PUBLISHED",
          title: "Owned rental truck",
          vehicleType: "TRUCK",
        },
        listingId: "listing_owned",
        message: "Can we inspect this truck today?",
        senderCompany: { id: "company_2", name: "Buyer Logistics" },
        senderCompanyId: "company_2",
        senderUserId: "buyer_user",
        status: "OPEN",
        updatedAt: "2026-06-14T10:00:00.000Z",
      },
      {
        contactName: "Admin User",
        createdAt: "2026-06-13T10:00:00.000Z",
        id: "inquiry_sent",
        listing: {
          city: "Sofia",
          countryCode: "BG",
          id: "listing_external",
          intent: "SALE",
          ownerCompanyId: "company_3",
          ownerUserId: null,
          status: "PUBLISHED",
          title: "External trailer",
          vehicleType: "TRAILER",
        },
        listingId: "listing_external",
        message: "Is the trailer still available?",
        senderCompany: { id: "company_1", name: "Cargo Co" },
        senderCompanyId: "company_1",
        senderUserId: "user_admin",
        status: "RESPONDED",
        updatedAt: "2026-06-13T10:00:00.000Z",
      },
    ]);
  });

  it("filters inquiries from the shared popover and clears active filters", async () => {
    renderPage();

    expect(await screen.findByText("Owned rental truck")).toBeInTheDocument();
    expect(screen.getByText("External trailer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Direction")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^filters$/i }));
    const dialog = await screen.findByRole("dialog", { name: /inquiry filters/i });
    await userEvent.selectOptions(within(dialog).getByLabelText("Direction"), "RECEIVED");
    await userEvent.selectOptions(within(dialog).getByLabelText("Status"), "OPEN");
    await userEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    await waitFor(() => {
      expect(vehicleMarketplaceApi.listVehicleMarketplaceInquiries).toHaveBeenLastCalledWith({ status: "OPEN" });
    });
    expect(await screen.findByText("Owned rental truck")).toBeInTheDocument();
    expect(screen.queryByText("External trailer")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^filters \(2\)$/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^clear$/i }));

    await waitFor(() => {
      expect(vehicleMarketplaceApi.listVehicleMarketplaceInquiries).toHaveBeenLastCalledWith({ status: undefined });
    });
  });

  it("sends a reply from an inquiry card", async () => {
    renderPage();

    const composer = await screen.findAllByLabelText("Inquiry replies message");
    await userEvent.type(composer[0], "Yes, it is available.");
    await userEvent.click(screen.getAllByRole("button", { name: /^send$/i })[0]);

    expect(vehicleMarketplaceApi.createVehicleMarketplaceInquiryReply).toHaveBeenCalledWith("inquiry_received", {
      message: "Yes, it is available.",
    });
  });
});
