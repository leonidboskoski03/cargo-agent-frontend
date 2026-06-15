import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { FleetAssignmentsPage } from "./FleetAssignmentsPage";
import { FleetLicensesPage } from "./FleetLicensesPage";
import { FleetVehiclesPage } from "./FleetVehiclesPage";

const assignmentApi = vi.hoisted(() => ({
  createVehicleAssignment: vi.fn(),
  deleteVehicleAssignment: vi.fn(),
  listVehicleAssignments: vi.fn(),
  restoreVehicleAssignment: vi.fn(),
  updateVehicleAssignment: vi.fn(),
}));

const documentApi = vi.hoisted(() => ({
  uploadDocument: vi.fn(),
}));

const licenseApi = vi.hoisted(() => ({
  createLicense: vi.fn(),
  deleteLicense: vi.fn(),
  listLicenses: vi.fn(),
  listLicenseTypes: vi.fn(),
  restoreLicense: vi.fn(),
  updateLicense: vi.fn(),
}));

const userApi = vi.hoisted(() => ({
  listUsers: vi.fn(),
}));

const vehicleApi = vi.hoisted(() => ({
  createVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
  listVehicles: vi.fn(),
  restoreVehicle: vi.fn(),
  updateVehicle: vi.fn(),
}));

vi.mock("@/shared/api/modules/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/documents")>()),
  uploadDocument: documentApi.uploadDocument,
}));

vi.mock("@/shared/api/modules/licenses", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/licenses")>()),
  createLicense: licenseApi.createLicense,
  deleteLicense: licenseApi.deleteLicense,
  listLicenses: licenseApi.listLicenses,
  listLicenseTypes: licenseApi.listLicenseTypes,
  restoreLicense: licenseApi.restoreLicense,
  updateLicense: licenseApi.updateLicense,
}));

vi.mock("@/shared/api/modules/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/users")>()),
  listUsers: userApi.listUsers,
}));

vi.mock("@/shared/api/modules/vehicleAssignments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicleAssignments")>()),
  createVehicleAssignment: assignmentApi.createVehicleAssignment,
  deleteVehicleAssignment: assignmentApi.deleteVehicleAssignment,
  listVehicleAssignments: assignmentApi.listVehicleAssignments,
  restoreVehicleAssignment: assignmentApi.restoreVehicleAssignment,
  updateVehicleAssignment: assignmentApi.updateVehicleAssignment,
}));

vi.mock("@/shared/api/modules/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicles")>()),
  createVehicle: vehicleApi.createVehicle,
  deleteVehicle: vehicleApi.deleteVehicle,
  listVehicles: vehicleApi.listVehicles,
  restoreVehicle: vehicleApi.restoreVehicle,
  updateVehicle: vehicleApi.updateVehicle,
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

const vehicleActive = {
  countryOfRegistration: "MK",
  createdAt: "",
  deletedAt: null,
  id: "vehicle_active",
  isActive: true,
  plateNumber: "SK-100-AA",
  updatedAt: "",
  vehicleType: "TRUCK",
};

