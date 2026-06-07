import { UploadCloud } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toApiClientError } from "@/shared/api/apiClient";
import { cn } from "@/shared/lib/cn";

type FileUploadControlProps = {
  accept?: string;
  disabled?: boolean;
  error?: unknown;
  isUploading?: boolean;
  onFileSelect: (file: File) => void;
  previewAlt?: string;
  previewUrl?: string;
  value?: string;
};

export function FileUploadControl({ accept, disabled, error, isUploading, onFileSelect, previewAlt = "Uploaded file preview", previewUrl, value }: FileUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const apiError = error ? toApiClientError(error) : null;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileSelect(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-2.5 shadow-sm">
        <button
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-2 rounded-md bg-surface-pearl px-3 text-xs font-semibold text-foreground outline-none transition hover:bg-border/70",
            "focus-visible:ring-2 focus-visible:ring-slate-300",
          )}
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <UploadCloud className="size-4" aria-hidden="true" />
          {isUploading ? "Uploading" : "Upload"}
        </button>
        <p className="min-w-0 flex-1 truncate text-sm text-muted">{fileName || value || "No file selected"}</p>
      </div>
      <input aria-label="Select file to upload" accept={accept} className="sr-only" disabled={disabled || isUploading} onChange={handleChange} ref={inputRef} type="file" />
      {apiError ? (
        <p className="text-xs font-semibold text-danger">
          {apiError.traceId ? `Trace ID: ${apiError.traceId}` : apiError.message}
        </p>
      ) : null}
      {previewUrl ? <img alt={previewAlt} className="h-16 w-16 rounded-lg border border-border object-cover" src={previewUrl} /> : null}
    </div>
  );
}
