import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/shared/api/apiClient";
import { FileUploadControl } from "./FileUploadControl";

describe("FileUploadControl", () => {
  it("uses a compact upload button instead of exposing the native file input", async () => {
    const onFileSelect = vi.fn();
    render(<FileUploadControl accept="image/png" onFileSelect={onFileSelect} />);

    const file = new File(["image"], "truck.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Select file to upload"), file);

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(screen.getByText("truck.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
  });

  it("shows trace IDs from upload failures", () => {
    render(
      <FileUploadControl
        error={new ApiClientError({ code: "STORAGE_PROVIDER_ERROR", message: "Upload failed", traceId: "trace_123" })}
        onFileSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Trace ID: trace_123")).toBeInTheDocument();
  });
});
