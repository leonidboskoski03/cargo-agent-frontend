import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type DocumentKind = "COMPANY_LICENSE" | "VEHICLE_REGISTRATION" | "INSURANCE" | "CONTRACT_ATTACHMENT" | "OTHER";

export type DocumentRecord = {
  createdAt: string;
  deletedAt?: string | null;
  id: string;
  kind?: DocumentKind;
  metadataJson?: unknown;
  mimeType?: string;
  name: string;
  type?: DocumentKind | string;
  url?: string;
};

export type DocumentsQuery = {
  deleted?: "active" | "only" | "include";
  kind?: DocumentKind;
  page?: number;
  pageSize?: number;
};

export type CreateDocumentInput = {
  kind: DocumentKind;
  metadataJson?: unknown;
  mimeType: string;
  name: string;
  ownerCompanyId?: string;
  ownerUserId?: string;
  url: string;
};

export type UploadDocumentInput = {
  contentBase64: string;
  fileName: string;
  kind: DocumentKind;
  metadataJson?: unknown;
  mimeType: string;
  name: string;
  ownerCompanyId?: string;
  ownerUserId?: string;
};

export function listDocuments(params?: DocumentsQuery) {
  return unwrapData<DocumentRecord[]>(apiClient.get("/documents", { params }));
}

export function getDocument(documentId: string) {
  return unwrapData<DocumentRecord>(apiClient.get(`/documents/${documentId}`));
}

export function createDocument(input: CreateDocumentInput) {
  return unwrapData<DocumentRecord>(apiClient.post("/documents", input));
}

export function uploadDocument(input: UploadDocumentInput) {
  return unwrapData<DocumentRecord>(apiClient.post("/documents/upload", input));
}

export function deleteDocument(documentId: string) {
  return unwrapData<DocumentRecord>(apiClient.delete(`/documents/${documentId}`));
}

export function restoreDocument(documentId: string) {
  return unwrapData<DocumentRecord>(apiClient.post(`/documents/${documentId}/restore`, {}));
}
