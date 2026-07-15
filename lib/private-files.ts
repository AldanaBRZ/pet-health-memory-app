import type { PrivateFileAttachment } from "./types";
import { supabase } from "./supabase-client";

export const PRIVATE_FILE_BUCKET = "pet-health-files";
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const LOCAL_DB_NAME = "pet-health-private-files";
const LOCAL_DB_VERSION = 1;
const LOCAL_STORE_NAME = "files";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const DOCUMENT_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, "application/pdf"]);
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif"
};

type FileKind = "profile" | "document" | "symptom";

function attachmentId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extensionFor(file: File) {
  return file.name.split(".").pop()?.trim().toLowerCase() ?? "";
}

function normalizedMimeType(file: File) {
  return file.type.trim().toLowerCase() || MIME_BY_EXTENSION[extensionFor(file)] || "";
}

export function validatePrivateFile(file: File, kind: FileKind) {
  const mimeType = normalizedMimeType(file);
  const allowedTypes = kind === "document" ? DOCUMENT_MIME_TYPES : IMAGE_MIME_TYPES;
  const maxBytes = kind === "profile" ? MAX_PROFILE_PHOTO_BYTES : MAX_DOCUMENT_BYTES;

  if (!allowedTypes.has(mimeType)) {
    return kind === "document"
      ? "Choose a PDF, JPG, PNG, WebP, HEIC, or HEIF file."
      : kind === "profile"
      ? "Choose a JPG, PNG, WebP, HEIC, or HEIF image."
      : "Choose a JPG, PNG, WebP, HEIC, or HEIF symptom photo.";
  }
  if (file.size <= 0) return "That file is empty.";
  if (file.size > maxBytes) {
    const label = kind === "profile" ? "Profile photos" : kind === "symptom" ? "Symptom photos" : "Documents";
    return `${label} must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`;
  }
  return null;
}

function openLocalDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Private file storage is not available in this browser."));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LOCAL_STORE_NAME)) {
        database.createObjectStore(LOCAL_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open private file storage."));
  });
}

async function runLocalRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openLocalDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(LOCAL_STORE_NAME, mode);
    const request = operation(transaction.objectStore(LOCAL_STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Private file storage failed."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("Private file storage failed."));
  });
}

async function saveLocalFile(storagePath: string, file: File) {
  await runLocalRequest("readwrite", (store) => store.put(file, storagePath));
}

async function loadLocalFile(storagePath: string) {
  const result = await runLocalRequest<Blob | undefined>("readonly", (store) => store.get(storagePath));
  if (!result) throw new Error("This file is no longer available on this device.");
  return result;
}

async function deleteLocalFile(storagePath: string) {
  await runLocalRequest("readwrite", (store) => store.delete(storagePath));
}

export async function clearLocalPrivateFiles() {
  if (typeof indexedDB === "undefined") return;
  await runLocalRequest("readwrite", (store) => store.clear());
}

export async function storePrivateFile({
  file,
  kind,
  petId,
  userId
}: {
  file: File;
  kind: FileKind;
  petId: string;
  userId?: string;
}): Promise<PrivateFileAttachment> {
  const validationError = validatePrivateFile(file, kind);
  if (validationError) throw new Error(validationError);

  const id = attachmentId();
  const mimeType = normalizedMimeType(file);
  const extension = extensionFor(file) || Object.entries(MIME_BY_EXTENSION).find(([, value]) => value === mimeType)?.[0] || "file";
  const uploadedAt = new Date().toISOString();

  if (supabase && userId) {
    const storagePath = `${userId}/${petId}/${kind}/${id}.${extension}`;
    const { error } = await supabase.storage.from(PRIVATE_FILE_BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      contentType: mimeType,
      upsert: false
    });
    if (error) {
      const setupHint = /bucket|not found|row-level security|policy/i.test(error.message)
        ? " Private file storage may need the latest supabase/schema.sql setup."
        : "";
      throw new Error(`${error.message}.${setupHint}`.replace("..", "."));
    }
    return { id, fileName: file.name, mimeType, size: file.size, storage: "supabase", storagePath, uploadedAt };
  }

  const storagePath = `${petId}/${kind}/${id}`;
  await saveLocalFile(storagePath, file);
  return { id, fileName: file.name, mimeType, size: file.size, storage: "local", storagePath, uploadedAt };
}

export async function loadPrivateFile(attachment: PrivateFileAttachment) {
  if (attachment.storage === "local") return loadLocalFile(attachment.storagePath);
  if (!supabase) throw new Error("Sign in to open this synced file.");

  const { data, error } = await supabase.storage.from(PRIVATE_FILE_BUCKET).download(attachment.storagePath);
  if (error || !data) throw new Error(error?.message ?? "Could not download this file.");
  return data;
}

export async function deletePrivateFile(attachment: PrivateFileAttachment) {
  if (attachment.storage === "local") {
    await deleteLocalFile(attachment.storagePath);
    return;
  }
  if (!supabase) return;
  const { error } = await supabase.storage.from(PRIVATE_FILE_BUCKET).remove([attachment.storagePath]);
  if (error) throw new Error(error.message);
}

export function isPreviewableImage(attachment?: PrivateFileAttachment) {
  return Boolean(attachment && IMAGE_MIME_TYPES.has(attachment.mimeType));
}

export function formatPrivateFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