function renderWithQuery(ui: ReactElement = <FleetVehiclesPage />) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("fleet pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vehicleApi.listVehicles.mockResolvedValue([]);
    vehicleApi.restoreVehicle.mockResolvedValue({});
    userApi.listUsers.mockResolvedValue([adminUser, driverUser]);
    assignmentApi.listVehicleAssignments.mockResolvedValue([]);
    assignmentApi.restoreVehicleAssignment.mockResolvedValue({});
    licenseApi.listLicenses.mockResolvedValue([]);
    licenseApi.listLicenseTypes.mockResolvedValue([
      { code: "C", label: "Category C" },
      { code: "D", label: "Category D" },
    ]);
    licenseApi.createLicense.mockResolvedValue({});
    licenseApi.restoreLicense.mockResolvedValue({});
  });

  it("shows vehicle mutation controls to admins", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    renderWithQuery();

    expect(await screen.findByRole("heading", { name: "Add vehicle" })).toBeInTheDocument();
    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Specs")).toBeInTheDocument();
    expect(screen.getByText("Media and documents")).toBeInTheDocument();
    expect(screen.queryByLabelText(/truck image url/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/document urls/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle photo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle documents/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add vehicle/i })).toBeInTheDocument();
  });

  it("keeps drivers in read-only vehicle mode", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderWithQuery();

    expect(await screen.findByRole("heading", { name: "Read-only vehicle view" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add vehicle/i })).not.toBeInTheDocument();
  });

  it("shows deleted fleet vehicles in a dedicated admin view and restores them", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    vehicleApi.listVehicles.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [{
          countryOfRegistration: "MK",
          createdAt: "",
          deletedAt: "2026-06-12T00:00:00.000Z",
          id: "vehicle_deleted",
          isActive: false,
          plateNumber: "SK-999-DE",
          updatedAt: "",
          vehicleType: "TRUCK",
        }]
        : [{
          countryOfRegistration: "MK",
          createdAt: "",
          deletedAt: null,
          id: "vehicle_active",
          isActive: true,
          plateNumber: "SK-100-AA",
          updatedAt: "",
          vehicleType: "TRUCK",
        }],
    ));

    renderWithQuery();

    expect((await screen.findAllByText(/SK-100-AA/)).length).toBeGreaterThan(0);
    expect(vehicleApi.listVehicles).toHaveBeenCalledWith({ deleted: "active" });

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText(/SK-999-DE/)).toBeInTheDocument();
    expect(vehicleApi.listVehicles).toHaveBeenCalledWith({ deleted: "only" });
    await userEvent.click(screen.getByRole("button", { name: /restore sk-999-de/i }));

    expect(vehicleApi.restoreVehicle).toHaveBeenCalledWith("vehicle_deleted", expect.anything());
  });

  it("shows deleted assignments in a dedicated admin view and restores them", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    vehicleApi.listVehicles.mockResolvedValue([vehicleActive]);
    assignmentApi.listVehicleAssignments.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [{
          createdAt: "",
          deletedAt: "2026-06-12T00:00:00.000Z",
          driverUserId: driverUser.id,
          endsAt: null,
          id: "assignment_deleted",
          startsAt: "2026-06-13T08:00:00.000Z",
          updatedAt: "",
          vehicleId: vehicleActive.id,
        }]
        : [{
          createdAt: "",
          deletedAt: null,
          driverUserId: driverUser.id,
          endsAt: null,
          id: "assignment_active",
          startsAt: "2026-06-13T08:00:00.000Z",
          updatedAt: "",
          vehicleId: vehicleActive.id,
        }],
    ));

    renderWithQuery(<FleetAssignmentsPage />);

    expect((await screen.findAllByText(/SK-100-AA/)).length).toBeGreaterThan(0);
    expect(assignmentApi.listVehicleAssignments).toHaveBeenCalledWith({ deleted: "active" });

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("DELETED")).toBeInTheDocument();
    expect(assignmentApi.listVehicleAssignments).toHaveBeenCalledWith({ deleted: "only" });
    await userEvent.click(screen.getByRole("button", { name: /restore assignment/i }));

    expect(assignmentApi.restoreVehicleAssignment).toHaveBeenCalledWith("assignment_deleted", expect.anything());
  });

  it("shows deleted licenses in a dedicated admin view and restores them", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    licenseApi.listLicenses.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [{
          createdAt: "",
          deletedAt: "2026-06-12T00:00:00.000Z",
          expiresAt: "2028-01-01T00:00:00.000Z",
          id: "license_deleted",
          isValid: true,
          issuedAt: "2025-01-01T00:00:00.000Z",
          licenseType: "D",
          updatedAt: "",
          userId: driverUser.id,
        }]
        : [{
          createdAt: "",
          deletedAt: null,
          expiresAt: "2028-01-01T00:00:00.000Z",
          id: "license_active",
          isValid: true,
          issuedAt: "2025-01-01T00:00:00.000Z",
          licenseType: "C",
          updatedAt: "",
          userId: driverUser.id,
        }],
    ));

    renderWithQuery(<FleetLicensesPage />);

    expect(await screen.findByText("C")).toBeInTheDocument();
    expect(licenseApi.listLicenses).toHaveBeenCalledWith({ deleted: "active" });

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("D")).toBeInTheDocument();
    expect(licenseApi.listLicenses).toHaveBeenCalledWith({ deleted: "only" });
    await userEvent.click(screen.getByRole("button", { name: /restore d/i }));

    expect(licenseApi.restoreLicense).toHaveBeenCalledWith("license_deleted", expect.anything());
  });

  it("lets company drivers attach their own license for admin review", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderWithQuery(<FleetLicensesPage />);

    expect(await screen.findByRole("heading", { name: "Attach my license" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^user$/i)).not.toBeInTheDocument();
    expect(userApi.listUsers).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText(/license type/i), "C");
    await userEvent.click(screen.getByRole("button", { name: /attach license/i }));

    await waitFor(() => {
      expect(licenseApi.createLicense).toHaveBeenCalledWith(
        expect.objectContaining({ licenseType: "C", userId: driverUser.id }),
        expect.anything(),
      );
    });
  });
});
